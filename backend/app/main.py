from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

# ====== CORS ======
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====== ایجاد ادمین در زمان startup ======
@app.on_event("startup")
def create_default_admin():
    try:
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
    except Exception as e:
        print(f"⚠️ خطا در ایجاد ادمین: {e}")

# ====== مسیرهای API ======
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

# ====== سرویس‌دهی فایل‌های استاتیک ======
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
    
    css_dir = os.path.join(STATIC_DIR, "css")
    js_dir = os.path.join(STATIC_DIR, "js")
    
    if os.path.exists(css_dir):
        app.mount("/css", StaticFiles(directory=css_dir), name="css")
    if os.path.exists(js_dir):
        app.mount("/js", StaticFiles(directory=js_dir), name="js")
    
    print(f"✅ پوشه‌ی static در مسیر {STATIC_DIR} پیدا شد")
else:
    print(f"❌ پوشه‌ی static در مسیر {STATIC_DIR} پیدا نشد!")

# ====== مسیرهای SPA ======
@app.get("/")
@app.get("/admin/login")
@app.get("/admin/dashboard")
async def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not found"}

# ====== Fallback ======
@app.get("/{path:path}")
async def serve_spa(path: str):
    if path.startswith("api/") or path.startswith("admin/"):
        raise HTTPException(status_code=404, detail="Not found")
    
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not found"}