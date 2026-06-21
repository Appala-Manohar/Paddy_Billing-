from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    username: str
    role: str
    full_name: str

class UserCreate(UserBase):
    password: str

class UserChangePassword(BaseModel):
    old_password: str
    new_password: str

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    full_name: str

# Farmer Schemas
class FarmerBase(BaseModel):
    name: str = Field(..., min_length=1)
    phone: str
    village: str = Field(..., min_length=1)
    address: str = Field(..., min_length=1)
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None

    @validator('phone')
    def validate_phone(cls, v):
        if not v.isdigit() or len(v) != 10:
            raise ValueError('Mobile number must be exactly 10 digits')
        return v

class FarmerCreate(FarmerBase):
    pass

class FarmerUpdate(FarmerBase):
    pass

class FarmerResponse(FarmerBase):
    id: int

    class Config:
        from_attributes = True

# Bill Schemas
class BillCreate(BaseModel):
    farmer_id: int
    billing_mode: str = Field(..., pattern="^(75KG|100KG)$")
    bags: int = Field(..., ge=0, description="Bags cannot be negative")
    extra_kgs: float = Field(..., ge=0, description="Extra KGs cannot be negative")
    input_rate: float = Field(..., gt=0, description="Rate must be greater than zero")
    advance_paid: float = Field(..., ge=0, description="Advance cannot be negative")
    cc_deduction: bool = False  # yes/no represented as boolean in request
    language: str = Field("en", pattern="^(en|te|both)$")

class BillUpdate(BaseModel):
    billing_mode: str = Field(..., pattern="^(75KG|100KG)$")
    bags: int = Field(..., ge=0)
    extra_kgs: float = Field(..., ge=0)
    input_rate: float = Field(..., gt=0)
    advance_paid: float = Field(..., ge=0)
    cc_deduction: bool = False
    language: str = Field("en", pattern="^(en|te|both)$")

class BillResponse(BaseModel):
    id: int
    bill_number: str
    date_time: datetime
    farmer_id: int
    billing_mode: str
    bags: int
    extra_kgs: float
    input_rate: float
    adjusted_rate: float
    cost_per_kg: float
    bags_amount: float
    extra_amount: float
    gross_total: float
    cc_deduction: float
    hamali: float
    advance_paid: float
    net_payable: float
    language: str
    farmer: Optional[FarmerResponse] = None

    class Config:
        from_attributes = True

# Mill Ledger Schemas
class MillLedgerBase(BaseModel):
    date: datetime
    amount_received: float = Field(..., gt=0, description="Amount must be positive")
    reference_number: str = Field(..., min_length=1, description="Reference/UTR number is required")
    notes: Optional[str] = None

class MillLedgerCreate(MillLedgerBase):
    pass

class MillLedgerUpdate(MillLedgerBase):
    pass

class MillLedgerResponse(MillLedgerBase):
    id: int

    class Config:
        from_attributes = True

# Backup Schemas
class BackupResponse(BaseModel):
    id: int
    backup_date: datetime
    filename: str
    file_size: int
    status: str

    class Config:
        from_attributes = True
