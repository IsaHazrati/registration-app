# ========== مرحله ۱: ساخت فرانت‌اند ==========
FROM node:18-alpine AS frontend-builder

WORKDIR /frontend

# کپی فایل‌های package برای نصب وابستگی‌ها
COPY frontend/package*.json ./

# تنظیم آینه برای سرعت بیشتر
RUN npm config set registry https://registry.npmmirror.com

# نصب وابستگی‌های پروژه
RUN npm install --network-timeout=600000

# کپی بقیه‌ی کدهای فرانت‌اند
COPY frontend/ .

# ===== نصب سراسری craco و اجرای build =====
RUN npm install -g @craco/craco
RUN craco build

# ========== مرحله ۲: ساخت بک‌اند ==========
FROM python:3.11-slim

WORKDIR /app

# کپی وابستگی‌های بک‌اند
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# کپی کد بک‌اند
COPY backend/ .

# کپی فایل‌های build شده‌ی فرانت‌اند به پوشه‌ی static
COPY --from=frontend-builder /frontend/build /app/static

# اجرای بک‌اند با Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]