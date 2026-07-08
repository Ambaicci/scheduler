import os
import sqlite3
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

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Connect to SQLite
sqlite_conn = sqlite3.connect('backend/coffeesoft.db')
sqlite_cursor = sqlite_conn.cursor()

print("📦 Starting data migration from SQLite to Supabase...")

# --- Migrate Branches ---
print("\n📋 Migrating branches...")
sqlite_cursor.execute("SELECT id, name, location, is_active FROM branches")
branches = sqlite_cursor.fetchall()

for branch in branches:
    data = {
        "id": branch[0],
        "name": branch[1],
        "location": branch[2] if branch[2] else "",
        "is_active": bool(branch[3]) if branch[3] is not None else True
    }
    try:
        supabase.table("branches").upsert(data).execute()
        print(f"  ✅ Branch: {branch[1]}")
    except Exception as e:
        print(f"  ❌ Error with branch {branch[1]}: {e}")

# --- Migrate Users ---
print("\n📋 Migrating users...")
sqlite_cursor.execute("SELECT id, employee_id, name, email, hashed_password, role, job_title, is_active, hire_date, phone_number, max_hours_per_week FROM users")
users = sqlite_cursor.fetchall()

for user in users:
    data = {
        "id": user[0],
        "employee_id": user[1],
        "name": user[2],
        "email": user[3],
        "hashed_password": user[4],
        "role": user[5],
        "job_title": user[6],
        "is_active": bool(user[7]) if user[7] is not None else True,
        "hire_date": user[8] if user[8] else None,
        "phone_number": user[9] if user[9] else None,
        "max_hours_per_week": float(user[10]) if user[10] else 45.0
    }
    try:
        supabase.table("users").upsert(data).execute()
        print(f"  ✅ User: {user[2]} ({user[1]})")
    except Exception as e:
        print(f"  ❌ Error with user {user[2]}: {e}")

# --- Migrate Assignments ---
print("\n📋 Migrating assignments...")
sqlite_cursor.execute("SELECT id, user_id, branch_id, date, start_time, end_time, is_locum, notes FROM assignments")
assignments = sqlite_cursor.fetchall()

for assignment in assignments:
    data = {
        "id": assignment[0],
        "user_id": assignment[1],
        "branch_id": assignment[2],
        "date": assignment[3],
        "start_time": assignment[4],
        "end_time": assignment[5],
        "is_locum": bool(assignment[6]) if assignment[6] is not None else False,
        "notes": assignment[7] if assignment[7] else None
    }
    try:
        supabase.table("assignments").upsert(data).execute()
        print(f"  ✅ Assignment: ID {assignment[0]}")
    except Exception as e:
        print(f"  ❌ Error with assignment {assignment[0]}: {e}")

# --- Migrate Exceptions ---
print("\n📋 Migrating exceptions...")
sqlite_cursor.execute("SELECT id, user_id, exception_type, start_date, end_date, reduced_hours_per_week, notes, approved_by, is_active FROM employee_exceptions")
exceptions = sqlite_cursor.fetchall()

for exception in exceptions:
    data = {
        "id": exception[0],
        "user_id": exception[1],
        "exception_type": exception[2],
        "start_date": exception[3],
        "end_date": exception[4] if exception[4] else None,
        "reduced_hours_per_week": float(exception[5]) if exception[5] else None,
        "notes": exception[6] if exception[6] else None,
        "approved_by": exception[7] if exception[7] else None,
        "is_active": bool(exception[8]) if exception[8] is not None else True
    }
    try:
        supabase.table("employee_exceptions").upsert(data).execute()
        print(f"  ✅ Exception: ID {exception[0]}")
    except Exception as e:
        print(f"  ❌ Error with exception {exception[0]}: {e}")

# --- Migrate Swap Requests ---
print("\n📋 Migrating swap requests...")
sqlite_cursor.execute("SELECT id, requesting_user_id, target_user_id, assignment_id, target_assignment_id, status, request_date, approved_by, approved_date, notes FROM shift_swap_requests")
swaps = sqlite_cursor.fetchall()

for swap in swaps:
    data = {
        "id": swap[0],
        "requesting_user_id": swap[1],
        "target_user_id": swap[2],
        "assignment_id": swap[3],
        "target_assignment_id": swap[4] if swap[4] else None,
        "status": swap[5] if swap[5] else "PENDING",
        "request_date": swap[6] if swap[6] else date.today().isoformat(),
        "approved_by": swap[7] if swap[7] else None,
        "approved_date": swap[8] if swap[8] else None,
        "notes": swap[9] if swap[9] else None
    }
    try:
        supabase.table("shift_swap_requests").upsert(data).execute()
        print(f"  ✅ Swap Request: ID {swap[0]}")
    except Exception as e:
        print(f"  ❌ Error with swap request {swap[0]}: {e}")

# --- Migrate Time Off Requests ---
print("\n📋 Migrating time off requests...")
sqlite_cursor.execute("SELECT id, user_id, start_date, end_date, reason, status, notes, request_date, approved_by, approved_date FROM time_off_requests")
timeoffs = sqlite_cursor.fetchall()

for timeoff in timeoffs:
    data = {
        "id": timeoff[0],
        "user_id": timeoff[1],
        "start_date": timeoff[2],
        "end_date": timeoff[3],
        "reason": timeoff[4],
        "status": timeoff[5] if timeoff[5] else "PENDING",
        "notes": timeoff[6] if timeoff[6] else None,
        "request_date": timeoff[7] if timeoff[7] else date.today().isoformat(),
        "approved_by": timeoff[8] if timeoff[8] else None,
        "approved_date": timeoff[9] if timeoff[9] else None
    }
    try:
        supabase.table("time_off_requests").upsert(data).execute()
        print(f"  ✅ Time Off Request: ID {timeoff[0]}")
    except Exception as e:
        print(f"  ❌ Error with time off request {timeoff[0]}: {e}")

# --- Migrate Scheduler Logs ---
print("\n📋 Migrating scheduler logs...")
sqlite_cursor.execute("SELECT id, run_date, status, message, assignments_created, uncovered_shifts FROM scheduler_logs")
logs = sqlite_cursor.fetchall()

for log in logs:
    data = {
        "id": log[0],
        "run_date": log[1],
        "status": log[2],
        "message": log[3] if log[3] else "",
        "assignments_created": log[4] if log[4] else 0,
        "uncovered_shifts": log[5] if log[5] else 0
    }
    try:
        supabase.table("scheduler_logs").upsert(data).execute()
        print(f"  ✅ Scheduler Log: ID {log[0]}")
    except Exception as e:
        print(f"  ❌ Error with scheduler log {log[0]}: {e}")

sqlite_conn.close()

print("\n✅ Data migration complete!")
print("\n📊 Summary:")
print(f"  - Branches: {len(branches)} migrated")
print(f"  - Users: {len(users)} migrated")
print(f"  - Assignments: {len(assignments)} migrated")
print(f"  - Exceptions: {len(exceptions)} migrated")
print(f"  - Swap Requests: {len(swaps)} migrated")
print(f"  - Time Off Requests: {len(timeoffs)} migrated")
print(f"  - Scheduler Logs: {len(logs)} migrated")