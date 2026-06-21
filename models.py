from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # admin, staff, accountant
    full_name = Column(String, nullable=False)

class Farmer(Base):
    __tablename__ = "farmers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    village = Column(String, nullable=False)
    address = Column(String, nullable=False)
    bank_name = Column(String, nullable=True)
    bank_account = Column(String, nullable=True)
    bank_ifsc = Column(String, nullable=True)

    bills = relationship("Bill", back_populates="farmer", cascade="all, delete-orphan")

class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    bill_number = Column(String, unique=True, index=True, nullable=False)
    date_time = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False)
    billing_mode = Column(String, nullable=False)  # 75KG, 100KG
    bags = Column(Integer, nullable=False)
    extra_kgs = Column(Float, nullable=False)
    input_rate = Column(Float, nullable=False)
    adjusted_rate = Column(Float, nullable=False)
    cost_per_kg = Column(Float, nullable=False)
    bags_amount = Column(Float, nullable=False)
    extra_amount = Column(Float, nullable=False)
    gross_total = Column(Float, nullable=False)
    cc_deduction = Column(Float, nullable=False)
    hamali = Column(Float, nullable=False)
    advance_paid = Column(Float, nullable=False)
    net_payable = Column(Float, nullable=False)
    language = Column(String, default="en")  # en, te, both

    farmer = relationship("Farmer", back_populates="bills")

class MillLedger(Base):
    __tablename__ = "mill_ledger"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    amount_received = Column(Float, nullable=False)
    reference_number = Column(String, nullable=False)  # UTR
    notes = Column(String, nullable=True)

class Backup(Base):
    __tablename__ = "backups"

    id = Column(Integer, primary_key=True, index=True)
    backup_date = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    filename = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    status = Column(String, nullable=False)  # success, failed
