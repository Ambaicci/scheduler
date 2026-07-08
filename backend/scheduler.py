from datetime import date, timedelta
from sqlalchemy.orm import Session
import models
import random

# Real shift patterns from your pharmacy rosters
SHIFT_REQUIREMENTS = [
    # Sabatia Retail Shifts
    {"branch": "Sabatia Retail", "role": "Technician", "start": "10:00", "end": "18:00"},
    {"branch": "Sabatia Retail", "role": "Technician", "start": "08:00", "end": "18:00"},
    {"branch": "Sabatia Retail", "role": "Pharmacist", "start": "07:30", "end": "19:00"},
    {"branch": "Sabatia Retail", "role": "Pharmacist", "start": "11:00", "end": "21:00"},
    {"branch": "Sabatia Retail", "role": "Technician", "start": "07:30", "end": "18:00"},
    
    # Mumias Retail Shifts
    {"branch": "Mumias Retail", "role": "Technician", "start": "07:00", "end": "16:00"},
    {"branch": "Mumias Retail", "role": "Technician", "start": "13:00", "end": "21:00"},
    {"branch": "Mumias Retail", "role": "Technician", "start": "10:00", "end": "21:00"},
    {"branch": "Mumias Retail", "role": "Pharmacist", "start": "07:00", "end": "16:00"},
    
    # Mumias Wholesale Shifts
    {"branch": "Mumias Wholesale", "role": "Technician", "start": "08:00", "end": "17:00"},
    {"branch": "Mumias Wholesale", "role": "Technician", "start": "07:00", "end": "16:00"},
    
    # Navakholo Shifts
    {"branch": "Navakholo", "role": "Technician", "start": "08:00", "end": "17:00"},
]

# Employee preferences based on real rosters
EMPLOYEE_PREFERENCES = {
    "Zubeda Aseto": {"preferred_branch": "Sabatia Retail", "max_shifts": 5, "off_days": ["Saturday"]},
    "Onyunka Oyiengo": {"preferred_branch": "Sabatia Retail", "max_shifts": 5, "off_days": ["Monday"]},
    "Martha Shimenga": {"preferred_branch": "Sabatia Retail", "max_shifts": 4, "off_days": ["Wednesday", "Thursday"]},
    "Dr. Kevin Ambani": {"max_shifts": 5, "alternates": ["Sabatia Retail", "Mumias Retail"]},
    "Dr. Koech Frankline": {"max_shifts": 5, "preferred_branch": "Mumias Retail"},
    "Dr. Michelle Yego": {"max_shifts": 4, "alternates": ["Mumias Retail", "Sabatia Retail"]},
    "Billy Kipsang": {"preferred_branch": "Mumias Wholesale", "max_shifts": 5},
    "Ehsan Bulimo": {"max_shifts": 5, "off_days": ["Monday"]},
    "Steven Oluoch": {"max_shifts": 5},
    "Miriam Simiyu": {"max_shifts": 5},
    "Wissman Wamachekhe": {"max_shifts": 5},
    "Billie Kayoni": {"max_shifts": 5},
}

def generate_weekly_roster(db: Session):
    """Generate a weekly roster using real pharmacy patterns with exception handling"""
    
    # Clear old roster
    db.query(models.RosterAssignment).delete()
    
    # Calculate week dates (Monday to Saturday)
    today = date.today()
    monday = today + timedelta(days=(7 - today.weekday()) % 7)
    week_dates = [monday + timedelta(days=i) for i in range(6)]
    days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    # Get active employees
    employees = db.query(models.User).filter(
        models.User.role == "EMPLOYEE",
        models.User.is_active == True
    ).all()
    
    if not employees:
        return {"status": "error", "message": "No active employees found"}
    
    # Get active exceptions for each employee
    employee_exceptions = {}
    for emp in employees:
        exceptions = db.query(models.EmployeeException).filter(
            models.EmployeeException.user_id == emp.id,
            models.EmployeeException.is_active == True,
            models.EmployeeException.start_date <= date.today()
        ).all()
        
        # Filter exceptions that are still active (end_date not passed)
        active_exceptions = []
        for ex in exceptions:
            if ex.end_date is None or ex.end_date >= date.today():
                active_exceptions.append(ex)
        
        employee_exceptions[emp.id] = active_exceptions
    
    # Get branches
    branches = db.query(models.Branch).all()
    branch_map = {b.name: b.id for b in branches}
    
    # Track shifts per employee
    shift_counts = {emp.id: 0 for emp in employees}
    working_today = set()
    
    assignments_created = 0
    uncovered_shifts = 0
    
    # Generate schedule for each day
    for day_idx, day in enumerate(days_of_week):
        date_obj = week_dates[day_idx]
        working_today = set()
        
        day_requirements = SHIFT_REQUIREMENTS.copy()
        
        for req in day_requirements:
            candidates = []
            
            for emp in employees:
                # Check if employee is already working today
                if emp.id in working_today:
                    continue
                
                # Check for active exceptions
                exceptions = employee_exceptions.get(emp.id, [])
                has_active_exception = False
                reduced_hours = None
                is_sick_or_leave = False
                
                for ex in exceptions:
                    # If exception is active during this week
                    if ex.start_date <= date_obj <= (ex.end_date or date_obj):
                        has_active_exception = True
                        if ex.reduced_hours_per_week:
                            reduced_hours = ex.reduced_hours_per_week
                        # Check if sick or leave
                        if ex.exception_type in ["SICK", "LEAVE"]:
                            is_sick_or_leave = True
                            break
                
                # Skip if employee is on sick or leave
                if is_sick_or_leave:
                    continue
                
                # Check shift count limit (respect reduced hours)
                max_shifts = 5
                if reduced_hours:
                    # Calculate max shifts based on reduced hours (assuming 8-hour shifts)
                    max_shifts = int(reduced_hours / 8)
                    if max_shifts < 1:
                        max_shifts = 1
                
                if shift_counts[emp.id] >= max_shifts:
                    continue
                
                # Check employee preferences
                pref = EMPLOYEE_PREFERENCES.get(emp.name, {})
                
                # Check for off days
                if pref.get("off_days") and day in pref["off_days"]:
                    continue
                
                # Check role match
                if emp.job_title.lower() != req["role"].lower():
                    continue
                
                candidates.append(emp)
            
            if candidates:
                # Sort by fewest shifts (fairness)
                candidates.sort(key=lambda e: shift_counts[e.id])
                chosen = candidates[0]
                
                # Create assignment
                assignment = models.RosterAssignment(
                    user_id=chosen.id,
                    branch_id=branch_map.get(req["branch"]),
                    date=date_obj,
                    start_time=req["start"],
                    end_time=req["end"]
                )
                db.add(assignment)
                
                shift_counts[chosen.id] += 1
                working_today.add(chosen.id)
                assignments_created += 1
            else:
                uncovered_shifts += 1
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Roster generated! {assignments_created} shifts assigned. {uncovered_shifts} shifts uncovered.",
        "assignments": assignments_created,
        "uncovered": uncovered_shifts
    }