import os
from supabase import create_client, Client
from dotenv import load_dotenv
import hashlib
from datetime import date

# Load environment variables
load_dotenv()

# Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    exit(1)

# Initialize Supabase client with service role key (admin privileges)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# SQL statements to create tables in Supabase
sql_statements = """
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    employee_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    role TEXT NOT NULL,
    job_title TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    hire_date DATE,
    phone_number TEXT,
    max_hours_per_week FLOAT DEFAULT 45.0,
    has_medical_restriction BOOLEAN DEFAULT FALSE,
    medical_restriction_notes TEXT,
    is_locum BOOLEAN DEFAULT FALSE,
    locum_rate FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    location TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_locum BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Employee exceptions table
CREATE TABLE IF NOT EXISTS employee_exceptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    exception_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    reduced_hours_per_week FLOAT,
    notes TEXT,
    approved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Shift swap requests table
CREATE TABLE IF NOT EXISTS shift_swap_requests (
    id SERIAL PRIMARY KEY,
    requesting_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
    target_assignment_id INTEGER REFERENCES assignments(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'PENDING',
    request_date DATE DEFAULT CURRENT_DATE,
    approved_by INTEGER REFERENCES users(id),
    approved_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Time off requests table
CREATE TABLE IF NOT EXISTS time_off_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    notes TEXT,
    request_date DATE DEFAULT CURRENT_DATE,
    approved_by INTEGER REFERENCES users(id),
    approved_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Scheduler logs table
CREATE TABLE IF NOT EXISTS scheduler_logs (
    id SERIAL PRIMARY KEY,
    run_date DATE NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    assignments_created INTEGER DEFAULT 0,
    uncovered_shifts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
"""

print("📦 Creating tables in Supabase...")

# Execute each SQL statement separately
for statement in sql_statements.split(';'):
    statement = statement.strip()
    if statement:
        try:
            supabase.rpc('exec_sql', {'sql': statement}).execute()
            print(f"✅ Executed: {statement[:50]}...")
        except Exception as e:
            if "already exists" in str(e):
                print(f"⚠️ Table already exists: {statement[:30]}...")
            else:
                print(f"❌ Error: {e}")

print("\n✅ Migration complete! Tables created in Supabase.")
print("\n📋 Next steps:")
print("1. Run the data migration script to copy data from SQLite")
print("2. Update your app to use Supabase instead of SQLite")