import jwt
import datetime
import bcrypt
import os
import secrets
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import models

SECRET_KEY = os.getenv("SECRET_KEY", "SRI_SAI_LAKSHMI_PADDY_SECRET_KEY_2026_AGRI")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", "noreply@srisailakshmi.com"))
SMTP_TLS = os.getenv("SMTP_TLS", "true").lower() in ("true", "1", "yes")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def is_smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_PORT and (not SMTP_USER or SMTP_PASSWORD))

def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)

def send_reset_password_email(to_email: str, reset_link: str, full_name: str):
    if not is_smtp_configured():
        raise RuntimeError("SMTP email service is not configured on the server")

    subject = "Password Reset Request - Sri Sai Lakshmi Paddy Office"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c140e; color: #f5f5f5; margin: 0; padding: 24px; }}
        .card {{ max-width: 540px; margin: 0 auto; background: #122115; border: 1px solid #d4af37; border-radius: 12px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
        .header {{ text-align: center; border-bottom: 1px solid rgba(212, 175, 55, 0.25); padding-bottom: 20px; margin-bottom: 24px; }}
        .brand {{ color: #d4af37; font-size: 24px; font-weight: 800; margin: 0; }}
        .subtitle {{ color: #a5d6a7; font-size: 13px; margin: 6px 0 0; text-transform: uppercase; letter-spacing: 0.05em; }}
        .content {{ font-size: 15px; line-height: 1.6; color: #e0e0e0; }}
        .btn-container {{ text-align: center; margin: 28px 0; }}
        .btn {{ display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%); color: #0c140e !important; text-decoration: none; font-weight: 700; border-radius: 8px; font-size: 15px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3); }}
        .warning {{ font-size: 13px; color: #ffb74d; background: rgba(255, 183, 77, 0.1); border-left: 3px solid #ffb74d; padding: 10px 14px; border-radius: 4px; margin: 20px 0; }}
        .link-alt {{ font-size: 12px; color: #888; word-break: break-all; margin-top: 20px; }}
        .footer {{ font-size: 12px; color: #666; border-top: 1px solid rgba(255,255,200,0.08); padding-top: 16px; margin-top: 28px; text-align: center; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="brand">🌾 Sri Sai Lakshmi</div>
          <div class="subtitle">Paddy Billing & Mill Ledger System</div>
        </div>
        <div class="content">
          <p>Hello <strong>{full_name}</strong>,</p>
          <p>We received a request to reset the password for your account on the Sri Sai Lakshmi Paddy Office portal.</p>
          <div class="btn-container">
            <a href="{reset_link}" class="btn">Reset Password</a>
          </div>
          <div class="warning">
            ⏰ This password reset link is valid for <strong>30 minutes</strong> and can only be used once.
          </div>
          <p>If you did not request a password reset, no action is needed; your current password remains secure.</p>
          <div class="link-alt">
            If the button doesn't work, copy and paste this URL into your browser:<br>
            <a href="{reset_link}" style="color: #d4af37;">{reset_link}</a>
          </div>
        </div>
        <div class="footer">
          &copy; Sri Sai Lakshmi Paddy Office. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    """

    text_content = f"""Hello {full_name},

We received a request to reset your password for your account on Sri Sai Lakshmi Paddy Office.

Click or open the link below to set a new password (valid for 30 minutes):
{reset_link}

If you did not request this, you can safely ignore this email.

--
Sri Sai Lakshmi Paddy Office & Mill Ledger System
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to_email

    msg.attach(MIMEText(text_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    if SMTP_PORT == 465:
        server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=12)
    else:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=12)
        if SMTP_TLS:
            server.starttls()
            
    if SMTP_USER and SMTP_PASSWORD:
        server.login(SMTP_USER, SMTP_PASSWORD)

    server.sendmail(SMTP_FROM, [to_email], msg.as_string())
    server.quit()

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def require_role(allowed_roles: list[str]):
    def dependency(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action"
            )
        return current_user
    return dependency
