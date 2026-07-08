from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, time
import time as time_module
from database import SessionLocal
import scheduler
import models

def run_weekly_roster():
    """Function that runs every Sunday to generate the roster"""
    print(f"⏰ Running automatic roster generation... {datetime.now()}")
    
    db = SessionLocal()
    try:
        result = scheduler.generate_weekly_roster(db)
        print(f"✅ Roster generated: {result['message']}")
        
        # Log the generation
        log_entry = models.SchedulerLog(
            run_date=datetime.now().date(),
            status=result['status'],
            message=result['message'],
            assignments_created=result.get('assignments', 0),
            uncovered_shifts=result.get('uncovered', 0)
        )
        db.add(log_entry)
        db.commit()
        
        # Here you can add email/WhatsApp notifications
        print(f"📧 Notifications would be sent here")
        
    except Exception as e:
        print(f"❌ Error generating roster: {e}")
        # Log the error
        log_entry = models.SchedulerLog(
            run_date=datetime.now().date(),
            status="error",
            message=str(e),
            assignments_created=0,
            uncovered_shifts=0
        )
        db.add(log_entry)
        db.commit()
    finally:
        db.close()

def start_scheduler():
    """Start the background scheduler"""
    scheduler_instance = BackgroundScheduler()
    
    # Schedule to run every Sunday at 8:00 AM
    scheduler_instance.add_job(
        run_weekly_roster,
        trigger=CronTrigger(day_of_week='sun', hour=8, minute=0),
        id='weekly_roster_job',
        replace_existing=True
    )
    
    scheduler_instance.start()
    print("🔄 Scheduler started! Will run every Sunday at 8:00 AM")
    return scheduler_instance

# For testing - run immediately
if __name__ == "__main__":
    print("🧪 Running test generation...")
    run_weekly_roster()
    print("✅ Test complete!")