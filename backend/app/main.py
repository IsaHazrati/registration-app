from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from . import models
from .database import engine
import os

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Registration System", version="1.0.0")

# مسیر پوشه‌ی استاتیک (جایی که فرانت‌اند build شده قرار دارد)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ====== مسیرهای API ======
from .routers import products, requests, admin, settings
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(requests.router, prefix="/api/requests", tags=["requests"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])

# ====== مسیرهای فرانت‌اند ======
@app.get("/")
async def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not found"}

@app.get("/admin/login")
@app.get("/admin/dashboard")
async def serve_admin_pages():
    return await serve_index()

# Fallback برای SPA (هر مسیر دیگر به index.html برود)
@app.get("/{path:path}")
async def serve_spa(path: str):
    if path.startswith("api/") or path.startswith("admin/"):
        return {"message": f"Path {path} not found"}
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not found"}