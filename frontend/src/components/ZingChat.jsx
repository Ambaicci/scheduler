import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, SparklesIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { API_BASE_URL } from '../config';

const ZingChat = ({ isOpen, onClose, initialContext, actionId, actionType, onActionComplete }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatBodyRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (initialContext) {
        setMessages([{ id: Date.now(), sender: 'ai', text: initialContext }]);
      } else {
        setMessages([{ id: Date.now(), sender: 'ai', text: "Good morning! I've analyzed your team's availability. How can I help you optimize the schedule today?" }]);
      }
    }
  }, [isOpen, initialContext]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { id: Date.now(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsThinking(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/zing-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput })
      });
      
      const data = await res.json();
      let aiResponse = data.response || "I'm having trouble thinking right now.";

      const lowerResponse = aiResponse.toLowerCase();
      let actionTaken = false;

      if (actionId && actionType) {
        if (lowerResponse.includes('approved') || lowerResponse.includes('action_approved')) {
          const endpoint = actionType === 'timeoff' ? `/api/time-off-request/${actionId}?status=APPROVED` : `/api/swap-request/${actionId}?status=APPROVED`;
          await fetch(`${API_BASE_URL}${endpoint}`, { method: 'PUT' });
          actionTaken = true;
        } else if (lowerResponse.includes('rejected') || lowerResponse.includes('action_rejected')) {
          const endpoint = actionType === 'timeoff' ? `/api/time-off-request/${actionId}?status=REJECTED` : `/api/swap-request/${actionId}?status=REJECTED`;
          await fetch(`${API_BASE_URL}${endpoint}`, { method: 'PUT' });
          actionTaken = true;
        }
      }

      setTimeout(() => {
        const aiMsg = { id: Date.now() + 1, sender: 'ai', text: aiResponse };
        setMessages(prev => [...prev, aiMsg]);
        setIsThinking(false);
        if (actionTaken && onActionComplete) onActionComplete();
      }, 800);

    } catch (err) {
      console.error("Chat error:", err);
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: "I'm having trouble connecting to my brain right now. Please try again." }]);
        setIsThinking(false);
      }, 800);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-z-bg w-full sm:max-w-lg h-[85vh] sm:h-[600px] sm:rounded-2xl flex flex-col shadow-2xl border border-z-border overflow-hidden animate-[slideUp_0.3s_ease-out]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-z-border/50 flex justify-between items-center bg-z-bg/80 backdrop-blur-xl relative">
          <div className="w-9 h-1 bg-z-border rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3 sm:hidden"></div>
          <div className="flex items-center gap-3 mt-2 sm:mt-0">
            <div className="w-8 h-8 bg-z-purple/20 rounded-lg flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-z-purple" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-z-text tracking-tight">Ask Zing</h2>
              <p className="text-xs text-z-text-dim font-mono">Powered by Groq AI</p>
            </div>
          </div>
          <button onClick={onClose} className="text-z-text-dim hover:text-z-text transition-colors p-1.5 bg-z-surface rounded-full border border-z-border">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Messages Area */}
        <div ref={chatBodyRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-z-page/30 no-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.sender === 'user' 
                  ? 'bg-z-blue text-white rounded-br-md' 
                  : 'bg-z-surface text-z-text border border-z-border rounded-bl-md'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-z-surface border border-z-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-z-purple animate-pulse"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-z-purple animate-pulse delay-150"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-z-purple animate-pulse delay-300"></span>
                <span className="text-xs text-z-text-faint font-mono ml-1">Zing is thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-z-border bg-z-bg">
          <div className="flex items-center gap-2 bg-z-surface border border-z-border rounded-full px-4 py-2.5 focus-within:border-z-purple focus-within:ring-1 focus-within:ring-z-purple/30 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a request or ask a question..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-z-text placeholder-z-text-faint font-body"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isThinking}
              className="w-8 h-8 rounded-full bg-z-purple text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-all"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ZingChat;