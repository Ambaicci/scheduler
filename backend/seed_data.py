from database import SessionLocal, Base, engine
import models
import hashlib
from datetime import date

# Create tables (this will now include the new EmployeeException table)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Clear existing data
db.query(models.RosterAssignment).delete()
db.query(models.EmployeeException).delete()
db.query(models.User).delete()
db.query(models.Branch).delete()
db.commit()

# Create branches
branches = [
    models.Branch(name="Mumias Retail", location="Mumias Town"),
    models.Branch(name="Mumias Wholesale", location="Mumias Town"),
    models.Branch(name="Sabatia Retail", location="Sabatia"),
    models.Branch(name="Navakholo", location="Navakholo"),
]

for branch in branches:
    db.add(branch)
db.commit()

# Create admin
admin_password = hashlib.sha256("admin123".encode()).hexdigest()
admin = models.User(
    employee_id="CHEBU-ADMIN-001",
    name="Admin User",
    email="admin@coffeesoft.com",
    hashed_password=admin_password,
    role="ADMIN",
    job_title="Administrator",
    is_active=True,
    hire_date=date(2024, 1, 1),
    max_hours_per_week=45.0,
)
db.add(admin)
db.flush()

# Create employees
employees_data = [
    {"name": "Dr. Kevin Ambani", "email": "kevin@coffeesoft.com", "job_title": "Pharmacist"},
    {"name": "Billy Kipsang", "email": "billy@coffeesoft.com", "job_title": "Technician"},
    {"name": "Michelle Yego", "email": "michelle@coffeesoft.com", "job_title": "Pharmacist"},
    {"name": "Zubeda Aseto", "email": "zubeda@coffeesoft.com", "job_title": "Technician"},
    {"name": "Onyunka Oyiengo", "email": "onyunka@coffeesoft.com", "job_title": "Technician"},
    {"name": "Martha Shimenga", "email": "martha@coffeesoft.com", "job_title": "Pharmacist"},
    {"name": "Dr. Koech Frankline", "email": "koech@coffeesoft.com", "job_title": "Pharmacist"},
]

for i, emp in enumerate(employees_data, start=1):
    password = hashlib.sha256("employee123".encode()).hexdigest()
    employee_id = f"CHEBU-{i:03d}"
    
    user = models.User(
        employee_id=employee_id,
        name=emp["name"],
        email=emp["email"],
        hashed_password=password,
        role="EMPLOYEE",
        job_title=emp["job_title"],
        is_active=True,
        hire_date=date(2024, 1, 1),
        max_hours_per_week=45.0,
    )
    db.add(user)

db.commit()

# Add sample exceptions for demonstration
# Example: Pregnant employee with reduced hours
kevin = db.query(models.User).filter(models.User.email == "kevin@coffeesoft.com").first()
if kevin:
    exception = models.EmployeeException(
        user_id=kevin.id,
        exception_type="PREGNANCY",
        start_date=date(2026, 7, 1),
        end_date=date(2026, 12, 31),
        reduced_hours_per_week=25.0,
        notes="Medical restriction - reduced hours",
        approved_by=admin.id,
        created_at=date.today(),
        is_active=True
    )
    db.add(exception)

db.commit()
db.close()

print("✅ Database seeded successfully!")
print("👤 Admin: admin@coffeesoft.com / admin123")
print("👤 Employees: [email] / employee123")
print("🏢 Branches: Mumias Retail, Mumias Wholesale, Sabatia Retail, Navakholo")
print("📋 Sample exception: Kevin Ambani - PREGNANCY (25 hours/week)")