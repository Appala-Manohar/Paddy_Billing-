import io
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
import pandas as pd
from database import get_db
import models
import schemas
from auth import get_current_user, require_role

router = APIRouter(prefix="/api/ledger", tags=["Mill Ledger"])

@router.post("", response_model=schemas.MillLedgerResponse, status_code=status.HTTP_201_CREATED)
def create_ledger_entry(
    entry_in: schemas.MillLedgerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "accountant"]))
):
    new_entry = models.MillLedger(
        date=entry_in.date,
        amount_received=entry_in.amount_received,
        reference_number=entry_in.reference_number,
        notes=entry_in.notes
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry

@router.get("", response_model=list[schemas.MillLedgerResponse])
def get_ledger_entries(
    q: str = Query(None, description="Search by ref number or notes"),
    start_date: str = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.MillLedger)
    if q:
        query = query.filter(
            or_(
                models.MillLedger.reference_number.ilike(f"%{q}%"),
                models.MillLedger.notes.ilike(f"%{q}%")
            )
        )
    if start_date:
        sd = datetime.datetime.strptime(start_date, "%Y-%m-%d")
        query = query.filter(models.MillLedger.date >= sd)
    if end_date:
        ed = datetime.datetime.strptime(end_date, "%Y-%m-%d") + datetime.timedelta(days=1)
        query = query.filter(models.MillLedger.date < ed)

    return query.order_by(models.MillLedger.date.desc()).all()

@router.put("/{entry_id}", response_model=schemas.MillLedgerResponse)
def update_ledger_entry(
    entry_id: int,
    entry_in: schemas.MillLedgerUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "accountant"]))
):
    entry = db.query(models.MillLedger).filter(models.MillLedger.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Ledger entry not found")
        
    entry.date = entry_in.date
    entry.amount_received = entry_in.amount_received
    entry.reference_number = entry_in.reference_number
    entry.notes = entry_in.notes
    
    db.commit()
    db.refresh(entry)
    return entry

@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ledger_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    entry = db.query(models.MillLedger).filter(models.MillLedger.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Ledger entry not found")
    db.delete(entry)
    db.commit()
    return None

@router.get("/export/excel")
def export_ledger_excel(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    entries = db.query(models.MillLedger).order_by(models.MillLedger.date.desc()).all()
    
    data = []
    for entry in entries:
        data.append({
            "Transaction ID": entry.id,
            "Date": entry.date.strftime("%Y-%m-%d %H:%M"),
            "Amount Received (Rs)": entry.amount_received,
            "Reference / UTR Number": entry.reference_number,
            "Notes": entry.notes or ""
        })
        
    df = pd.DataFrame(data)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Mill Ledger', index=False)
        
        # Style sheet
        workbook = writer.book
        worksheet = writer.sheets['Mill Ledger']
        worksheet.column_dimensions['A'].width = 15
        worksheet.column_dimensions['B'].width = 20
        worksheet.column_dimensions['C'].width = 20
        worksheet.column_dimensions['D'].width = 25
        worksheet.column_dimensions['E'].width = 30
        
    output.seek(0)
    
    headers = {
        'Content-Disposition': 'attachment; filename="mill_ledger.xlsx"'
    }
    return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
