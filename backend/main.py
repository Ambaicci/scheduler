from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ai_provider import ask_zing
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
import smart_scheduler
import json
import re
import csv
import io

# 1. Create the FastAPI app FIRST
app = FastAPI(title="Zing Smart Scheduling API")

# 2. Add CORS middleware SECOND
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://scheduler-five-opal.vercel.app",
        "https://scheduler-frontend.vercel.app",
        "https://chebu-scheduler.vercel.app",
        "https://scheduler-api-nhao.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "Content-Type"],
    max_age=86400,
)

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

class ScheduleGenerateRequest(BaseModel):
    organization_id: str
    start_date: str
    end_date: str
    rotation_type: str = "none"

@app.get("/")
def read_root():
    return {"message": "Welcome to Zing Smart Scheduling API"}

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
    
    users = db.get_all_users()
    max_num = 0
    for u in users:
        if u.get('employee_id', '').startswith('CHEBU-'):
            try:
                num = int(u['employee_id'].split('-')[1])
                if num > max_num: max_num = num
            except: pass
    
    employee_id = f"CHEBU-{max_num + 1:03d}"
    temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    hashed = hashlib.sha256(temp_password.encode()).hexdigest()
    
    data = {
        "employee_id": employee_id, "name": emp.name, "email": emp.email,
        "hashed_password": hashed, "role": emp.role, "job_title": emp.job_title,
        "phone_number": emp.phone_number, "max_hours_per_week": emp.max_hours_per_week,
        "is_active": True
    }
    new_emp = db.create_user(data)
    return {"success": True, "employee_id": employee_id, "temporary_password": temp_password, "message": f"Employee {emp.name} created!"}

@app.put("/api/admin/employees/{employee_id}")
def update_employee(employee_id: int, name: str = None, email: str = None, job_title: str = None, phone_number: str = None, max_hours_per_week: float = None, is_active: bool = None):
    users = db.get_all_users()
    user = next((u for u in users if u['id'] == employee_id), None)
    if not user: raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = {}
    if name: update_data['name'] = name
    if email:
        existing = db.get_user_by_email(email)
        if existing and existing['id'] != employee_id: raise HTTPException(status_code=400, detail="Email already in use")
        update_data['email'] = email
    if job_title: update_data['job_title'] = job_title
    if phone_number: update_data['phone_number'] = phone_number
    if max_hours_per_week: update_data['max_hours_per_week'] = max_hours_per_week
    if is_active is not None: update_data['is_active'] = is_active
    
    updated = db.update_user(employee_id, update_data)
    return {"success": True, "message": "Employee updated successfully", "employee": updated}

@app.post("/api/reset-password")
def reset_password(request: PasswordResetRequest):
    user = db.get_user_by_email_or_id(request.email_or_id)
    if not user: raise HTTPException(status_code=404, detail="User not found")
    reset_token = base64.b64encode(f"{user['id']}:{int(time.time())}".encode()).decode()
    return {"success": True, "message": "Password reset instructions sent", "reset_token": reset_token, "user_id": user['id'], "email": user['email']}

@app.post("/api/reset-password/confirm")
def confirm_reset_password(request: PasswordResetConfirm):
    try:
        decoded = base64.b64decode(request.reset_token).decode()
        uid, timestamp = decoded.split(":")
        if int(uid) != request.user_id: raise HTTPException(status_code=400, detail="Invalid token")
        if int(time.time()) - int(timestamp) > 3600: raise HTTPException(status_code=400, detail="Token expired")
    except: raise HTTPException(status_code=400, detail="Invalid token")
    
    user = db.get_user_by_email_or_id(str(request.user_id))
    if not user: raise HTTPException(status_code=404, detail="User not found")
    hashed = hashlib.sha256(request.new_password.encode()).hexdigest()
    db.update_user(request.user_id, {"hashed_password": hashed})
    return {"success": True, "message": "Password reset successfully"}

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
            "assignment_id": a['id'], "user_id": a['user_id'],
            "user_name": user['name'] if user else "Unknown",
            "role": user['job_title'] if user else "Unknown",
            "branch_name": branch['name'] if branch else "Unknown",
            "date": a['date'], "day": date.fromisoformat(a['date']).strftime("%A"),
            "start_time": a['start_time'], "end_time": a['end_time']
        })
    return result

