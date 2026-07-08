from datetime import date, timedelta
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

def generate_weekly_roster(supabase_client):
    """Generate a weekly roster using Supabase"""
    
    # Clear old roster
    supabase_client.table("assignments").delete().neq("id", 0).execute()
    
    # Calculate week dates (Monday to Saturday)
    today = date.today()
    monday = today + timedelta(days=(7 - today.weekday()) % 7)
    week_dates = [monday + timedelta(days=i) for i in range(6)]
    days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    # Get active employees
    result = supabase_client.table("users").select("*").eq("role", "EMPLOYEE").eq("is_active", True).execute()
    employees = result.data if result.data else []
    
    if not employees:
        return {"status": "error", "message": "No active employees found"}
    
    # Get branches
    result = supabase_client.table("branches").select("*").execute()
    branches = result.data if result.data else []
    branch_map = {b['name']: b['id'] for b in branches}
    
    # Get active exceptions
    result = supabase_client.table("employee_exceptions").select("*").eq("is_active", True).execute()
    exceptions = result.data if result.data else []
    
    # Build exception lookup
    employee_exceptions = {}
    for emp in employees:
        emp_exceptions = []
        for ex in exceptions:
            if ex['user_id'] == emp['id']:
                start_date = date.fromisoformat(ex['start_date'])
                end_date = date.fromisoformat(ex['end_date']) if ex.get('end_date') else None
                if start_date <= today and (end_date is None or end_date >= today):
                    emp_exceptions.append(ex)
        employee_exceptions[emp['id']] = emp_exceptions
    
    # Track shifts per employee
    shift_counts = {emp['id']: 0 for emp in employees}
    assignments_created = 0
    uncovered_shifts = 0
    
    # Generate schedule for each day
    for day_idx, day in enumerate(days_of_week):
        date_obj = week_dates[day_idx]
        date_str = date_obj.isoformat()
        working_today = set()
        
        for req in SHIFT_REQUIREMENTS:
            candidates = []
            
            for emp in employees:
                # Check if already working today
                if emp['id'] in working_today:
                    continue
                
                # Check for active exceptions
                exceptions = employee_exceptions.get(emp['id'], [])
                is_sick_or_leave = False
                reduced_hours = None
                
                for ex in exceptions:
                    if ex['exception_type'] in ["SICK", "LEAVE"]:
                        is_sick_or_leave = True
                        break
                    if ex.get('reduced_hours_per_week'):
                        reduced_hours = ex['reduced_hours_per_week']
                
                if is_sick_or_leave:
                    continue
                
                # Check shift count limit
                max_shifts = 5
                if reduced_hours:
                    max_shifts = int(reduced_hours / 8)
                    if max_shifts < 1:
                        max_shifts = 1
                
                if shift_counts[emp['id']] >= max_shifts:
                    continue
                
                # Check employee preferences
                pref = EMPLOYEE_PREFERENCES.get(emp['name'], {})
                
                if pref.get("off_days") and day in pref["off_days"]:
                    continue
                
                if emp['job_title'].lower() != req['role'].lower():
                    continue
                
                candidates.append(emp)
            
            if candidates:
                # Sort by fewest shifts (fairness)
                candidates.sort(key=lambda e: shift_counts[e['id']])
                chosen = candidates[0]
                
                # Create assignment
                assignment_data = {
                    "user_id": chosen['id'],
                    "branch_id": branch_map.get(req['branch']),
                    "date": date_str,
                    "start_time": req['start'],
                    "end_time": req['end'],
                    "is_locum": False
                }
                
                supabase_client.table("assignments").insert(assignment_data).execute()
                
                shift_counts[chosen['id']] += 1
                working_today.add(chosen['id'])
                assignments_created += 1
            else:
                uncovered_shifts += 1
    
    return {
        "status": "success",
        "message": f"Roster generated! {assignments_created} shifts assigned. {uncovered_shifts} shifts uncovered.",
        "assignments": assignments_created,
        "uncovered": uncovered_shifts
    }