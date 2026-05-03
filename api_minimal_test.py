"""最小限テスト用API — 問題切り分け用"""
from fastapi import FastAPI
import os

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok", "port": os.environ.get("PORT", "NOT_SET")}

@app.get("/")
def root():
    return {"message": "minimal test ok"}
