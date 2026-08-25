# ========== مرحله ۱: ساخت فرانت‌اند ==========
FROM node:18-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm install --network-timeout=600000

COPY frontend/ .
RUN npm run build

# ========== مرحله ۲: ساخت بک‌اند ==========
FROM python:3.11-slim

WORKDIR /app

# کپی وابستگی‌های بک‌اند
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# کپی کد بک‌اند
COPY backend/ .

# ====== کپی فایل‌های build شده از فرانت‌اند ======
COPY --from=frontend-builder /frontend/build /app/static

# ====== ساده‌سازی ساختار پوشه‌های static ======
# فایل‌های build شده در /app/static/static/css و ... قرار دارند.
# ما آن‌ها را به ریشه‌ی /app/static منتقل می‌کنیم تا مسیرها ساده شوند.
RUN if [ -d "/app/static/static" ]; then \
        mv /app/static/static/* /app/static/ && \
        rmdir /app/static/static; \
    fi

# ====== ایجاد ادمین در زمان Build ======
RUN python -c "
import sys
sys.path.append('/app')
from app.database import SessionLocal
from app.models import Admin
from app.routers import utils

db = SessionLocal()
username = 'admin'
password = 'admin123'

existing = db.query(Admin).filter(Admin.username == username).first()
if existing:
    print('ℹ️ ادمین قبلاً وجود دارد')
else:
    hashed = utils.hash_password(password)
    admin = Admin(username=username, hashed_password=hashed)
    db.add(admin)
    db.commit()
    print(f'✅ ادمین با نام کاربری {username} و رمز {password} ایجاد شد')
db.close()
"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]