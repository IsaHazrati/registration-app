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

# ====== ایجاد ادمین در زمان startup (اگر وجود نداشت) ======
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
# ====== مسیرهای API (قبل از هر چیز) ======
# ================================================
from .routers import products, requests, admin, settings

app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(requests.router, prefix="/api/requests", tags=["requests"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])

# ================================================
# ====== مسیر موقت برای ایجاد ادمین ======
# ================================================
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
    # مونت کردن پوشه‌ی static روی مسیر /static
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
    print(f"✅ پوشه‌ی static در مسیر {STATIC_DIR} پیدا شد")
else:
    print(f"❌ پوشه‌ی static در مسیر {STATIC_DIR} پیدا نشد!")

# ================================================
# ====== مسیرهای SPA (همه مسیرهای دیگر به index.html بروند) ======
# ================================================
@app.get("/")
@app.get("/admin/login")
@app.get("/admin/dashboard")
async def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not found"}

# ====== Fallback برای هر مسیر دیگر (به جز APIها) ======
@app.get("/{path:path}")
async def serve_spa(path: str):
    # اگر مسیر با api/ یا admin/ شروع شود، 404 برگردان (تا با APIها تداخل نداشته باشد)
    if path.startswith("api/") or path.startswith("admin/"):
        raise HTTPException(status_code=404, detail="Not found")
    
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not found"}