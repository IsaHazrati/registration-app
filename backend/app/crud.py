from sqlalchemy.orm import Session, joinedload
from . import models, schemas
from datetime import datetime
from typing import List, Optional

# ========== Product CRUD ==========
def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_products(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Product).offset(skip).limit(limit).all()

def create_product(db: Session, product: schemas.ProductCreate):
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def update_product(db: Session, product_id: int, product: schemas.ProductCreate):
    db_product = get_product(db, product_id)
    if db_product:
        for key, value in product.dict().items():
            setattr(db_product, key, value)
        db.commit()
        db.refresh(db_product)
    return db_product

def delete_product(db: Session, product_id: int):
    db_product = get_product(db, product_id)
    if db_product:
        db.delete(db_product)
        db.commit()
    return db_product

# ========== Request CRUD ==========
def get_request_by_employee_code(db: Session, employee_code: str):
    return db.query(models.Request).filter(models.Request.employee_code == employee_code).first()

def get_requests(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Request).options(
        joinedload(models.Request.items).joinedload(models.RequestItem.product)
    ).offset(skip).limit(limit).all()

def get_all_requests_with_items(db: Session):
    return db.query(models.Request).options(
        joinedload(models.Request.items).joinedload(models.RequestItem.product)
    ).all()

def create_request(db: Session, request: schemas.RequestCreate):
    db_request = models.Request(
        employee_code=request.employee_code,
        full_name=request.full_name,
        phone_number=request.phone_number,  # ← فیلد جدید
        employment_status=request.employment_status,
        admin_description=request.admin_description
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    
    for item in request.items:
        db_item = models.RequestItem(
            request_id=db_request.id,
            product_id=item.product_id,
            quantity=item.quantity
        )
        db.add(db_item)
    db.commit()
    db.refresh(db_request)
    return db_request

def update_request(db: Session, employee_code: str, request: schemas.RequestUpdate):
    db_request = get_request_by_employee_code(db, employee_code)
    if not db_request:
        return None
    
    if not db_request.is_editable:
        return None
    
    setting = db.query(models.Setting).first()
    if setting and setting.edit_deadline:
        if datetime.now() > setting.edit_deadline:
            return None
    
    if request.full_name:
        db_request.full_name = request.full_name
    if request.phone_number is not None:  # ← فیلد جدید
        db_request.phone_number = request.phone_number
    if request.employment_status:
        db_request.employment_status = request.employment_status
    if request.admin_description is not None:
        db_request.admin_description = request.admin_description
    
    if request.items is not None:
        db.query(models.RequestItem).filter(models.RequestItem.request_id == db_request.id).delete()
        for item in request.items:
            db_item = models.RequestItem(
                request_id=db_request.id,
                product_id=item.product_id,
                quantity=item.quantity
            )
            db.add(db_item)
    
    db.commit()
    db.refresh(db_request)
    return db_request

def delete_request(db: Session, request_id: int):
    db_request = db.query(models.Request).filter(models.Request.id == request_id).first()
    if db_request:
        db.delete(db_request)
        db.commit()
    return db_request

def toggle_request_editable(db: Session, request_id: int, is_editable: bool):
    db_request = db.query(models.Request).filter(models.Request.id == request_id).first()
    if db_request:
        db_request.is_editable = is_editable
        db.commit()
        db.refresh(db_request)
    return db_request

def update_admin_description(db: Session, request_id: int, description: str):
    db_request = db.query(models.Request).filter(models.Request.id == request_id).first()
    if db_request:
        db_request.admin_description = description
        db.commit()
        db.refresh(db_request)
    return db_request