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

app = FastAPI(title="CHEBU Scheduler API")

# CORS - Allow all origins for now (update for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://scheduler-frontend.vercel.app",
        "https://chebu-scheduler.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "*"  # Temporary - allow all origins for testing
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database dependency
def get_db():
    return db.supabase

# Pydantic models
class LoginRequest(BaseModel):
    email: str
    password: str

class EmployeeCreate(BaseModel):
    name: str
    email: str
    job_title: str
    phone_number: str = None
    max_hours_per_week: float = 45.0
    role: str = "EMPLOYEE"

class PasswordResetRequest(BaseModel):
    email_or_id: str

class PasswordResetConfirm(BaseModel):
    user_id: int
    new_password: str
    reset_token: str

@app.get("/")
def read_root():
    return {"message": "Welcome to CHEBU Scheduler API"}

@app.post("/api/login")
def login(request: LoginRequest):
    user = db.get_user_by_email_or_id(request.email)
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or ID")
    
    hashed_password = hashlib.sha256(request.password.encode()).hexdigest()
    
    if user['hashed_password'] != hashed_password:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    token_data = f"{user['id']}:{user['role']}"
    token = base64.b64encode(token_data.encode()).decode()
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user['role'],
        "name": user['name'],
        "user_id": user['id'],
        "employee_id": user['employee_id'],
        "email": user['email']
    }

@app.get("/api/branches")
def get_branches():
    return db.get_all_branches()

@app.get("/api/admin/employees")
def list_employees():
    return db.get_all_users()

