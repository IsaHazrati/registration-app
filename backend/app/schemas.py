from pydantic import BaseModel, Field, validator, model_validator
from datetime import datetime
from typing import List, Optional

# Product Schemas
class ProductBase(BaseModel):
    name: str
    type: str
    max_quantity: int = Field(gt=0)
    description: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Service Location Schemas (← فیلد جدید: محل خدمت)
class ServiceLocationBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)

class ServiceLocationCreate(ServiceLocationBase):
    pass

class ServiceLocation(ServiceLocationBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Request Item Schemas
class RequestItemBase(BaseModel):
    product_id: int
    quantity: int = Field(ge=0)

class RequestItemCreate(RequestItemBase):
    pass

class RequestItem(RequestItemBase):
    id: int
    product: Product
    class Config:
        from_attributes = True

# Request Schemas
class RequestBase(BaseModel):
    employee_code: str = Field(min_length=8, max_length=50)
    full_name: str = Field(min_length=2, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=20)
    employment_status: str
    service_location_id: int  # ← فیلد جدید: محل خدمت
    admin_description: Optional[str] = None

    @validator('employment_status')
    def validate_status(cls, v):
        if v not in ['شاغل', 'بازنشسته']:
            raise ValueError('وضعیت اشتغال باید شاغل یا بازنشسته باشد')
        return v

class RequestCreate(RequestBase):
    items: List[RequestItemCreate]

    @model_validator(mode='after')
    def validate_has_product(self) -> 'RequestCreate':
        if not self.items or all(item.quantity == 0 for item in self.items):
            raise ValueError('شما هیچ محصولی انتخاب نکرده‌اید')
        return self

class RequestUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    employment_status: Optional[str] = None
    service_location_id: Optional[int] = None  # ← فیلد جدید: محل خدمت
    items: Optional[List[RequestItemCreate]] = None
    admin_description: Optional[str] = None

    @model_validator(mode='after')
    def validate_has_product(self) -> 'RequestUpdate':
        if self.items is not None and (not self.items or all(item.quantity == 0 for item in self.items)):
            raise ValueError('شما هیچ محصولی انتخاب نکرده‌اید')
        return self

class Request(RequestBase):
    id: int
    submitted_at: datetime
    updated_at: Optional[datetime]
    is_editable: bool
    items: List[RequestItem]
    service_location: Optional[ServiceLocation] = None  # ← فیلد جدید: محل خدمت
    class Config:
        from_attributes = True

# Admin Schemas
class AdminLogin(BaseModel):
    username: str
    password: str

class AdminToken(BaseModel):
    access_token: str
    token_type: str

# Settings Schemas
class SettingBase(BaseModel):
    edit_deadline: Optional[datetime]

class SettingUpdate(SettingBase):
    pass

class Setting(SettingBase):
    id: int
    updated_at: Optional[datetime]
    class Config:
        from_attributes = True