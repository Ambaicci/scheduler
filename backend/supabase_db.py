import os
import time
import httpx
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# 1. Force load_dotenv to look at the EXACT .env file in this folder
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

# 2. Get the variables
url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")

# 3. Debug check: If it still fails, this will tell us exactly why
if not url or not key:
    print(f"❌ CRITICAL: Missing Supabase credentials!")
    print(f"   Checked path: {env_path}")
    print(f"   URL found: {bool(url)}")
    print(f"   KEY found: {bool(key)}")
    raise ValueError("Missing Supabase credentials. Please check your .env file.")

# 4. Initialize Supabase Client
supabase: Client = create_client(url, key)

# ==========================================================
# ROBUST RETRY DECORATOR FOR TRANSIENT HTTP/2 ERRORS
# ==========================================================
def with_db_retry(max_retries=3, delay=1):
    """Decorator to automatically retry Supabase queries on connection drops."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    error_str = str(e)
                    if "ConnectionTerminated" in error_str or "RemoteProtocolError" in error_str or "ReadTimeout" in error_str:
                        if attempt == max_retries - 1:
                            print(f"❌ DB Query '{func.__name__}' failed after {max_retries} retries: {e}")
                            raise e
                        print(f"⚠️ Connection dropped in '{func.__name__}', retrying ({attempt + 1}/{max_retries})...")
                        time.sleep(delay)
                    else:
                        # If it's a different error (e.g., syntax, permissions), raise immediately
                        raise e
        return wrapper
    return decorator

# ==========================================================
# USER / EMPLOYEE FUNCTIONS
# ==========================================================
@with_db_retry()
def get_user_by_email_or_id(email_or_id):
    if str(email_or_id).isdigit():
        result = supabase.table("users").select("*").eq("id", int(email_or_id)).execute()
    else:
        result = supabase.table("users").select("*").eq("email", email_or_id).execute()
    return result.data[0] if result.data else None

@with_db_retry()
def get_user_by_email(email):
    result = supabase.table("users").select("*").eq("email", email).execute()
    return result.data[0] if result.data else None

@with_db_retry()
def get_all_users():
    result = supabase.table("users").select("*").execute()
    return result.data

@with_db_retry()
def create_user(data: dict):
    result = supabase.table("users").insert(data).execute()
    return result.data[0] if result.data else None

@with_db_retry()
def update_user(user_id: int, data: dict):
    result = supabase.table("users").update(data).eq("id", user_id).execute()
    return result.data[0] if result.data else None

# ==========================================================
# BRANCH / LOCATION FUNCTIONS
# ==========================================================
@with_db_retry()
def get_all_branches():
    result = supabase.table("branches").select("*").execute()
    return result.data

@with_db_retry()
def get_all_locations(org_id: str):
    result = supabase.table("locations").select("*").eq("organization_id", org_id).execute()
    return result.data

@with_db_retry()
def create_location(data: dict):
    result = supabase.table("locations").insert(data).execute()
    return result.data[0] if result.data else None

# ==========================================================
# ASSIGNMENT / ROSTER FUNCTIONS
# ==========================================================
@with_db_retry()
def get_all_assignments():
    result = supabase.table("assignments").select("*").order("date").execute()
    return result.data

@with_db_retry()
def get_assignments_by_user(user_id: int):
    result = supabase.table("assignments").select("*").eq("user_id", user_id).order("date").execute()
    return result.data

# ==========================================================
# EXCEPTION FUNCTIONS
# ==========================================================
@with_db_retry()
def get_all_exceptions():
    result = supabase.table("employee_exceptions").select("*").execute()
    return result.data

@with_db_retry()
def create_exception(data: dict):
    result = supabase.table("employee_exceptions").insert(data).execute()
    return result.data[0] if result.data else None

@with_db_retry()
def deactivate_exception(exception_id: int):
    result = supabase.table("employee_exceptions").update({"is_active": False}).eq("id", exception_id).execute()
    return result.data[0] if result.data else None

# ==========================================================
# SWAP REQUEST FUNCTIONS
# ==========================================================
@with_db_retry()
def get_pending_swap_requests():
    result = supabase.table("shift_swap_requests").select("*").eq("status", "PENDING").execute()
    return result.data

@with_db_retry()
def create_swap_request(data: dict):
    result = supabase.table("shift_swap_requests").insert(data).execute()
    return result.data[0] if result.data else None

@with_db_retry()
def update_swap_request(request_id: int, data: dict):
    result = supabase.table("shift_swap_requests").update(data).eq("id", request_id).execute()
    return result.data[0] if result.data else None

# ==========================================================
# TIME OFF REQUEST FUNCTIONS
# ==========================================================
@with_db_retry()
def get_pending_time_off_requests():
    result = supabase.table("time_off_requests").select("*").eq("status", "PENDING").execute()
    return result.data

@with_db_retry()
def create_time_off_request(data: dict):
    result = supabase.table("time_off_requests").insert(data).execute()
    return result.data[0] if result.data else None

@with_db_retry()
def update_time_off_request(request_id: int, data: dict):
    result = supabase.table("time_off_requests").update(data).eq("id", request_id).execute()
    return result.data[0] if result.data else None

# ==========================================================
# ORGANIZATION FUNCTIONS
# ==========================================================
@with_db_retry()
def get_all_organizations():
    result = supabase.table("organizations").select("*").execute()
    return result.data

@with_db_retry()
def create_organization(data: dict):
    result = supabase.table("organizations").insert(data).execute()
    return result.data[0] if result.data else None

# ==========================================================
# ROLE FUNCTIONS
# ==========================================================
@with_db_retry()
def get_all_roles(org_id: str):
    result = supabase.table("roles").select("*").eq("organization_id", org_id).execute()
    return result.data

@with_db_retry()
def create_role(data: dict):
    result = supabase.table("roles").insert(data).execute()
    return result.data[0] if result.data else None

# ==========================================================
# SHIFT REQUIREMENT FUNCTIONS
# ==========================================================
@with_db_retry()
def get_shift_requirements(org_id: str, location_id: str = None, day_of_week: int = None):
    query = supabase.table("shift_requirements").select("*").eq("organization_id", org_id)
    if location_id:
        query = query.eq("location_id", location_id)
    if day_of_week is not None:
        query = query.eq("day_of_week", day_of_week)
    result = query.execute()
    return result.data

@with_db_retry()
def create_shift_requirement(data: dict):
    result = supabase.table("shift_requirements").insert(data).execute()
    return result.data[0] if result.data else None

# ==========================================================
# SKILL FUNCTIONS
# ==========================================================
@with_db_retry()
def get_all_skills(org_id: str):
    result = supabase.table("skills").select("*").eq("organization_id", org_id).execute()
    return result.data

@with_db_retry()
def create_skill(data: dict):
    result = supabase.table("skills").insert(data).execute()
    return result.data[0] if result.data else None

@with_db_retry()
def get_user_skills(user_id: int):
    result = supabase.table("user_skills").select("*").eq("user_id", user_id).execute()
    return result.data

# ==========================================================
# AVAILABILITY FUNCTIONS
# ==========================================================
@with_db_retry()
def get_employee_availability(user_id: int):
    result = supabase.table("employee_availability").select("*").eq("user_id", user_id).execute()
    return result.data

@with_db_retry()
def get_employee_unavailability(user_id: int, start_date: str = None, end_date: str = None):
    query = supabase.table("employee_unavailability").select("*").eq("user_id", user_id)
    if start_date:
        query = query.gte("start_date", start_date)
    if end_date:
        query = query.lte("end_date", end_date)
    result = query.execute()
    return result.data