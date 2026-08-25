from fastapi import FastAPI, HTTPException
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

# ====== ایجاد ادمین در زمان startup ======
@app.on_event("startup")
def create_default_admin():
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
# ====== مسیرهای API (قبل از StaticFiles) ======
# ================================================
from .routers import products, requests, admin, settings

app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(requests.router, prefix="/api/requests", tags=["requests"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])

# ====== مسیر موقت برای ایجاد ادمین ======
@app.get("/create-admin")
async def create_admin_via_browser():
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
# ====== سرویس‌دهی فایل‌های استاتیک (فرانت‌اند) ======
# ================================================
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")

if os.path.exists(STATIC_DIR):
    # Mount static files on /static path
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
else:
    print("⚠️ پوشه‌ی static پیدا نشد!")

# ====== مسیرهای SPA (بعد از APIها) ======
@app.get("/")
async def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not found"}

@app.get("/admin/login")
@app.get("/admin/dashboard")
async def serve_admin_pages():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not found"}

# ====== Fallback برای SPA (هر مسیر دیگر) ======
@app.get("/{path:path}")
async def serve_spa(path: str):
    # اگر مسیر با api/ یا admin/ شروع شود، 404 برگردان
    if path.startswith("api/") or path.startswith("admin/"):
        raise HTTPException(status_code=404, detail="Not found")
    
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not found"}