@app.post("/api/generate-roster")
def generate_roster():
    try:
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
            "assignment_id": a['id'], "date": a['date'],
            "day": date.fromisoformat(a['date']).strftime("%A"),
            "branch": branch['name'] if branch else "Unknown",
            "start_time": a['start_time'], "end_time": a['end_time']
        })
    return result

@app.get("/api/admin/exceptions")
def get_exceptions():
    exceptions = db.get_all_exceptions()
    users = db.get_all_users()
    result = []
    for ex in exceptions:
        user = next((u for u in users if u['id'] == ex['user_id']), None)
        approver = next((u for u in users if u['id'] == ex.get('approved_by')), None)
        result.append({
            "id": ex['id'], "user_id": ex['user_id'],
            "user_name": user['name'] if user else "Unknown",
            "exception_type": ex['exception_type'],
            "start_date": ex['start_date'], "end_date": ex.get('end_date'),
            "reduced_hours_per_week": ex.get('reduced_hours_per_week'),
            "notes": ex.get('notes'),
            "approved_by": approver['name'] if approver else "Unknown",
            "is_active": ex['is_active']
        })
    return result

@app.post("/api/admin/exceptions")
def create_exception(user_id: int, exception_type: str, start_date: str, end_date: str = None, reduced_hours_per_week: float = None, notes: str = None):
    user = db.get_user_by_email_or_id(str(user_id))
    if not user: raise HTTPException(status_code=404, detail="Employee not found")
    data = {"user_id": user_id, "exception_type": exception_type, "start_date": start_date, "end_date": end_date, "reduced_hours_per_week": reduced_hours_per_week, "notes": notes, "approved_by": 1, "is_active": True}
    exception = db.create_exception(data)
    if reduced_hours_per_week: db.update_user(user_id, {"max_hours_per_week": reduced_hours_per_week})
    return {"success": True, "message": f"Exception created for {user['name']}", "exception_id": exception['id']}

@app.delete("/api/admin/exceptions/{exception_id}")
def deactivate_exception(exception_id: int):
    exception = db.deactivate_exception(exception_id)
    if not exception: raise HTTPException(status_code=404, detail="Exception not found")
    user_id = exception['user_id']
    user = db.get_user_by_email_or_id(str(user_id))
    if user: db.update_user(user_id, {"max_hours_per_week": 45.0})
    return {"success": True, "message": "Exception deactivated successfully"}

@app.post("/api/swap-request")
def create_swap_request(requesting_user_id: int, target_user_id: int, assignment_id: int, notes: str = None):
    assignments = db.get_all_assignments()
    assignment = next((a for a in assignments if a['id'] == assignment_id), None)
    if not assignment: raise HTTPException(status_code=404, detail="Assignment not found")
    users = db.get_all_users()
    target_user = next((u for u in users if u['id'] == target_user_id), None)
    if not target_user: raise HTTPException(status_code=404, detail="Target user not found")
    data = {"requesting_user_id": requesting_user_id, "target_user_id": target_user_id, "assignment_id": assignment_id, "notes": notes, "status": "PENDING", "request_date": date.today().isoformat()}
    swap_request = db.create_swap_request(data)
    return {"success": True, "message": f"Swap request sent to {target_user['name']}", "request_id": swap_request['id']}

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
            "status": req['status'], "notes": req.get('notes'), "request_date": req.get('request_date')
        })
    return result

@app.put("/api/swap-request/{request_id}")
def update_swap_request(request_id: int, status: str, ai_verified: bool = False):
    if status not in ["APPROVED", "REJECTED"]: 
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {
        "status": status, 
        "ai_verified": ai_verified, 
        "approved_by": 1, 
        "approved_date": date.today().isoformat()
    }
    swap_request = db.update_swap_request(request_id, update_data)
    if not swap_request: 
        raise HTTPException(status_code=404, detail="Swap request not found")
    return {"success": True, "message": f"Swap request {status.lower()} successfully"}

