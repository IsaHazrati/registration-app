# مرحله ۱: ساخت فرانت‌اند
FROM node:18-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm install --network-timeout=600000
COPY frontend/ .
RUN npm run build

# مرحله ۲: ساخت بک‌اند
FROM python:3.11-slim

WORKDIR /app

# کپی وابستگی‌های بک‌اند
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# کپی کد بک‌اند
COPY backend/ .

# کپی فرانت‌اند build شده به پوشه‌ی static
COPY --from=frontend-builder /frontend/build /app/static

# اجرا
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]