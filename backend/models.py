from sqlalchemy import Column, Integer, String, Date, Boolean, Float, Text, ForeignKey
from datetime import date
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)  # "ADMIN" or "EMPLOYEE"
    job_title = Column(String)
    
    is_active = Column(Boolean, default=True)
    hire_date = Column(Date, nullable=True)
    phone_number = Column(String, nullable=True)
    max_hours_per_week = Column(Float, default=45.0)
    has_medical_restriction = Column(Boolean, default=False)
    medical_restriction_notes = Column(Text, nullable=True)
    is_locum = Column(Boolean, default=False)
    
    assignments = relationship("RosterAssignment", back_populates="user")

class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    location = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    
    assignments = relationship("RosterAssignment", back_populates="branch")

class RosterAssignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    branch_id = Column(Integer, ForeignKey("branches.id"))
    date = Column(Date)
    start_time = Column(String)
    end_time = Column(String)
    is_locum = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    
    user = relationship("User", back_populates="assignments")
    branch = relationship("Branch", back_populates="assignments")

class EmployeeException(Base):
    __tablename__ = "employee_exceptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    exception_type = Column(String)  # "SICK", "PREGNANCY", "LEAVE", "PART_TIME"
    start_date = Column(Date)
    end_date = Column(Date, nullable=True)
    reduced_hours_per_week = Column(Float, nullable=True)  # e.g., 25.0 for pregnant
    notes = Column(Text, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(Date)
    is_active = Column(Boolean, default=True)
    
    user = relationship("User", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approved_by])

class SchedulerLog(Base):
    __tablename__ = "scheduler_logs"

    id = Column(Integer, primary_key=True, index=True)
    run_date = Column(Date)
    status = Column(String)  # "success" or "error"
    message = Column(Text)
    assignments_created = Column(Integer, default=0)
    uncovered_shifts = Column(Integer, default=0)
    created_at = Column(Date, default=date.today)

class ShiftSwapRequest(Base):
    __tablename__ = "shift_swap_requests"

    id = Column(Integer, primary_key=True, index=True)
    requesting_user_id = Column(Integer, ForeignKey("users.id"))
    target_user_id = Column(Integer, ForeignKey("users.id"))
    assignment_id = Column(Integer, ForeignKey("assignments.id"))
    target_assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=True)
    status = Column(String, default="PENDING")  # PENDING, APPROVED, REJECTED, CANCELLED
    request_date = Column(Date, default=date.today)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    requesting_user = relationship("User", foreign_keys=[requesting_user_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
    assignment = relationship("RosterAssignment", foreign_keys=[assignment_id])
    target_assignment = relationship("RosterAssignment", foreign_keys=[target_assignment_id])
    approver = relationship("User", foreign_keys=[approved_by])

class TimeOffRequest(Base):
    __tablename__ = "time_off_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    start_date = Column(Date)
    end_date = Column(Date)
    reason = Column(String)  # VACATION, SICK, PERSONAL, OTHER
    status = Column(String, default="PENDING")  # PENDING, APPROVED, REJECTED
    notes = Column(Text, nullable=True)
    request_date = Column(Date, default=date.today)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_date = Column(Date, nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approved_by])