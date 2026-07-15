"""
Seed script to populate test data for Zing Smart Scheduler
Run this once to create a complete test environment
"""

import supabase_db as db
from datetime import date, timedelta
import uuid


def seed_test_data():
    """Create complete test dataset"""
    
    print("\n🌱 Starting data seeding...\n")
    
    # 1. Create Organization
    print("📦 Creating organization...")
    org_data = {
        "name": "Test Pharmacy Chain",
        "industry": "Healthcare",
        "plan_type": "pro"
    }
    org = db.create_organization(org_data)
    org_id = org['id']
    print(f"  ✓ Created organization: {org['name']} (ID: {org_id})\n")
    
    # 2. Create Locations
    print("📍 Creating locations...")
    locations = []
    location_names = ["Main Street Pharmacy", "Mall Branch", "Hospital Pharmacy", "Airport Kiosk"]
    
    for name in location_names:
        loc_data = {
            "organization_id": org_id,
            "name": name,
            "address": f"{name} Address",
            "timezone": "Africa/Nairobi"
        }
        loc = db.create_location(loc_data)
        locations.append(loc)
        print(f"  ✓ Created location: {loc['name']}")
    
    print()
    
    # 3. Create Roles
    print("👔 Creating roles...")
    roles = []
    role_data_list = [
        {"name": "Senior Pharmacist", "description": "Licensed senior pharmacist", "max_hours_per_week": 45},
        {"name": "Junior Pharmacist", "description": "Licensed junior pharmacist", "max_hours_per_week": 40},
        {"name": "Pharmacy Technician", "description": "Certified pharmacy technician", "max_hours_per_week": 40},
        {"name": "Cashier", "description": "Front desk cashier", "max_hours_per_week": 35},
        {"name": "Store Manager", "description": "Branch manager", "max_hours_per_week": 50}
    ]
    
    for role_data in role_data_list:
        role_data["organization_id"] = org_id
        role = db.create_role(role_data)
        roles.append(role)
        print(f"  ✓ Created role: {role['name']}")
    
    print()
    
    # 4. Create Employees
    print("👥 Creating employees...")
    employees = []
    employee_data_list = [
        {"name": "Alice Johnson", "email": "alice@test.com", "job_title": "Senior Pharmacist", "phone": "0711111111"},
        {"name": "Bob Smith", "email": "bob@test.com", "job_title": "Junior Pharmacist", "phone": "0722222222"},
        {"name": "Carol Williams", "email": "carol@test.com", "job_title": "Pharmacy Technician", "phone": "0733333333"},
        {"name": "David Brown", "email": "david@test.com", "job_title": "Senior Pharmacist", "phone": "0744444444"},
        {"name": "Eva Davis", "email": "eva@test.com", "job_title": "Pharmacy Technician", "phone": "0755555555"},
        {"name": "Frank Miller", "email": "frank@test.com", "job_title": "Cashier", "phone": "0766666666"},
        {"name": "Grace Wilson", "email": "grace@test.com", "job_title": "Store Manager", "phone": "0777777777"},
        {"name": "Henry Moore", "email": "henry@test.com", "job_title": "Junior Pharmacist", "phone": "0788888888"},
        {"name": "Ivy Taylor", "email": "ivy@test.com", "job_title": "Pharmacy Technician", "phone": "0799999999"},
        {"name": "Jack Anderson", "email": "jack@test.com", "job_title": "Cashier", "phone": "0700000000"}
    ]
    
    import hashlib
    import random
    import string
    
    for i, emp_data in enumerate(employee_data_list):
        # Find matching role
        role = next((r for r in roles if r['name'] == emp_data['job_title']), roles[0])
        
        # Generate employee ID
        emp_id = f"EMP-{i+1:03d}"
        
        # Generate temporary password
        temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
        hashed_password = hashlib.sha256(temp_password.encode()).hexdigest()
        
        user_data = {
            "employee_id": emp_id,
            "name": emp_data['name'],
            "email": emp_data['email'],
            "hashed_password": hashed_password,
            "role": "EMPLOYEE",
            "job_title": emp_data['job_title'],
            "phone_number": emp_data['phone'],
            "max_hours_per_week": role['max_hours_per_week'],
            "is_active": True,
            "organization_id": org_id,
            "role_id": role['id']
        }
        
        emp = db.create_user(user_data)
        employees.append(emp)
        print(f"  ✓ Created employee: {emp['name']} ({emp['employee_id']}) - Password: {temp_password}")
    
    print()
    
    # 5. Create Shift Requirements
    print("⏰ Creating shift requirements...")
    
    # Define shift patterns for each location
    shift_patterns = [
        # Morning shift: 8 AM - 4 PM
        {"start_time": "08:00:00", "end_time": "16:00:00"},
        # Afternoon shift: 12 PM - 8 PM
        {"start_time": "12:00:00", "end_time": "20:00:00"},
        # Evening shift: 4 PM - 10 PM
        {"start_time": "16:00:00", "end_time": "22:00:00"}
    ]
    
    requirement_count = 0
    
    # For each location, create requirements for each day of the week
    for location in locations:
        for day in range(1, 8):  # 1=Monday, 7=Sunday
            # Each location needs different roles at different times
            for shift in shift_patterns:
                # Morning: Need 1 pharmacist, 1 technician
                if shift["start_time"] == "08:00:00":
                    # Pharmacist
                    req_data = {
                        "organization_id": org_id,
                        "location_id": location['id'],
                        "role_id": roles[0]['id'],  # Senior Pharmacist
                        "day_of_week": day,
                        "start_time": shift["start_time"],
                        "end_time": shift["end_time"],
                        "quantity": 1,
                        "is_active": True
                    }
                    db.create_shift_requirement(req_data)
                    requirement_count += 1
                    
                    # Technician
                    req_data["role_id"] = roles[2]['id']  # Technician
                    db.create_shift_requirement(req_data)
                    requirement_count += 1
                
                # Afternoon: Need 1 junior pharmacist, 1 cashier
                elif shift["start_time"] == "12:00:00":
                    req_data = {
                        "organization_id": org_id,
                        "location_id": location['id'],
                        "role_id": roles[1]['id'],  # Junior Pharmacist
                        "day_of_week": day,
                        "start_time": shift["start_time"],
                        "end_time": shift["end_time"],
                        "quantity": 1,
                        "is_active": True
                    }
                    db.create_shift_requirement(req_data)
                    requirement_count += 1
                    
                    # Cashier
                    req_data["role_id"] = roles[3]['id']  # Cashier
                    db.create_shift_requirement(req_data)
                    requirement_count += 1
                
                # Evening: Need 1 pharmacist
                elif shift["start_time"] == "16:00:00":
                    req_data = {
                        "organization_id": org_id,
                        "location_id": location['id'],
                        "role_id": roles[0]['id'],  # Senior Pharmacist
                        "day_of_week": day,
                        "start_time": shift["start_time"],
                        "end_time": shift["end_time"],
                        "quantity": 1,
                        "is_active": True
                    }
                    db.create_shift_requirement(req_data)
                    requirement_count += 1
    
    print(f"  ✓ Created {requirement_count} shift requirements\n")
    
    # 6. Create Employee Availability (optional)
    print("📅 Creating employee availability...")
    avail_count = 0
    
    for emp in employees[:5]:  # First 5 employees have defined availability
        # Available Monday-Friday, 8 AM - 8 PM
        for day in range(1, 6):
            avail_data = {
                "user_id": emp['id'],
                "organization_id": org_id,
                "day_of_week": day,
                "start_time": "08:00:00",
                "end_time": "20:00:00",
                "is_preferred": True
            }
            db.supabase.table("employee_availability").insert(avail_data).execute()
            avail_count += 1
    
    print(f"  ✓ Created {avail_count} availability records\n")
    
    # 7. Create Skills (optional)
    print("🎓 Creating skills...")
    skills = []
    skill_names = [
        "Controlled Substances License",
        "Immunization Certified",
        "Compounding Certified",
        "Customer Service Excellence",
        "Inventory Management"
    ]
    
    for skill_name in skill_names:
        skill_data = {
            "organization_id": org_id,
            "name": skill_name,
            "description": f"{skill_name} certification"
        }
        skill = db.create_skill(skill_data)
        skills.append(skill)
        print(f"  ✓ Created skill: {skill['name']}")
    
    print()
    
    # Summary
    print("=" * 60)
    print("✅ SEEDING COMPLETE!")
    print("=" * 60)
    print(f"Organization ID: {org_id}")
    print(f"Locations: {len(locations)}")
    print(f"Roles: {len(roles)}")
    print(f"Employees: {len(employees)}")
    print(f"Shift Requirements: {requirement_count}")
    print(f"Availability Records: {avail_count}")
    print(f"Skills: {len(skills)}")
    print("=" * 60)
    print("\n🚀 You can now test the smart scheduler!")
    print(f"   Use organization_id: {org_id}")
    print("\n")


if __name__ == "__main__":
    seed_test_data()