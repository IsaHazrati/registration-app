import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# دریافت آدرس اتصال از متغیر محیطی
DATABASE_URL = os.getenv("DATABASE_URL")

# اگر متغیر محیطی وجود نداشت، از یک آدرس پیش‌فرض برای محیط محلی استفاده کن
if not DATABASE_URL:
    # این مقدار فقط برای تست لوکال است و در Render استفاده نمی‌شود
    DATABASE_URL = "postgresql://admin:123456@localhost/registration_db"

# نکته مهم: اگر آدرس با "postgres://" شروع شد، آن را به "postgresql://" تبدیل کنید
# زیرا SQLAlchemy از فرمت "postgresql://" پشتیبانی می‌کند[reference:2]
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()