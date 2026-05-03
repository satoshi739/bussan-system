FROM python:3.11-slim

WORKDIR /app

# システム依存パッケージ（psycopg2-binary用にlibpq必要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 依存パッケージを先にインストール（キャッシュ効率化）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリコードをコピー
COPY . .

EXPOSE 8080

CMD uvicorn api:app --host 0.0.0.0 --port ${PORT:-8080}
