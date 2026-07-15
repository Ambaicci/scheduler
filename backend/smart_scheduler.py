"""
Zing Smart Scheduling Engine - Phase 1: DEBUG VERSION
Shows exactly why employees are being rejected
"""

from datetime import date, timedelta, datetime
from typing import List, Dict, Optional
import supabase_db as db


class SmartScheduler:
    """Debug version of universal scheduling engine"""
    
    def __init__(self, organization_id: str):
        self.organization_id = organization_id
        self.uncovered_shifts = []
        self.assignments_created = 0
        
    def generate_schedule(
        self, 
        start_date: date, 
        end_date: date,
        rotation_type: str = "none"
    ) -> Dict:
        """Generate schedule with debug output"""
        print(f"\n🚀 Starting schedule generation for org {self.organization_id}")
        print(f"📅 Date range: {start_date} to {end_date}")
        
        # Step 1: Load ALL data ONCE
        print("\n📊 Loading all data...")
        data = self._load_all_data()
        
        if not data['employees']:
            return {"status": "error", "message": "No active employees found"}
        
        if not data['shift_requirements']:
            return {"status": "error", "message": "No shift requirements defined"}
        
        print(f"  ✓ Loaded {len(data['employees'])} employees")
        print(f"  ✓ Loaded {len(data['shift_requirements'])} requirements")
        
        # Step 2: Clear existing assignments
        print(f"\n🗑️  Clearing existing assignments...")
        self._clear_existing_assignments(start_date, end_date)
        
        # Step 3: Generate schedule (just first day for debugging)
        print(f"\n🧠 Generating schedule for {start_date} only...")
        day_of_week = start_date.isoweekday()
        
        day_requirements = [
            req for req in data['shift_requirements']
            if req['day_of_week'] == day_of_week
        ]
        
        print(f"  Found {len(day_requirements)} requirements for {start_date}\n")
        
        # Schedule each requirement
        for i, req in enumerate(day_requirements[:5]):  # Only first 5 for debugging
            print(f"\n{'='*60}")
            print(f"REQUIREMENT {i+1}: {req['start_time']}-{req['end_time']}")
            print(f"{'='*60}")
            self._schedule_requirement(req, start_date, data)
        
        # Step 4: Return report
        return {
            "status": "success",
            "message": f"Debug complete! {self.assignments_created} shifts assigned, {len(self.uncovered_shifts)} uncovered.",
            "assignments_created": self.assignments_created,
            "uncovered_count": len(self.uncovered_shifts)
        }
    
    def _load_all_data(self) -> Dict:
        """Load ALL data in minimal queries"""
        
        # 1. Load employees
        employees = db.supabase.table("users").select("*").eq(
            "organization_id", self.organization_id
        ).eq("is_active", True).execute().data or []
        
        # 2. Load all assignments for these employees
        employee_ids = [e['id'] for e in employees]
        existing_assignments = []
        if employee_ids:
            existing_assignments = db.supabase.table("assignments").select("*").in_(
                "user_id", employee_ids
            ).execute().data or []
        
        # 3. Load all availability
        availability = db.supabase.table("employee_availability").select("*").eq(
            "organization_id", self.organization_id
        ).execute().data or []
        
        # 4. Load all unavailability
        unavailability = db.supabase.table("employee_unavailability").select("*").eq(
            "organization_id", self.organization_id
        ).execute().data or []
        
        # 5. Load shift requirements
        shift_requirements = db.get_shift_requirements(self.organization_id)
        
        # 6. Load roles
        roles = db.get_all_roles(self.organization_id)
        
        # Build lookup dictionaries
        availability_by_user = {}
        for avail in availability:
            user_id = avail['user_id']
            if user_id not in availability_by_user:
                availability_by_user[user_id] = []
            availability_by_user[user_id].append(avail)
        
        unavailability_by_user = {}
        for unavail in unavailability:
            user_id = unavail['user_id']
            if user_id not in unavailability_by_user:
                unavailability_by_user[user_id] = []
            unavailability_by_user[user_id].append(unavail)
        
        assignments_by_user = {}
        for assignment in existing_assignments:
            user_id = assignment['user_id']
            if user_id not in assignments_by_user:
                assignments_by_user[user_id] = []
            assignments_by_user[user_id].append(assignment)
        
        roles_by_id = {r['id']: r for r in roles}
        
        return {
            'employees': employees,
            'shift_requirements': shift_requirements,
            'existing_assignments': existing_assignments,
            'availability_by_user': availability_by_user,
            'unavailability_by_user': unavailability_by_user,
            'assignments_by_user': assignments_by_user,
            'roles_by_id': roles_by_id
        }
    
    def _clear_existing_assignments(self, start_date: date, end_date: date):
        """Clear existing assignments in date range"""
        db.supabase.table("assignments").delete().eq(
            "organization_id", self.organization_id
        ).gte("date", start_date.isoformat()).lte("date", end_date.isoformat()).execute()
    
    def _schedule_requirement(self, requirement: Dict, schedule_date: date, data: Dict):
        """Schedule a single requirement with debug output"""
        quantity_needed = requirement.get('quantity', 1)
        
        for i in range(quantity_needed):
            candidate = self._find_best_candidate(requirement, schedule_date, data)
            
            if candidate:
                assignment_data = {
                    "organization_id": self.organization_id,
                    "user_id": candidate['id'],
                    "location_id": requirement['location_id'],
                    "date": schedule_date.isoformat(),
                    "start_time": requirement['start_time'],
                    "end_time": requirement['end_time'],
                    "role_id": requirement.get('role_id'),
                    "status": "SCHEDULED"
                }
                
                db.supabase.table("assignments").insert(assignment_data).execute()
                self.assignments_created += 1
                print(f"  ✅ ASSIGNED: {candidate['name']}")
                
                if candidate['id'] not in data['assignments_by_user']:
                    data['assignments_by_user'][candidate['id']] = []
                data['assignments_by_user'][candidate['id']].append(assignment_data)
            else:
                self.uncovered_shifts.append({
                    "date": schedule_date.isoformat(),
                    "location_id": requirement['location_id'],
                    "start_time": requirement['start_time'],
                    "end_time": requirement['end_time']
                })
    
    def _find_best_candidate(self, requirement: Dict, schedule_date: date, data: Dict) -> Optional[Dict]:
        """Find best candidate with detailed debug output"""
        candidates = []
        day_of_week = schedule_date.isoweekday()
        
        print(f"\n🔍 Checking {len(data['employees'])} employees for {requirement['start_time']}-{requirement['end_time']}")
        
        for emp in data['employees']:
            emp_id = emp['id']
            emp_name = emp['name']
            
            # Check 1: Unavailable?
            if self._is_unavailable(emp_id, schedule_date, data):
                print(f"  ✗ {emp_name} - UNAVAILABLE on {schedule_date}")
                continue
            
            # Check 2: Available at time?
            avail_check = self._is_available_at_time(emp_id, schedule_date, requirement, data)
            if not avail_check:
                print(f"  ✗ {emp_name} - NOT AVAILABLE at {requirement['start_time']}-{requirement['end_time']}")
                continue
            
            # Check 3: Would exceed max hours?
            if self._would_exceed_max_hours(emp_id, schedule_date, requirement, data):
                print(f"  ✗ {emp_name} - WOULD EXCEED MAX HOURS")
                continue
            
            # Check 4: Already working this day?
            if self._is_already_working(emp_id, schedule_date, data):
                print(f"  ✗ {emp_name} - ALREADY WORKING on {schedule_date}")
                continue
            
            print(f"  ✓ {emp_name} - PASSED ALL CHECKS")
            candidates.append(emp)
        
        if not candidates:
            print(f"  ❌ NO CANDIDATES FOUND")
            return None
        
        candidates.sort(key=lambda e: len(data['assignments_by_user'].get(e['id'], [])))
        print(f"  🎯 Selected: {candidates[0]['name']}")
        return candidates[0]
    
    def _is_unavailable(self, user_id: int, check_date: date, data: Dict) -> bool:
        """Check unavailability"""
        unavail_list = data['unavailability_by_user'].get(user_id, [])
        for unavail in unavail_list:
            unavail_start = date.fromisoformat(unavail['start_date'])
            unavail_end = date.fromisoformat(unavail['end_date'])
            if unavail_start <= check_date <= unavail_end:
                return True
        return False
    
    def _is_available_at_time(self, user_id: int, check_date: date, requirement: Dict, data: Dict) -> bool:
        """Check time availability"""
        avail_list = data['availability_by_user'].get(user_id, [])
        
        if not avail_list:
            return True
        
        day_of_week = check_date.isoweekday()
        req_start = requirement['start_time']
        req_end = requirement['end_time']
        
        for avail in avail_list:
            if avail['day_of_week'] == day_of_week:
                if avail['start_time'] <= req_start and avail['end_time'] >= req_end:
                    return True
        return False
    
    def _would_exceed_max_hours(self, user_id: int, check_date: date, requirement: Dict, data: Dict) -> bool:
        """Check max hours"""
        emp = next((e for e in data['employees'] if e['id'] == user_id), None)
        if not emp:
            return True
        
        role = data['roles_by_id'].get(emp.get('role_id'))
        max_hours = role['max_hours_per_week'] if role else 40
        
        week_start = check_date - timedelta(days=check_date.weekday())
        week_end = week_start + timedelta(days=6)
        
        assignments = data['assignments_by_user'].get(user_id, [])
        total_hours = 0
        for assignment in assignments:
            try:
                assign_date = date.fromisoformat(assignment['date'])
                if week_start <= assign_date <= week_end:
                    start = datetime.strptime(assignment['start_time'][:8], '%H:%M:%S')
                    end = datetime.strptime(assignment['end_time'][:8], '%H:%M:%S')
                    hours = (end - start).seconds / 3600
                    total_hours += hours
            except:
                pass
        
        new_start = datetime.strptime(requirement['start_time'][:8], '%H:%M:%S')
        new_end = datetime.strptime(requirement['end_time'][:8], '%H:%M:%S')
        new_hours = (new_end - new_start).seconds / 3600
        
        return (total_hours + new_hours) > max_hours
    
    def _is_already_working(self, user_id: int, check_date: date, data: Dict) -> bool:
        """Check if already working"""
        assignments = data['assignments_by_user'].get(user_id, [])
        for assignment in assignments:
            if assignment['date'] == check_date.isoformat():
                return True
        return False


def generate_smart_schedule(organization_id: str, start_date: str, end_date: str, rotation_type: str = "none"):
    """API wrapper"""
    scheduler = SmartScheduler(organization_id)
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)
    return scheduler.generate_schedule(start, end, rotation_type)