from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import hashlib
import base64
from datetime import date
import random
import string
import time
import scheduler
import scheduler_service
import atexit
import supabase_db as db

# 1. Create the FastAPI app FIRST
app = FastAPI(title="CHEBU Scheduler API")

# 2. Add CORS middleware SECOND
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://scheduler-five-opal.vercel.app", # <-- YOUR ACTUAL VERCEL URL ADDED HERE
        "https://scheduler-frontend.vercel.app",
        "https://chebu-scheduler.vercel.app",
        "https://scheduler-api-nhao.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods (GET, POST, PUT, DELETE, OPTIONS)
    allow_headers=["*"], # Allow all headers
    expose_headers=["Content-Length", "Content-Type"],
    max_age=86400,  # 24 hours
)

# 3. Database dependency
def get_db():
    return db.supabase