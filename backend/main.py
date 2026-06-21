import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models
import schemas
from auth import verify_password, hash_password, create_access_token, get_current_user
import farmers
import billing
import ledger
import reports
import backup

# Create DB Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sri Sai Lakshmi Office - Paddy Billing System API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(farmers.router)
app.include_router(billing.router)
app.include_router(ledger.router)
app.include_router(reports.router)
app.include_router(backup.router)

# Seed default users if empty
def seed_users():
    db = next(get_db())
    try:
        user_count = db.query(models.User).count()
        if user_count == 0:
            print("Seeding default users...")
            default_users = [
                models.User(username="admin", password_hash=hash_password("admin123"), role="admin", full_name="System Admin"),
                models.User(username="staff", password_hash=hash_password("staff123"), role="staff", full_name="Office Staff"),
                models.User(username="accountant", password_hash=hash_password("accountant123"), role="accountant", full_name="Mill Accountant"),
            ]
            db.bulk_save_objects(default_users)
            db.commit()
            print("Default users seeded successfully.")
    except Exception as e:
        print("Seeding error:", e)
    finally:
        db.close()

@app.on_event("startup")
def startup_event():
    seed_users()
    backup.start_scheduler()

# Authentication API
@app.post("/api/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "full_name": user.full_name
    }

# Login with JSON body (often preferred in frontend)
class LoginRequest(schemas.BaseModel):
    username: str
    password: str

@app.post("/api/auth/login-json", response_model=schemas.Token)
def login_json(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "full_name": user.full_name
    }

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.post("/api/auth/change-password")
def change_password(
    data: schemas.UserChangePassword,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password"
        )
    
    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"status": "success", "message": "Password changed successfully"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
