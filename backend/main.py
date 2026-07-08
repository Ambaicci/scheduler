from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal, Base, engine
import models
import hashlib
import base64
from datetime import date
import random
import string
import scheduler
import scheduler_service
import atexit
import time

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Coffeesoft Scheduler API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
    role: str = "EMPLOYEE"  # "EMPLOYEE" or "ADMIN"

class PasswordResetRequest(BaseModel):
    email_or_id: str

class PasswordResetConfirm(BaseModel):
    user_id: int
    new_password: str
    reset_token: str

@app.get("/")
def read_root():
    return {"message": "Welcome to Coffeesoft Scheduler API"}

@app.post("/api/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Check if login is by email or employee_id
    user = db.query(models.User).filter(
        (models.User.email == request.email) | 
        (models.User.employee_id == request.email)
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or ID")
    
    hashed_password = hashlib.sha256(request.password.encode()).hexdigest()
    
    if user.hashed_password != hashed_password:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    token_data = f"{user.id}:{user.role}"
    token = base64.b64encode(token_data.encode()).decode()
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "user_id": user.id,
        "employee_id": user.employee_id,
        "email": user.email
    }

@app.get("/api/branches")
def get_branches(db: Session = Depends(get_db)):
    branches = db.query(models.Branch).all()
    return branches

@app.get("/api/admin/employees")
def list_employees(db: Session = Depends(get_db)):
    employees = db.query(models.User).all()
    result = []
    for emp in employees:
        result.append({
            "id": emp.id,
            "employee_id": emp.employee_id,
            "name": emp.name,
            "email": emp.email,
            "job_title": emp.job_title,
            "role": emp.role,
            "is_active": emp.is_active,
            "max_hours_per_week": emp.max_hours_per_week,
            "phone_number": emp.phone_number,
        })
    return result

@app.post("/api/admin/employees")
def create_employee(emp: EmployeeCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == emp.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Generate employee ID
    last = db.query(models.User).filter(models.User.employee_id.like("CHEBU-%")).order_by(models.User.id.desc()).first()
    if last and last.employee_id:
        try:
            num = int(last.employee_id.split("-")[1]) + 1
        except:
            num = 1
    else:
        num = 1
    
    employee_id = f"CHEBU-{num:03d}"
    temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    hashed = hashlib.sha256(temp_password.encode()).hexdigest()
    
    new_emp = models.User(
        employee_id=employee_id,
        name=emp.name,
        email=emp.email,
        hashed_password=hashed,
        role=emp.role,
        job_title=emp.job_title,
        phone_number=emp.phone_number,
        max_hours_per_week=emp.max_hours_per_week,
        is_active=True
    )
    
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)
    
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
    is_active: bool = None,
    db: Session = Depends(get_db)
):
    """Update employee details"""
    employee = db.query(models.User).filter(models.User.id == employee_id).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if name:
        employee.name = name
    if email:
        existing = db.query(models.User).filter(
            models.User.email == email,
            models.User.id != employee_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        employee.email = email
    if job_title:
        employee.job_title = job_title
    if phone_number:
        employee.phone_number = phone_number
    if max_hours_per_week:
        employee.max_hours_per_week = max_hours_per_week
    if is_active is not None:
        employee.is_active = is_active
    
    db.commit()
    db.refresh(employee)
    
    return {
        "success": True,
        "message": f"Employee {employee.name} updated successfully",
        "employee": {
            "id": employee.id,
            "employee_id": employee.employee_id,
            "name": employee.name,
            "email": employee.email,
            "job_title": employee.job_title,
            "role": employee.role,
            "phone_number": employee.phone_number,
            "max_hours_per_week": employee.max_hours_per_week,
            "is_active": employee.is_active
        }
    }

@app.post("/api/reset-password")
def reset_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    """Send password reset instructions"""
    user = db.query(models.User).filter(
        (models.User.email == request.email_or_id) |
        (models.User.employee_id == request.email_or_id)
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    reset_token = base64.b64encode(f"{user.id}:{int(time.time())}".encode()).decode()
    
    return {
        "success": True,
        "message": "Password reset instructions sent",
        "reset_token": reset_token,
        "user_id": user.id,
        "email": user.email
    }

@app.post("/api/reset-password/confirm")
def confirm_reset_password(request: PasswordResetConfirm, db: Session = Depends(get_db)):
    """Confirm password reset with token"""
    try:
        decoded = base64.b64decode(request.reset_token).decode()
        uid, timestamp = decoded.split(":")
        if int(uid) != request.user_id:
            raise HTTPException(status_code=400, detail="Invalid token")
        
        if int(time.time()) - int(timestamp) > 3600:
            raise HTTPException(status_code=400, detail="Token expired")
    except:
        raise HTTPException(status_code=400, detail="Invalid token")
    
    user = db.query(models.User).filter(models.User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.hashed_password = hashlib.sha256(request.new_password.encode()).hexdigest()
    db.commit()
    
    return {
        "success": True,
        "message": "Password reset successfully"
    }

@app.get("/api/master-roster")
def get_master_roster(db: Session = Depends(get_db)):
    assignments = db.query(models.RosterAssignment).order_by(models.RosterAssignment.date).all()
    
    result = []
    for a in assignments:
        user = db.query(models.User).filter(models.User.id == a.user_id).first()
        branch = db.query(models.Branch).filter(models.Branch.id == a.branch_id).first()
        
        result.append({
            "assignment_id": a.id,
            "user_id": a.user_id,
            "user_name": user.name if user else "Unknown",
            "role": user.job_title if user else "Unknown",
            "branch_name": branch.name if branch else "Unknown",
            "date": a.date.strftime("%Y-%m-%d"),
            "day": a.date.strftime("%A"),
            "start_time": a.start_time,
            "end_time": a.end_time
        })
    return result

@app.post("/api/generate-roster")
def generate_roster(db: Session = Depends(get_db)):
    try:
        result = scheduler.generate_weekly_roster(db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/my-schedule/{user_id}")
def get_my_schedule(user_id: int, db: Session = Depends(get_db)):
    assignments = db.query(models.RosterAssignment).filter(
        models.RosterAssignment.user_id == user_id
    ).order_by(models.RosterAssignment.date).all()
    
    result = []
    for a in assignments:
        branch = db.query(models.Branch).filter(models.Branch.id == a.branch_id).first()
        result.append({
            "date": a.date.strftime("%Y-%m-%d"),
            "day": a.date.strftime("%A"),
            "branch": branch.name if branch else "Unknown",
            "start_time": a.start_time,
            "end_time": a.end_time
        })
    return result

# ==================== EXCEPTION MANAGEMENT ENDPOINTS ====================

@app.get("/api/admin/exceptions")
def get_exceptions(db: Session = Depends(get_db)):
    exceptions = db.query(models.EmployeeException).filter(
        models.EmployeeException.is_active == True
    ).all()
    
    result = []
    for ex in exceptions:
        user = db.query(models.User).filter(models.User.id == ex.user_id).first()
        approver = db.query(models.User).filter(models.User.id == ex.approved_by).first()
        result.append({
            "id": ex.id,
            "user_id": ex.user_id,
            "user_name": user.name if user else "Unknown",
            "exception_type": ex.exception_type,
            "start_date": ex.start_date.isoformat() if ex.start_date else None,
            "end_date": ex.end_date.isoformat() if ex.end_date else None,
            "reduced_hours_per_week": ex.reduced_hours_per_week,
            "notes": ex.notes,
            "approved_by": approver.name if approver else "Unknown",
            "is_active": ex.is_active
        })
    return result

@app.post("/api/admin/exceptions")
def create_exception(
    user_id: int,
    exception_type: str,
    start_date: str,
    end_date: str = None,
    reduced_hours_per_week: float = None,
    notes: str = None,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    start_date_obj = date.fromisoformat(start_date)
    end_date_obj = date.fromisoformat(end_date) if end_date else None
    
    exception = models.EmployeeException(
        user_id=user_id,
        exception_type=exception_type,
        start_date=start_date_obj,
        end_date=end_date_obj,
        reduced_hours_per_week=reduced_hours_per_week,
        notes=notes,
        approved_by=1,
        created_at=date.today(),
        is_active=True
    )
    
    db.add(exception)
    db.commit()
    db.refresh(exception)
    
    if reduced_hours_per_week:
        user.max_hours_per_week = reduced_hours_per_week
        db.commit()
    
    return {
        "success": True,
        "message": f"Exception created for {user.name}",
        "exception_id": exception.id
    }

@app.delete("/api/admin/exceptions/{exception_id}")
def deactivate_exception(exception_id: int, db: Session = Depends(get_db)):
    exception = db.query(models.EmployeeException).filter(
        models.EmployeeException.id == exception_id
    ).first()
    
    if not exception:
        raise HTTPException(status_code=404, detail="Exception not found")
    
    exception.is_active = False
    db.commit()
    
    user = db.query(models.User).filter(models.User.id == exception.user_id).first()
    if user and exception.reduced_hours_per_week:
        user.max_hours_per_week = 45.0
        db.commit()
    
    return {
        "success": True,
        "message": "Exception deactivated successfully"
    }

# ==================== SHIFT SWAP ENDPOINTS ====================

@app.post("/api/swap-request")
def create_swap_request(
    requesting_user_id: int,
    target_user_id: int,
    assignment_id: int,
    notes: str = None,
    db: Session = Depends(get_db)
):
    assignment = db.query(models.RosterAssignment).filter(
        models.RosterAssignment.id == assignment_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    target_user = db.query(models.User).filter(models.User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    
    swap_request = models.ShiftSwapRequest(
        requesting_user_id=requesting_user_id,
        target_user_id=target_user_id,
        assignment_id=assignment_id,
        notes=notes,
        status="PENDING",
        request_date=date.today()
    )
    
    db.add(swap_request)
    db.commit()
    db.refresh(swap_request)
    
    return {
        "success": True,
        "message": f"Swap request sent to {target_user.name}",
        "request_id": swap_request.id
    }

@app.get("/api/swap-requests")
def get_swap_requests(db: Session = Depends(get_db)):
    requests = db.query(models.ShiftSwapRequest).filter(
        models.ShiftSwapRequest.status == "PENDING"
    ).all()
    
    result = []
    for req in requests:
        requesting = db.query(models.User).filter(models.User.id == req.requesting_user_id).first()
        target = db.query(models.User).filter(models.User.id == req.target_user_id).first()
        assignment = db.query(models.RosterAssignment).filter(
            models.RosterAssignment.id == req.assignment_id
        ).first()
        
        result.append({
            "id": req.id,
            "requesting_user": requesting.name if requesting else "Unknown",
            "requesting_user_id": req.requesting_user_id,
            "target_user": target.name if target else "Unknown",
            "target_user_id": req.target_user_id,
            "assignment_id": req.assignment_id,
            "assignment_date": assignment.date.isoformat() if assignment else None,
            "status": req.status,
            "notes": req.notes,
            "request_date": req.request_date.isoformat() if req.request_date else None
        })
    
    return result

@app.put("/api/swap-request/{request_id}")
def update_swap_request(
    request_id: int,
    status: str,
    db: Session = Depends(get_db)
):
    swap_request = db.query(models.ShiftSwapRequest).filter(
        models.ShiftSwapRequest.id == request_id
    ).first()
    
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    if status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    swap_request.status = status
    swap_request.approved_by = 1
    swap_request.approved_date = date.today()
    
    if status == "APPROVED":
        assignment = db.query(models.RosterAssignment).filter(
            models.RosterAssignment.id == swap_request.assignment_id
        ).first()
        
        if assignment:
            target_assignment = db.query(models.RosterAssignment).filter(
                models.RosterAssignment.user_id == swap_request.target_user_id,
                models.RosterAssignment.date == assignment.date
            ).first()
            
            if target_assignment:
                temp_user_id = assignment.user_id
                assignment.user_id = target_assignment.user_id
                target_assignment.user_id = temp_user_id
                swap_request.target_assignment_id = target_assignment.id
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Swap request {status.lower()} successfully"
    }

# ==================== TIME OFF ENDPOINTS ====================

@app.post("/api/time-off-request")
def create_time_off_request(
    user_id: int,
    start_date: str,
    end_date: str,
    reason: str,
    notes: str = None,
    db: Session = Depends(get_db)
):
    start_date_obj = date.fromisoformat(start_date)
    end_date_obj = date.fromisoformat(end_date)
    
    time_off = models.TimeOffRequest(
        user_id=user_id,
        start_date=start_date_obj,
        end_date=end_date_obj,
        reason=reason,
        notes=notes,
        status="PENDING",
        request_date=date.today()
    )
    
    db.add(time_off)
    db.commit()
    db.refresh(time_off)
    
    return {
        "success": True,
        "message": "Time off request submitted",
        "request_id": time_off.id
    }

@app.get("/api/time-off-requests")
def get_time_off_requests(db: Session = Depends(get_db)):
    requests = db.query(models.TimeOffRequest).filter(
        models.TimeOffRequest.status == "PENDING"
    ).all()
    
    result = []
    for req in requests:
        user = db.query(models.User).filter(models.User.id == req.user_id).first()
        result.append({
            "id": req.id,
            "user_id": req.user_id,
            "user_name": user.name if user else "Unknown",
            "start_date": req.start_date.isoformat() if req.start_date else None,
            "end_date": req.end_date.isoformat() if req.end_date else None,
            "reason": req.reason,
            "notes": req.notes,
            "status": req.status,
            "request_date": req.request_date.isoformat() if req.request_date else None
        })
    
    return result

@app.put("/api/time-off-request/{request_id}")
def update_time_off_request(
    request_id: int,
    status: str,
    db: Session = Depends(get_db)
):
    time_off = db.query(models.TimeOffRequest).filter(
        models.TimeOffRequest.id == request_id
    ).first()
    
    if not time_off:
        raise HTTPException(status_code=404, detail="Time off request not found")
    
    if status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    time_off.status = status
    time_off.approved_by = 1
    time_off.approved_date = date.today()
    
    db.commit()
    
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