@app.post("/api/time-off-request")
def create_time_off_request(user_id: int, start_date: str, end_date: str, reason: str, notes: str = None):
    data = {"user_id": user_id, "start_date": start_date, "end_date": end_date, "reason": reason, "notes": notes, "status": "PENDING", "request_date": date.today().isoformat()}
    time_off = db.create_time_off_request(data)
    return {"success": True, "message": "Time off request submitted", "request_id": time_off['id']}

@app.get("/api/time-off-requests")
def get_time_off_requests():
    requests = db.get_pending_time_off_requests()
    users = db.get_all_users()
    result = []
    for req in requests:
        user = next((u for u in users if u['id'] == req['user_id']), None)
        result.append({
            "id": req['id'], "user_id": req['user_id'],
            "user_name": user['name'] if user else "Unknown",
            "start_date": req['start_date'], "end_date": req['end_date'],
            "reason": req['reason'], "notes": req.get('notes'),
            "status": req['status'], "request_date": req.get('request_date')
        })
    return result

@app.put("/api/time-off-request/{request_id}")
def update_time_off_request(request_id: int, status: str):
    if status not in ["APPROVED", "REJECTED"]: raise HTTPException(status_code=400, detail="Invalid status")
    update_data = {"status": status, "approved_by": 1, "approved_date": date.today().isoformat()}
    time_off = db.update_time_off_request(request_id, update_data)
    if not time_off: raise HTTPException(status_code=404, detail="Time off request not found")
    return {"success": True, "message": f"Time off request {status.lower()} successfully"}

# ==================== UNIVERSAL API ENDPOINTS ====================
@app.get("/api/organizations")
def list_organizations(): return db.get_all_organizations()

@app.post("/api/organizations")
def create_new_organization(name: str, industry: str = None):
    data = {"name": name, "industry": industry}
    org = db.create_organization(data)
    return {"success": True, "organization": org}

@app.get("/api/organizations/{org_id}/locations")
def list_locations(org_id: str): return db.get_all_locations(org_id)

@app.post("/api/locations")
def create_new_location(organization_id: str, name: str, address: str = None, timezone: str = "UTC"):
    data = {"organization_id": organization_id, "name": name, "address": address, "timezone": timezone}
    location = db.create_location(data)
    return {"success": True, "location": location}

@app.get("/api/organizations/{org_id}/roles")
def list_roles(org_id: str): return db.get_all_roles(org_id)

@app.post("/api/roles")
def create_new_role(organization_id: str, name: str, description: str = None, max_hours_per_week: int = 40):
    data = {"organization_id": organization_id, "name": name, "description": description, "max_hours_per_week": max_hours_per_week}
    role = db.create_role(data)
    return {"success": True, "role": role}

@app.get("/api/organizations/{org_id}/shift-requirements")
def list_shift_requirements(org_id: str, location_id: str = None, day_of_week: int = None):
    return db.get_shift_requirements(org_id, location_id, day_of_week)

@app.post("/api/shift-requirements")
def create_shift_requirement(organization_id: str, location_id: str, role_id: str, day_of_week: int, start_time: str, end_time: str, quantity: int = 1):
    data = {"organization_id": organization_id, "location_id": location_id, "role_id": role_id, "day_of_week": day_of_week, "start_time": start_time, "end_time": end_time, "quantity": quantity}
    req = db.create_shift_requirement(data)
    return {"success": True, "shift_requirement": req}

@app.get("/api/organizations/{org_id}/skills")
def list_skills(org_id: str): return db.get_all_skills(org_id)

@app.post("/api/skills")
def create_skill(organization_id: str, name: str, description: str = None):
    data = {"organization_id": organization_id, "name": name, "description": description}
    skill = db.create_skill(data)
    return {"success": True, "skill": skill}

@app.get("/api/users/{user_id}/skills")
def list_user_skills(user_id: int): return db.get_user_skills(user_id)

@app.get("/api/users/{user_id}/availability")
def get_user_availability(user_id: int): return db.get_employee_availability(user_id)

