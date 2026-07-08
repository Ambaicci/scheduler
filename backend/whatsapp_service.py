import requests
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Twilio credentials
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "your_account_sid_here")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "your_auth_token_here")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")

def send_whatsapp_message(to_number: str, message: str):
    """Send a WhatsApp message using Twilio REST API"""
    try:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
        
        # Ensure number is in WhatsApp format
        if not to_number.startswith("whatsapp:"):
            to_number = f"whatsapp:{to_number}"
        
        payload = {
            "Body": message,
            "From": TWILIO_WHATSAPP_NUMBER,
            "To": to_number
        }
        
        response = requests.post(
            url,
            data=payload,
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        )
        
        if response.status_code == 201:
            print(f"✅ WhatsApp message sent to {to_number}")
            return {"success": True, "response": response.json()}
        else:
            print(f"❌ Failed to send WhatsApp: {response.text}")
            return {"success": False, "error": response.text}
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return {"success": False, "error": str(e)}

def format_roster_message(employee_name: str, shifts: list):
    """Format a roster notification message"""
    message = f"📋 *Weekly Schedule for {employee_name}*\n\n"
    message += f"📅 Week of {datetime.now().strftime('%B %d, %Y')}\n"
    message += "─" * 30 + "\n\n"
    
    if not shifts:
        message += "🟢 *No shifts scheduled this week*"
        return message
    
    for shift in shifts:
        day = shift.get('day', 'Unknown')
        branch = shift.get('branch', 'Unknown')
        start = shift.get('start_time', '')
        end = shift.get('end_time', '')
        message += f"📌 *{day}*\n"
        message += f"   🏥 {branch}\n"
        message += f"   🕐 {start} – {end}\n\n"
    
    message += "─" * 30 + "\n"
    message += "📱 Powered by *Coffeesoft Scheduler*"
    
    return message

def format_swap_notification(requesting_user: str, target_user: str, date: str):
    """Format a swap request notification"""
    message = f"🔄 *Shift Swap Request*\n\n"
    message += f"👤 {requesting_user} wants to swap shifts with {target_user}\n"
    message += f"📅 Date: {date}\n\n"
    message += "Please check the admin portal to approve or reject this request."
    return message

def format_time_off_notification(user_name: str, start_date: str, end_date: str, reason: str):
    """Format a time off request notification"""
    message = f"📅 *Time Off Request*\n\n"
    message += f"👤 {user_name} has requested time off\n"
    message += f"📅 {start_date} → {end_date}\n"
    message += f"📌 Reason: {reason}\n\n"
    message += "Please check the admin portal to approve or reject this request."
    return message

# Test function
if __name__ == "__main__":
    # Test message formatting
    test_shifts = [
        {"day": "Monday", "branch": "Mumias Retail", "start_time": "07:00", "end_time": "16:00"},
        {"day": "Tuesday", "branch": "Sabatia Retail", "start_time": "09:00", "end_time": "21:00"},
    ]
    test_message = format_roster_message("Kevin Ambani", test_shifts)
    print("📱 Test WhatsApp Message:")
    print("─" * 50)
    print(test_message)
    print("─" * 50)
    
    # Note: To actually send, uncomment and set credentials:
    # send_whatsapp_message("+254700000000", test_message)