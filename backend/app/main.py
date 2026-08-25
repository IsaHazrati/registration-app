from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from . import models
from .database import engine
import os

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