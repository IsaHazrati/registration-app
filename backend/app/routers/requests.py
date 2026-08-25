from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas
from ..database import SessionLocal

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("", response_model=schemas.Request)
def create_request(request: schemas.RequestCreate, db: Session = Depends(get_db)):
    # Check if employee code already exists
    existing = crud.get_request_by_employee_code(db, request.employee_code)
    if existing:
        raise HTTPException(status_code=400, detail="این کد پرسنلی قبلاً ثبت شده است")
    
    return crud.create_request(db, request)

@router.get("/{employee_code}", response_model=schemas.Request)
def get_request(employee_code: str, db: Session = Depends(get_db)):
    db_request = crud.get_request_by_employee_code(db, employee_code)
    if not db_request:
        raise HTTPException(status_code=404, detail="درخواستی با این کد پرسنلی یافت نشد")
    return db_request

@router.post("/verify")
def verify_request(employee_code: str, full_name: str, db: Session = Depends(get_db)):
    db_request = crud.get_request_by_employee_code(db, employee_code)
    if not db_request:
        raise HTTPException(status_code=404, detail="درخواستی با این کد پرسنلی یافت نشد")
    
    if db_request.full_name != full_name:
        raise HTTPException(status_code=400, detail="اطلاعات وارد شده صحیح نمی‌باشد")
    
    return {
        "message": "هویت تأیید شد",
        "request": db_request
    }

@router.put("/{employee_code}", response_model=schemas.Request)
def update_request(employee_code: str, request: schemas.RequestUpdate, db: Session = Depends(get_db)):
    db_request = crud.update_request(db, employee_code, request)
    if db_request is None:
        existing = crud.get_request_by_employee_code(db, employee_code)
        if not existing:
            raise HTTPException(status_code=404, detail="درخواستی با این کد پرسنلی یافت نشد")
        raise HTTPException(status_code=403, detail="امکان ویرایش این درخواست وجود ندارد")
    return db_request

@router.delete("/{employee_code}")
def delete_request(employee_code: str, db: Session = Depends(get_db)):
    db_request = crud.get_request_by_employee_code(db, employee_code)
    if not db_request:
        raise HTTPException(status_code=404, detail="درخواستی با این کد پرسنلی یافت نشد")
    
    # Delete request and all its items
    db.delete(db_request)
    db.commit()
    return {"message": "درخواست با موفقیت حذف شد"}