@app.get("/api/users/{user_id}/unavailability")
def get_user_unavailability(user_id: int, start_date: str = None, end_date: str = None):
    return db.get_employee_unavailability(user_id, start_date, end_date)

# ==================== BULK EMPLOYEE IMPORT ====================
@app.post("/api/employees/bulk-import")
async def bulk_import_employees(organization_id: str, file: UploadFile = File(...)):
    try:
        contents = await file.read()
        csv_text = contents.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_text))
        
        imported = []
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                if not row.get('name') or not row.get('email'):
                    errors.append(f"Row {row_num}: Missing name or email")
                    continue
                
                existing = db.get_user_by_email(row['email'])
                if existing:
                    errors.append(f"Row {row_num}: Email {row['email']} already exists")
                    continue
                
                users = db.get_all_users()
                max_num = 0
                for u in users:
                    if u.get('employee_id', '').startswith('CHEBU-'):
                        try:
                            num = int(u['employee_id'].split('-')[1])
                            if num > max_num: max_num = num
                        except: pass
                
                employee_id = f"CHEBU-{max_num + 1:03d}"
                temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
                hashed = hashlib.sha256(temp_password.encode()).hexdigest()
                
                data = {
                    "employee_id": employee_id,
                    "name": row['name'],
                    "email": row['email'],
                    "hashed_password": hashed,
                    "role": "EMPLOYEE",
                    "job_title": row.get('job_title', 'Employee'),
                    "phone_number": row.get('phone_number', ''),
                    "max_hours_per_week": float(row.get('max_hours_per_week', 45)),
                    "is_active": True,
                    "organization_id": organization_id
                }
                
                new_emp = db.create_user(data)
                imported.append({
                    "employee_id": employee_id,
                    "name": row['name'],
                    "email": row['email'],
                    "temporary_password": temp_password
                })
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        return {
            "success": True,
            "imported_count": len(imported),
            "error_count": len(errors),
            "imported": imported,
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")

# ==================== SMART SCHEDULER & AI ENDPOINTS ====================
@app.post("/api/smart-scheduler/generate")
def generate_smart_schedule(request: ScheduleGenerateRequest):
    try:
        result = smart_scheduler.generate_smart_schedule(
            organization_id=request.organization_id,
            start_date=request.start_date,
            end_date=request.end_date,
            rotation_type=request.rotation_type
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/zing-chat")
async def zing_chat(request: Request):
    try:
        body = await request.json()
        user_message = body.get("message", "")
        pending_timeoff = db.get_pending_time_off_requests()
        pending_swaps = db.get_pending_swap_requests()
        employees = db.get_all_users()
        context_data = f"Pending Time Off Requests: {pending_timeoff}\nPending Swap Requests: {pending_swaps}\nTotal Employees: {len(employees)}"
        ai_response = ask_zing(user_message, context_data)
        action_taken = None
        if "ACTION_APPROVED" in ai_response:
            action_taken = "approved"
            ai_response = ai_response.replace("ACTION_APPROVED", "✅ I have approved the request and updated the schedule.")
        elif "ACTION_REJECTED" in ai_response:
            action_taken = "rejected"
            ai_response = ai_response.replace("ACTION_REJECTED", " I have rejected the request.")
        return {"response": ai_response, "action": action_taken}
    except Exception as e:
        return {"response": f"Error: {str(e)}"}

# ==================== SCHEDULE MANIPULATION ENDPOINTS ====================
@app.put("/api/assignment/{assignment_id}")
def update_assignment(assignment_id: int, user_id: int = None, date: str = None, start_time: str = None, end_time: str = None, branch_id: int = None):
    try:
        assignments = db.get_all_assignments()
        assignment = next((a for a in assignments if a['id'] == assignment_id), None)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        update_data = {}
        if user_id is not None: update_data['user_id'] = user_id
        if date is not None: update_data['date'] = date
        if start_time is not None: update_data['start_time'] = start_time
        if end_time is not None: update_data['end_time'] = end_time
        if branch_id is not None: update_data['branch_id'] = branch_id
        
        if not update_data:
            return {"success": False, "message": "No data to update"}
        
        result = db.supabase.table("assignments").update(update_data).eq("id", assignment_id).execute()
        if result.data:
            return {"success": True, "message": "Assignment updated successfully", "assignment": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to update assignment")
    except Exception as e:
        print(f"Error updating assignment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/assignment/{assignment_id}")
def delete_assignment(assignment_id: int):
    try:
        assignments = db.get_all_assignments()
        assignment = next((a for a in assignments if a['id'] == assignment_id), None)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        result = db.supabase.table("assignments").delete().eq("id", assignment_id).execute()
        return {"success": True, "message": "Assignment deleted successfully"}
    except Exception as e:
        print(f"Error deleting assignment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== NEW LIVE EMPLOYEE ENDPOINTS ====================
@app.get("/api/my-requests/{user_id}")
def get_my_requests(user_id: int):
    try:
        to_res = db.supabase.table("time_off_requests").select("*").eq("user_id", user_id).order("request_date", desc=True).execute()
        time_off_data = to_res.data or []
    except Exception as e:
        time_off_data = []

    try:
        swap_res = db.supabase.table("shift_swap_requests").select("*").eq("requesting_user_id", user_id).order("request_date", desc=True).execute()
        swap_data_raw = swap_res.data or []
    except Exception as e:
        swap_data_raw = []

    users = db.get_all_users()
    assignments = db.get_all_assignments()
    enriched_swaps = []
    for req in swap_data_raw:
        target_user = next((u for u in users if u['id'] == req.get('target_user_id')), None)
        assignment = next((a for a in assignments if a['id'] == req.get('assignment_id')), None)
        enriched_swaps.append({
            "id": req['id'],
            "assignment_date": assignment['date'] if assignment else "Unknown",
            "target_user": target_user['name'] if target_user else "Unknown",
            "status": req.get('status', 'PENDING'),
            "notes": req.get('notes')
        })

    return {"time_off": time_off_data, "swaps": enriched_swaps}

@app.get("/api/ai-check-swap")
def ai_check_swap(user_a_id: int, user_b_id: int, assignment_id: int):
    print(f"\n--- AI CHECK SWAP START ---")
    print(f"IDs received from frontend: A={user_a_id}, B={user_b_id}, Assignment={assignment_id}")
    
    users = db.get_all_users()
    user_a = next((u for u in users if u['id'] == user_a_id), None)
    user_b = next((u for u in users if u['id'] == user_b_id), None)
    
    assignments = db.get_all_assignments()
    assignment = next((a for a in assignments if a['id'] == assignment_id), None)
    
    print(f"Found User A in DB: {user_a is not None}")
    print(f"Found User B in DB: {user_b is not None}")
    print(f"Found Assignment in DB: {assignment is not None}")
    
    if not user_a or not user_b or not assignment:
        print("❌ MISSING DATA! Returning ERROR.")
        return {"verdict": "ERROR", "reason": "User or assignment not found in database."}
        
    user_b_shifts = [a for a in assignments if a['user_id'] == user_b_id]
    current_hours = len(user_b_shifts) * 8 
    
    context = f"""
    Worker A: {user_a.get('name', 'Unknown')} (Role: {user_a.get('job_title', 'Unknown')})
    Worker B: {user_b.get('name', 'Unknown')} (Role: {user_b.get('job_title', 'Unknown')}, Max Hours/Week: {user_b.get('max_hours_per_week', 45)})
    
    Shift to Swap: 
    - Date: {assignment.get('date', 'Unknown')}
    - Time: {assignment.get('start_time', 'Unknown')} to {assignment.get('end_time', 'Unknown')}
    - Branch: {assignment.get('branch_name', 'Unknown')}
    """
    
    print(f"🧠 Context sent to AI:\n{context}")
    
    prompt = f"""
    You are Zing, a strict workforce compliance AI. 
    Evaluate if Worker B can safely take this shift from Worker A.
    
    Rules:
    1. Roles must match.
    2. Worker B must not exceed their max hours per week.
    
    Context: {context}
    
    Reply with EXACTLY one of these two formats:
    - "VERDICT_CLEAR: [Brief reason why it's safe]"
    - "VERDICT_VIOLATION: [Brief reason why it's blocked]"
    """
    
    ai_response = ask_zing(prompt, "")
    print(f"🤖 AI Raw Response: {ai_response}")
    
    if "VERDICT_CLEAR" in ai_response:
        reason = ai_response.replace("VERDICT_CLEAR:", "").strip()
        return {"verdict": "CLEAR", "reason": reason}
    elif "VERDICT_VIOLATION" in ai_response:
        reason = ai_response.replace("VERDICT_VIOLATION:", "").strip()
        return {"verdict": "VIOLATION", "reason": reason}
    else:
        return {"verdict": "UNKNOWN", "reason": ai_response}

@app.post("/api/zing-parse-query")
async def parse_schedule_query(request: Request):
    try:
        body = await request.json()
        query = body.get("query", "")
        if not query.strip():
            return {"success": False, "error": "Empty query"}
        
        employees = db.get_all_users()
        branches = db.get_all_branches()
        employee_names = [emp['name'] for emp in employees if emp.get('is_active', True)]
        branch_names = [branch['name'] for branch in branches]
        
        prompt = f"""You are a schedule query parser. Extract structured filters from natural language queries.
Available employees: {', '.join(employee_names[:10])}
Available branches: {', '.join(branch_names)}
Query: "{query}"
Extract the following filters (return ONLY valid JSON, no other text):
{{
  "employee": "exact employee name or null",
  "branch": "exact branch name or null",
  "timeOfDay": "morning|afternoon|evening|night or null",
  "dateRange": "thisWeek|thisMonth|nextWeek or null",
  "days": ["Monday", "Tuesday", etc] or []
}}
Rules:
- Match employee names EXACTLY (case-insensitive)
- Match branch names EXACTLY (case-insensitive)
- timeOfDay: morning=6AM-12PM, afternoon=12PM-5PM, evening=5PM-10PM, night=10PM-6AM
- dateRange: "this week" -> thisWeek, "this month" -> thisMonth, "next week" -> nextWeek
- days: Extract day names (Monday, Tuesday, etc.)
- If a filter is not mentioned, set it to null or empty array
Return ONLY the JSON object, nothing else."""

        ai_response = ask_zing(prompt, "")
        json_match = re.search(r'\{[^}]+\}', ai_response, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            filters = json.loads(json_str)
            result = {
                "success": True,
                "filters": {
                    "employee": filters.get("employee"),
                    "branch": filters.get("branch"),
                    "timeOfDay": filters.get("timeOfDay"),
                    "dateRange": filters.get("dateRange"),
                    "days": filters.get("days", [])
                }
            }
            if result["filters"]["employee"]:
                emp_lower = result["filters"]["employee"].lower()
                matched_emp = next((e for e in employee_names if e.lower() == emp_lower), None)
                result["filters"]["employee"] = matched_emp
            if result["filters"]["branch"]:
                branch_lower = result["filters"]["branch"].lower()
                matched_branch = next((b for b in branch_names if b.lower() == branch_lower), None)
                result["filters"]["branch"] = matched_branch
            valid_times = ["morning", "afternoon", "evening", "night"]
            if result["filters"]["timeOfDay"] and result["filters"]["timeOfDay"].lower() not in valid_times:
                result["filters"]["timeOfDay"] = None
            valid_ranges = ["thisWeek", "thisMonth", "nextWeek"]
            if result["filters"]["dateRange"] and result["filters"]["dateRange"] not in valid_ranges:
                result["filters"]["dateRange"] = None
            valid_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            result["filters"]["days"] = [d for d in result["filters"]["days"] if d in valid_days]
            return result
        else:
            return {"success": False, "error": "Could not parse AI response"}
    except json.JSONDecodeError:
        return {"success": False, "error": "Invalid JSON from AI"}
    except Exception as e:
        print(f"Error parsing query: {e}")
        return {"success": False, "error": str(e)}

# Start the background scheduler
scheduler_instance = scheduler_service.start_scheduler()

@atexit.register
def shutdown_scheduler():
    print("🔄 Scheduler shutdown")