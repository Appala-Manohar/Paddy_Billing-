import os
import shutil
import datetime
import time
import threading
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db, engine, SessionLocal
import models
import schemas
from auth import require_role

router = APIRouter(prefix="/api/backup", tags=["Backup System"])

BACKUP_DIR = os.path.join(os.path.dirname(__file__), "backups")
os.makedirs(BACKUP_DIR, exist_ok=True)

DB_FILE = "paddy_office.db"

def perform_db_backup(db: Session, label="manual") -> models.Backup:
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"backup_{label}_{timestamp}.db"
    backup_path = os.path.join(BACKUP_DIR, backup_filename)

    try:
        # SQLite backup: close engine connections briefly or just copy file since it's small,
        # but the safest way is standard shutil copy if no write transaction is active,
        # or SQLite vacuum / backup api. Direct copy works well for low-write systems.
        shutil.copy2(DB_FILE, backup_path)
        file_size = os.path.getsize(backup_path)

        new_backup = models.Backup(
            backup_date=datetime.datetime.utcnow(),
            filename=backup_filename,
            file_size=file_size,
            status="success"
        )
        db.add(new_backup)
        db.commit()
        db.refresh(new_backup)
        return new_backup
    except Exception as e:
        print("Backup error:", e)
        new_backup = models.Backup(
            backup_date=datetime.datetime.utcnow(),
            filename=backup_filename if 'backup_filename' in locals() else "failed_backup.db",
            file_size=0,
            status=f"failed: {str(e)[:100]}"
        )
        db.add(new_backup)
        db.commit()
        db.refresh(new_backup)
        return new_backup

@router.post("/create", response_model=schemas.BackupResponse)
def create_manual_backup(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    backup = perform_db_backup(db, label="manual")
    if backup.status.startswith("failed"):
        raise HTTPException(status_code=500, detail=f"Backup creation failed: {backup.status}")
    return backup

@router.get("/list", response_model=list[schemas.BackupResponse])
def list_backups(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    return db.query(models.Backup).order_by(models.Backup.backup_date.desc()).all()

@router.post("/restore/{backup_id}")
def restore_backup(
    backup_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    backup = db.query(models.Backup).filter(models.Backup.id == backup_id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup record not found")

    backup_path = os.path.join(BACKUP_DIR, backup.filename)
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup file not found on disk")

    try:
        # Dispose the SQLAlchemy engine connections so database file is not locked
        engine.dispose()
        
        # Overwrite current DB with backup
        shutil.copy2(backup_path, DB_FILE)
        
        return {"status": "success", "message": f"Database successfully restored to {backup.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to restore database: {str(e)}")

@router.get("/export")
def export_database(
    current_user: models.User = Depends(require_role(["admin"]))
):
    if not os.path.exists(DB_FILE):
        raise HTTPException(status_code=404, detail="Database file not found")
    
    headers = {
        'Content-Disposition': 'attachment; filename="paddy_office_dump.db"'
    }
    return FileResponse(DB_FILE, headers=headers, media_type='application/x-sqlite3')


# Background thread loop for auto backups
def auto_backup_scheduler():
    time.sleep(30) # Let server start
    print("Automatic daily backup scheduler thread started.")
    while True:
        try:
            db = SessionLocal()
            # Check if there is already a backup for today
            today_start = datetime.datetime.combine(datetime.date.today(), datetime.time.min)
            existing_today = db.query(models.Backup).filter(
                models.Backup.backup_date >= today_start,
                models.Backup.filename.like("%auto%")
            ).first()

            if not existing_today:
                print("Running automatic daily backup...")
                perform_db_backup(db, label="auto")
            
            db.close()
        except Exception as e:
            print("Auto-backup scheduler error:", e)
        
        # Sleep for 6 hours before checking again
        time.sleep(6 * 3600)

def start_scheduler():
    t = threading.Thread(target=auto_backup_scheduler, daemon=True)
    t.start()
