#!/bin/bash
echo "[start.sh] Installing missing packages..."
pip install python-multipart psycopg2-binary anthropic schedule "sentry-sdk[fastapi]" 2>&1 || echo "[start.sh] pip install failed, continuing..."
echo "[start.sh] Starting uvicorn..."
exec uvicorn api:app --host 0.0.0.0 --port "${PORT:-8080}"
