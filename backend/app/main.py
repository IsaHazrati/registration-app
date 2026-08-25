from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from . import models
from .database import SessionLocal, engine
from .models import Admin
from .routers import utils
import os

# ====== ایجاد جدول‌های دیتابیس ======
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Registration System", version="1.0.0")

# ====== مسیر پوشه‌ی استاتیک ======
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")

# ====== سرویس‌دهی فایل‌های استاتیک با پشتیبانی از SPA ======
if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

# ====== مسیرهای API ======
from .routers import products, requests, admin, settings
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(requests.router, prefix="/api/requests", tags=["requests"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])

# ================================================
# ====== ایجاد خودکار ادمین در هنگام راه‌اندازی ======
# ================================================
@app.on_event("startup")
def create_default_admin():
    """در زمان اجرا، اگر ادمین وجود نداشت، یکی ایجاد می‌کند."""
    db = SessionLocal()
    username = "admin"
    password = "admin123"
    
    existing = db.query(Admin).filter(Admin.username == username).first()
    if not existing:
        hashed = utils.hash_password(password)
        admin = Admin(username=username, hashed_password=hashed)
        db.add(admin)
        db.commit()
        print(f"✅ ادمین با نام کاربری '{username}' و رمز '{password}' ایجاد شد")
    else:
        print("ℹ️ ادمین قبلاً وجود دارد")
    db.close()

# ================================================
# ====== مسیر موقت برای ایجاد ادمین (از طریق مرورگر) ======
# ================================================
@app.get("/create-admin")
async def create_admin_via_browser():
    """این مسیر را در مرورگر باز کنید تا ادمین ساخته شود."""
    db = SessionLocal()
    username = "admin"
    password = "admin123"
    
    existing = db.query(Admin).filter(Admin.username == username).first()
    if existing:
        db.close()
        return {"message": "ادمین قبلاً وجود دارد", "username": username}
    
    hashed = utils.hash_password(password)
    admin = Admin(username=username, hashed_password=hashed)
    db.add(admin)
    db.commit()
    db.close()
    
    return {
        "message": f"ادمین با نام کاربری '{username}' و رمز '{password}' ایجاد شد",
        "username": username,
        "password": password
    }

# ================================================
# ====== مسیرهای فرانت‌اند (SPA) ======
# ================================================
@app.get("/admin/login")
@app.get("/admin/dashboard")
async def serve_admin_pages():
    """سرویس‌دهی صفحات مدیریت"""
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not found"}

# Fallback برای SPA (هر مسیر دیگر به index.html برود)
@app.get("/{path:path}")
async def serve_spa(path: str):
    """سرویس‌دهی سایر مسیرها (برای ریدایرکت به index.html)"""
    if path.startswith("api/") or path.startswith("admin/"):
        return {"message": f"Path {path} not found"}
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not found"}