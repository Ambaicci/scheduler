import requests
from config import GROQ_API_KEY

def ask_zing(user_message, context_data):
    """
    Universal Adapter: Talks to Groq's blazing fast REST API.
    """
    
    # 1. The System Prompt (Updated to be strictly enforce the keywords)
    system_prompt = f"""You are Zing, an expert AI scheduling assistant for a pharmacy chain.
    
    Here is the current live data from the database:
    {context_data}
    
    Instructions:
    - Answer the user's question concisely, professionally, and helpfully.
    - If the user explicitly says to "approve" a pending request, you MUST include the exact text "ACTION_APPROVED" anywhere in your response.
    - If the user explicitly says to "reject" a pending request, you MUST include the exact text "ACTION_REJECTED" anywhere in your response.
    - Do not make up data. Only use the context provided."""
    
    # 2. Groq's REST API Endpoint
    url = "https://api.groq.com/openai/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.3-70b-versatile", # One of the smartest free models available
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        "temperature": 0.7
    }
    
    # 3. Send and Get Response
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        result = response.json()
        return result["choices"][0]["message"]["content"]
        
    except Exception as e:
        return f"Error connecting to AI brain: {str(e)}"