@app.post("/api/admin/employees")
def create_employee(emp: EmployeeCreate):
    existing = db.get_user_by_email(emp.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Generate employee ID
    users = db.get_all_users()
    max_num = 0
    for u in users:
        if u.get('employee_id', '').startswith('CHEBU-'):
            try:
                num = int(u['employee_id'].split('-')[1])
                if num > max_num:
                    max_num = num
            except:
                pass
    
    employee_id = f"CHEBU-{max_num + 1:03d}"
    temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    hashed = hashlib.sha256(temp_password.encode()).hexdigest()
    
    data = {
        "employee_id": employee_id,
        "name": emp.name,
        "email": emp.email,
        "hashed_password": hashed,
        "role": emp.role,
        "job_title": emp.job_title,
        "phone_number": emp.phone_number,
        "max_hours_per_week": emp.max_hours_per_week,
        "is_active": True
    }
    
    new_emp = db.create_user(data)
    
    return {
        "success": True,
        "employee_id": employee_id,
        "temporary_password": temp_password,
        "message": f"Employee {emp.name} created!"
    }

@app.put("/api/admin/employees/{employee_id}")
def update_employee(
    employee_id: int,
    name: str = None,
    email: str = None,
    job_title: str = None,
    phone_number: str = None,
    max_hours_per_week: float = None,
    is_active: bool = None
):
    # Get current user
    users = db.get_all_users()
    user = next((u for u in users if u['id'] == employee_id), None)
    
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = {}
    if name:
        update_data['name'] = name
    if email:
        # Check if email is already taken
        existing = db.get_user_by_email(email)
        if existing and existing['id'] != employee_id:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_data['email'] = email
    if job_title:
        update_data['job_title'] = job_title
    if phone_number:
        update_data['phone_number'] = phone_number
    if max_hours_per_week:
        update_data['max_hours_per_week'] = max_hours_per_week
    if is_active is not None:
        update_data['is_active'] = is_active
    
    updated = db.update_user(employee_id, update_data)
    
    return {
        "success": True,
        "message": f"Employee updated successfully",
        "employee": updated
    }

@app.post("/api/reset-password")
def reset_password(request: PasswordResetRequest):
    user = db.get_user_by_email_or_id(request.email_or_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    reset_token = base64.b64encode(f"{user['id']}:{int(time.time())}".encode()).decode()
    
    return {
        "success": True,
        "message": "Password reset instructions sent",
        "reset_token": reset_token,
        "user_id": user['id'],
        "email": user['email']
    }

@app.post("/api/reset-password/confirm")
def confirm_reset_password(request: PasswordResetConfirm):
    try:
        decoded = base64.b64decode(request.reset_token).decode()
        uid, timestamp = decoded.split(":")
        if int(uid) != request.user_id:
            raise HTTPException(status_code=400, detail="Invalid token")
        
        if int(time.time()) - int(timestamp) > 3600:
            raise HTTPException(status_code=400, detail="Token expired")
    except:
        raise HTTPException(status_code=400, detail="Invalid token")
    
    user = db.get_user_by_email_or_id(str(request.user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    hashed = hashlib.sha256(request.new_password.encode()).hexdigest()
    db.update_user(request.user_id, {"hashed_password": hashed})
    
    return {
        "success": True,
        "message": "Password reset successfully"
    }

@app.get("/api/master-roster")
def get_master_roster():
    assignments = db.get_all_assignments()
    users = db.get_all_users()
    branches = db.get_all_branches()
    
    result = []
    for a in assignments:
        user = next((u for u in users if u['id'] == a['user_id']), None)
        branch = next((b for b in branches if b['id'] == a['branch_id']), None)
        
        result.append({
            "assignment_id": a['id'],
            "user_id": a['user_id'],
            "user_name": user['name'] if user else "Unknown",
            "role": user['job_title'] if user else "Unknown",
            "branch_name": branch['name'] if branch else "Unknown",
            "date": a['date'],
            "day": date.fromisoformat(a['date']).strftime("%A"),
            "start_time": a['start_time'],
            "end_time": a['end_time']
        })
    return result

@app.post("/api/generate-roster")
def generate_roster():
    try:
        # Pass the Supabase client to the scheduler
        result = scheduler.generate_weekly_roster(db.supabase)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/my-schedule/{user_id}")
def get_my_schedule(user_id: int):
    assignments = db.get_assignments_by_user(user_id)
    branches = db.get_all_branches()
    
    result = []
    for a in assignments:
        branch = next((b for b in branches if b['id'] == a['branch_id']), None)
        result.append({
            "date": a['date'],
            "day": date.fromisoformat(a['date']).strftime("%A"),
            "branch": branch['name'] if branch else "Unknown",
            "start_time": a['start_time'],
            "end_time": a['end_time']
        })
    return result

# ==================== EXCEPTION MANAGEMENT ====================

@app.get("/api/admin/exceptions")
def get_exceptions():
    exceptions = db.get_all_exceptions()
    users = db.get_all_users()
    
    result = []
    for ex in exceptions:
        user = next((u for u in users if u['id'] == ex['user_id']), None)
        approver = next((u for u in users if u['id'] == ex.get('approved_by')), None)
        result.append({
            "id": ex['id'],
            "user_id": ex['user_id'],
            "user_name": user['name'] if user else "Unknown",
            "exception_type": ex['exception_type'],
            "start_date": ex['start_date'],
            "end_date": ex.get('end_date'),
            "reduced_hours_per_week": ex.get('reduced_hours_per_week'),
            "notes": ex.get('notes'),
            "approved_by": approver['name'] if approver else "Unknown",
            "is_active": ex['is_active']
        })
    return result

@app.post("/api/admin/exceptions")
def create_exception(
    user_id: int,
    exception_type: str,
    start_date: str,
    end_date: str = None,
    reduced_hours_per_week: float = None,
    notes: str = None
):
    user = db.get_user_by_email_or_id(str(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    data = {
        "user_id": user_id,
        "exception_type": exception_type,
        "start_date": start_date,
        "end_date": end_date,
        "reduced_hours_per_week": reduced_hours_per_week,
        "notes": notes,
        "approved_by": 1,
        "is_active": True
    }
    
    exception = db.create_exception(data)
    
    if reduced_hours_per_week:
        db.update_user(user_id, {"max_hours_per_week": reduced_hours_per_week})
    
    return {
        "success": True,
        "message": f"Exception created for {user['name']}",
        "exception_id": exception['id']
    }

@app.delete("/api/admin/exceptions/{exception_id}")
def deactivate_exception(exception_id: int):
    exception = db.deactivate_exception(exception_id)
    if not exception:
        raise HTTPException(status_code=404, detail="Exception not found")
    
    # Restore max hours
    user_id = exception['user_id']
    user = db.get_user_by_email_or_id(str(user_id))
    if user:
        db.update_user(user_id, {"max_hours_per_week": 45.0})
    
    return {
        "success": True,
        "message": "Exception deactivated successfully"
    }

# ==================== SHIFT SWAP ====================

@app.post("/api/swap-request")
def create_swap_request(
    requesting_user_id: int,
    target_user_id: int,
    assignment_id: int,
    notes: str = None
):
    assignments = db.get_all_assignments()
    assignment = next((a for a in assignments if a['id'] == assignment_id), None)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    users = db.get_all_users()
    target_user = next((u for u in users if u['id'] == target_user_id), None)
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    
    data = {
        "requesting_user_id": requesting_user_id,
        "target_user_id": target_user_id,
        "assignment_id": assignment_id,
        "notes": notes,
        "status": "PENDING",
        "request_date": date.today().isoformat()
    }
    
    swap_request = db.create_swap_request(data)
    
    return {
        "success": True,
        "message": f"Swap request sent to {target_user['name']}",
        "request_id": swap_request['id']
    }

@app.get("/api/swap-requests")
def get_swap_requests():
    requests = db.get_pending_swap_requests()
    users = db.get_all_users()
    assignments = db.get_all_assignments()
    
    result = []
    for req in requests:
        requesting = next((u for u in users if u['id'] == req['requesting_user_id']), None)
        target = next((u for u in users if u['id'] == req['target_user_id']), None)
        assignment = next((a for a in assignments if a['id'] == req['assignment_id']), None)
        
        result.append({
            "id": req['id'],
            "requesting_user": requesting['name'] if requesting else "Unknown",
            "requesting_user_id": req['requesting_user_id'],
            "target_user": target['name'] if target else "Unknown",
            "target_user_id": req['target_user_id'],
            "assignment_id": req['assignment_id'],
            "assignment_date": assignment['date'] if assignment else None,
            "status": req['status'],
            "notes": req.get('notes'),
            "request_date": req.get('request_date')
        })
    
    return result

@app.put("/api/swap-request/{request_id}")
def update_swap_request(request_id: int, status: str):
    if status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {
        "status": status,
        "approved_by": 1,
        "approved_date": date.today().isoformat()
    }
    
    swap_request = db.update_swap_request(request_id, update_data)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    return {
        "success": True,
        "message": f"Swap request {status.lower()} successfully"
    }

# ==================== TIME OFF ====================

@app.post("/api/time-off-request")
def create_time_off_request(
    user_id: int,
    start_date: str,
    end_date: str,
    reason: str,
    notes: str = None
):
    data = {
        "user_id": user_id,
        "start_date": start_date,
        "end_date": end_date,
        "reason": reason,
        "notes": notes,
        "status": "PENDING",
        "request_date": date.today().isoformat()
    }
    
    time_off = db.create_time_off_request(data)
    
    return {
        "success": True,
        "message": "Time off request submitted",
        "request_id": time_off['id']
    }

@app.get("/api/time-off-requests")
def get_time_off_requests():
    requests = db.get_pending_time_off_requests()
    users = db.get_all_users()
    
    result = []
    for req in requests:
        user = next((u for u in users if u['id'] == req['user_id']), None)
        result.append({
            "id": req['id'],
            "user_id": req['user_id'],
            "user_name": user['name'] if user else "Unknown",
            "start_date": req['start_date'],
            "end_date": req['end_date'],
            "reason": req['reason'],
            "notes": req.get('notes'),
            "status": req['status'],
            "request_date": req.get('request_date')
        })
    
    return result

@app.put("/api/time-off-request/{request_id}")
def update_time_off_request(request_id: int, status: str):
    if status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {
        "status": status,
        "approved_by": 1,
        "approved_date": date.today().isoformat()
    }
    
    time_off = db.update_time_off_request(request_id, update_data)
    if not time_off:
        raise HTTPException(status_code=404, detail="Time off request not found")
    
    return {
        "success": True,
        "message": f"Time off request {status.lower()} successfully"
    }

# Start the background scheduler
scheduler_instance = scheduler_service.start_scheduler()

# Shutdown scheduler when app exits
@atexit.register
def shutdown_scheduler():
    scheduler_instance.shutdown()
    print("🔄 Scheduler shutdown")