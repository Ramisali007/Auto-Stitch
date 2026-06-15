import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageSquare, X, Send, Minus, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import API_URL from '../../config/api';
import './Chatbot.css';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm Stitchie, your fashion assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const { data } = await axios.post(`${API_URL}/api/chatbot`, { message: input });
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        throw new Error('Failed to get reply');
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having a bit of trouble connecting. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <motion.button
        drag
        dragConstraints={{ left: -window.innerWidth + 80, right: 0, top: -window.innerHeight + 80, bottom: 0 }}
        dragElastic={0.1}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9, cursor: 'grabbing' }}
        className="chatbot-toggle"
        onClick={() => setIsOpen(true)}
        style={{ cursor: 'grab', touchAction: 'none' }}
      >
        <MessageSquare size={24} />
        <span className="toggle-badge">AI</span>
      </motion.button>
    );
  }

  return (
    <div className={`chatbot-window ${isMinimized ? 'minimized' : ''}`}>
      <header className="chatbot-header">
        <div className="header-info">
          <div className="bot-avatar">
            <Sparkles size={18} fill="currentColor" />
          </div>
          <div>
            <h3>Stitchie</h3>
            <p>AI Couture Assistant</p>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={() => setIsMinimized(!isMinimized)}><Minus size={18} /></button>
          <button onClick={() => setIsOpen(false)}><X size={18} /></button>
        </div>
      </header>

      {!isMinimized && (
        <>
          <div className="chatbot-messages" ref={scrollRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                <div className="bubble-content">
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chat-bubble assistant">
                <div className="bubble-content typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
          </div>

          <form className="chatbot-input" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" disabled={!input.trim() || isLoading}>
              <Send size={18} />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
