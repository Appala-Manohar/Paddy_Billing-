import uvicorn
import datetime
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from database import engine, Base, get_db
import models
import schemas
import auth
from auth import verify_password, hash_password, create_access_token, get_current_user
import farmers
import billing
import ledger
import reports
import backup

# Create DB Tables
Base.metadata.create_all(bind=engine)

def run_migrations():
    try:
        with engine.connect() as conn:
            res = conn.execute(text("PRAGMA table_info(users)"))
            cols = [r[1] for r in res.fetchall()]
            if "email" not in cols:
                print("Adding email column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR"))
                conn.commit()
                print("Added email column successfully.")
    except Exception as ex:
        print("Migration notice:", ex)

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
    run_migrations()
    seed_users()
    backup.start_scheduler()

# Authentication API
@app.post("/api/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    identifier = form_data.username.strip()
    user = db.query(models.User).filter(
        (models.User.username == identifier) | (func.lower(models.User.email) == identifier.lower())
    ).first()
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
        "full_name": user.full_name,
        "email": user.email
    }

# Login with JSON body (often preferred in frontend)
class LoginRequest(schemas.BaseModel):
    username: str
    password: str

@app.post("/api/auth/login-json", response_model=schemas.Token)
def login_json(data: LoginRequest, db: Session = Depends(get_db)):
    identifier = data.username.strip()
    user = db.query(models.User).filter(
        (models.User.username == identifier) | (func.lower(models.User.email) == identifier.lower())
    ).first()
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
        "full_name": user.full_name,
        "email": user.email
    }

@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register(data: schemas.UserCreate, db: Session = Depends(get_db)):
    username = data.username.strip()
    email = data.email.strip().lower()
    full_name = data.full_name.strip()

    if len(username) < 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username must be at least 3 characters long")
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a valid email address")
    if len(data.password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters long")
    if not full_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Full name is required")

    existing_user = db.query(models.User).filter(models.User.username == username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken. Please choose another."
        )
    
    existing_email = db.query(models.User).filter(func.lower(models.User.email) == email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    role = data.role if data.role in ["admin", "staff", "accountant"] else "staff"
    
    new_user = models.User(
        username=username,
        email=email,
        password_hash=hash_password(data.password),
        role=role,
        full_name=full_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/auth/forgot-password")
def forgot_password(data: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a valid email address")

    if not auth.is_smtp_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password recovery email service is not configured on the server. Please contact your system administrator to configure SMTP settings."
        )

    user = db.query(models.User).filter(func.lower(models.User.email) == email).first()
    if user:
        reset_token = auth.generate_reset_token()
        token_record = models.PasswordResetToken(
            token=reset_token,
            user_id=user.id,
            expires_at=datetime.datetime.utcnow() + datetime.timedelta(minutes=30),
            used=False
        )
        db.add(token_record)
        db.commit()

        reset_link = f"{auth.FRONTEND_URL}/reset-password?token={reset_token}"
        try:
            auth.send_reset_password_email(to_email=user.email, reset_link=reset_link, full_name=user.full_name)
        except Exception as mail_err:
            db.delete(token_record)
            db.commit()
            print("Failed to send reset email:", mail_err)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send password reset email. Please try again later."
            )

    return {
        "status": "success",
        "message": "If an account exists with that email address, password reset instructions have been sent."
    }

@app.get("/api/auth/verify-reset-token", response_model=schemas.VerifyTokenResponse)
def verify_reset_token(token: str, db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token is required")

    record = db.query(models.PasswordResetToken).filter(models.PasswordResetToken.token == token).first()
    if not record or record.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid or has already been used."
        )

    if record.expires_at < datetime.datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link has expired. Please request a new one."
        )

    return {
        "valid": True,
        "email": record.user.email,
        "username": record.user.username
    }

@app.post("/api/auth/reset-password")
def reset_password(data: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(data.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters long")

    record = db.query(models.PasswordResetToken).filter(models.PasswordResetToken.token == data.token).first()
    if not record or record.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid or has already been used."
        )

    if record.expires_at < datetime.datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link has expired. Please request a new one."
        )

    user = record.user
    user.password_hash = hash_password(data.new_password)
    record.used = True

    # Invalidate all remaining pending reset tokens for this user
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id,
        models.PasswordResetToken.used == False
    ).update({"used": True})

    db.commit()
    return {
        "status": "success",
        "message": "Password has been reset successfully. You can now log in with your new password."
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
