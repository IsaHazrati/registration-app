from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, CheckConstraint, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(255), nullable=False)
    max_quantity = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Request(Base):
    __tablename__ = "requests"
    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    phone_number = Column(String(20), nullable=True)  # ← فیلد جدید
    employment_status = Column(String(20), nullable=False)
    service_location_id = Column(Integer, ForeignKey("service_locations.id", ondelete="SET NULL"), nullable=True)  # ← فیلد جدید: محل خدمت
    admin_description = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_editable = Column(Boolean, default=True)

    items = relationship("RequestItem", back_populates="request", cascade="all, delete-orphan")
    service_location = relationship("ServiceLocation")  # ← فیلد جدید: محل خدمت

class RequestItem(Base):
    __tablename__ = "request_items"
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id", ondelete="CASCADE"))
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    quantity = Column(Integer, nullable=False, default=0)

    request = relationship("Request", back_populates="items")
    product = relationship("Product")

class ServiceLocation(Base):  # ← جدول جدید: محل خدمت
    __tablename__ = "service_locations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    edit_deadline = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())