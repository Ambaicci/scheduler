import os
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import date, datetime
import hashlib

# Load environment variables
load_dotenv()

# Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def get_db():
    """Dependency for FastAPI to get Supabase client"""
    return supabase

# User functions
def get_user_by_email(email):
    """Get a user by email"""
    result = supabase.table("users").select("*").eq("email", email).execute()
    if result.data:
        return result.data[0]
    return None

def get_user_by_employee_id(employee_id):
    """Get a user by employee ID"""
    result = supabase.table("users").select("*").eq("employee_id", employee_id).execute()
    if result.data:
        return result.data[0]
    return None

def get_user_by_email_or_id(email_or_id):
    """Get a user by email OR employee ID"""
    # Try email first
    result = supabase.table("users").select("*").eq("email", email_or_id).execute()
    if result.data:
        return result.data[0]
    
    # Try employee ID
    result = supabase.table("users").select("*").eq("employee_id", email_or_id).execute()
    if result.data:
        return result.data[0]
    
    return None

def get_all_users():
    """Get all users"""
    result = supabase.table("users").select("*").execute()
    return result.data if result.data else []

def get_all_employees():
    """Get all employees (role = EMPLOYEE)"""
    result = supabase.table("users").select("*").eq("role", "EMPLOYEE").execute()
    return result.data if result.data else []

def create_user(data):
    """Create a new user"""
    result = supabase.table("users").insert(data).execute()
    return result.data[0] if result.data else None

def update_user(user_id, data):
    """Update a user"""
    result = supabase.table("users").update(data).eq("id", user_id).execute()
    return result.data[0] if result.data else None

# Branch functions
def get_all_branches():
    """Get all branches"""
    result = supabase.table("branches").select("*").execute()
    return result.data if result.data else []

def create_branch(data):
    """Create a new branch"""
    result = supabase.table("branches").insert(data).execute()
    return result.data[0] if result.data else None

# Assignment functions
def get_all_assignments():
    """Get all roster assignments"""
    result = supabase.table("assignments").select("*").order("date").execute()
    return result.data if result.data else []

def get_assignments_by_user(user_id):
    """Get assignments for a specific user"""
    result = supabase.table("assignments").select("*").eq("user_id", user_id).order("date").execute()
    return result.data if result.data else []

def create_assignment(data):
    """Create a new assignment"""
    result = supabase.table("assignments").insert(data).execute()
    return result.data[0] if result.data else None

def delete_all_assignments():
    """Delete all assignments (for regeneration)"""
    result = supabase.table("assignments").delete().neq("id", 0).execute()
    return result

# Exception functions
def get_all_exceptions():
    """Get all active exceptions"""
    result = supabase.table("employee_exceptions").select("*").eq("is_active", True).execute()
    return result.data if result.data else []

def create_exception(data):
    """Create a new exception"""
    result = supabase.table("employee_exceptions").insert(data).execute()
    return result.data[0] if result.data else None

def deactivate_exception(exception_id):
    """Deactivate an exception"""
    result = supabase.table("employee_exceptions").update({"is_active": False}).eq("id", exception_id).execute()
    return result.data[0] if result.data else None

# Swap Request functions
def get_pending_swap_requests():
    """Get all pending swap requests"""
    result = supabase.table("shift_swap_requests").select("*").eq("status", "PENDING").execute()
    return result.data if result.data else []

def create_swap_request(data):
    """Create a new swap request"""
    result = supabase.table("shift_swap_requests").insert(data).execute()
    return result.data[0] if result.data else None

def update_swap_request(request_id, data):
    """Update a swap request"""
    result = supabase.table("shift_swap_requests").update(data).eq("id", request_id).execute()
    return result.data[0] if result.data else None

# Time Off functions
def get_pending_time_off_requests():
    """Get all pending time off requests"""
    result = supabase.table("time_off_requests").select("*").eq("status", "PENDING").execute()
    return result.data if result.data else []

def create_time_off_request(data):
    """Create a new time off request"""
    result = supabase.table("time_off_requests").insert(data).execute()
    return result.data[0] if result.data else None

def update_time_off_request(request_id, data):
    """Update a time off request"""
    result = supabase.table("time_off_requests").update(data).eq("id", request_id).execute()
    return result.data[0] if result.data else None

# Scheduler Log functions
def create_scheduler_log(data):
    """Create a scheduler log entry"""
    result = supabase.table("scheduler_logs").insert(data).execute()
    return result.data[0] if result.data else None