from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
import models
import schemas
from auth import get_current_user, require_role

router = APIRouter(prefix="/api/farmers", tags=["Farmers"])

@router.post("", response_model=schemas.FarmerResponse, status_code=status.HTTP_201_CREATED)
def create_farmer(
    farmer: schemas.FarmerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "staff"]))
):
    # Check duplicate phone
    db_farmer = db.query(models.Farmer).filter(models.Farmer.phone == farmer.phone).first()
    if db_farmer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A farmer with this mobile number already exists"
        )
    
    new_farmer = models.Farmer(**farmer.dict())
    db.add(new_farmer)
    db.commit()
    db.refresh(new_farmer)
    return new_farmer

@router.get("", response_model=list[schemas.FarmerResponse])
def get_farmers(
    q: str = Query(None, description="Search query for name, phone, village"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Farmer)
    if q:
        query = query.filter(
            or_(
                models.Farmer.name.ilike(f"%{q}%"),
                models.Farmer.phone.ilike(f"%{q}%"),
                models.Farmer.village.ilike(f"%{q}%")
            )
        )
    return query.all()

@router.get("/{farmer_id}", response_model=schemas.FarmerResponse)
def get_farmer(
    farmer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer not found"
        )
    return farmer

@router.put("/{farmer_id}", response_model=schemas.FarmerResponse)
def update_farmer(
    farmer_id: int,
    farmer_data: schemas.FarmerUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "staff"]))
):
    farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer not found"
        )
    
    # Check phone duplicate if updated
    if farmer.phone != farmer_data.phone:
        db_farmer = db.query(models.Farmer).filter(models.Farmer.phone == farmer_data.phone).first()
        if db_farmer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A farmer with this mobile number already exists"
            )
            
    for key, value in farmer_data.dict().items():
        setattr(farmer, key, value)
        
    db.commit()
    db.refresh(farmer)
    return farmer

@router.delete("/{farmer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_farmer(
    farmer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer not found"
        )
    db.delete(farmer)
    db.commit()
    return None
