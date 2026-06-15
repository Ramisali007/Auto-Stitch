import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Send, User, Store, ArrowLeft, MoreVertical, 
  Paperclip, Smile, Image as ImageIcon, Search,
  CheckCheck, Clock, MessageSquare
} from 'lucide-react';
import API_URL from '../../config/api';
import { getSocket } from '../../utils/socket';
import './Chat.css';

export default function Chat() {
  const [searchParams] = useSearchParams();
  const boutiqueId = searchParams.get('boutiqueId');
  const boutiqueName = searchParams.get('boutiqueName');
  const customerId = searchParams.get('customerId');
  const customerName = searchParams.get('customerName');
  
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUser._id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  useEffect(() => {
    document.title = 'Messaging — Auto Stitch';
    fetchConversations();
  }, []);

  const socket = getSocket();

  useEffect(() => {
    if (socket) {
      socket.on('new_message', () => {
        fetchConversations();
      });
      return () => socket.off('new_message');
    }
  }, [socket]);

  useEffect(() => {
    if (activeChat?.otherUser?._id) {
      fetchMessages(activeChat.otherUser._id);
      
      if (activeChat.otherUser._id !== 'new' && socket) {
        const ids = [currentUserId, activeChat.otherUser._id].sort();
        const chatRoom = `chat_${ids[0]}_${ids[1]}`;
        socket.emit('join_chat', chatRoom);

        const handleReceive = (msg) => {
          setMessages(prev => {
            if (prev.find(m => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
        };

        socket.on('receive_message', handleReceive);
        return () => socket.off('receive_message', handleReceive);
      }
    }
  }, [activeChat, socket, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (loading || conversations.length === -1) return; // Wait for initial load if needed

    if (boutiqueId) {
      const existing = conversations.find(c => c.boutique?._id === boutiqueId);
      if (existing) {
        setActiveChat(existing);
      } else {
        setActiveChat({
          otherUser: { name: boutiqueName || 'Boutique', _id: 'new' },
          boutique: { _id: boutiqueId, name: boutiqueName }
        });
      }
    } else if (customerId) {
      const existing = conversations.find(c => c.otherUser?._id === customerId);
      if (existing) {
        setActiveChat(existing);
      } else {
        setActiveChat({
          otherUser: { name: customerName || 'Customer', _id: 'new' }
        });
      }
    } else if (conversations.length > 0 && !activeChat) {
      setActiveChat(conversations[0]);
    }
  }, [boutiqueId, customerId, conversations, loading]);

  const fetchConversations = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/messages/conversations`, { withCredentials: true });
      setConversations(data.data);
    } catch (err) {
      console.error('Fetch conversations error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (otherUserId) => {
    if (otherUserId === 'new') {
      setMessages([]);
      return;
    }
    try {
      const { data } = await axios.get(`${API_URL}/api/messages/${otherUserId}`, { withCredentials: true });
      setMessages(data.data);
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const ownerId = searchParams.get('ownerId');
    const customerIdParam = searchParams.get('customerId');
    const activeOtherUserId = typeof activeChat.otherUser === 'string' ? activeChat.otherUser : activeChat.otherUser?._id;
    const receiverId = activeOtherUserId === 'new' ? (ownerId || customerIdParam) : activeOtherUserId;

    if (!receiverId || receiverId === 'undefined') {
      alert('Cannot send message: Recipient ID is missing or invalid.');
      return;
    }

    try {
      const { data } = await axios.post(`${API_URL}/api/messages`, {
        receiverId: receiverId,
        boutiqueId: activeChat.boutique?._id,
        content: newMessage
      }, { withCredentials: true });

      setMessages([...messages, data.data]);
      setNewMessage('');
      if (activeChat.otherUser._id === 'new') {
        fetchConversations(); // Refresh to get real IDs
      }
    } catch (err) {
      console.error('Send message error:', err);
      alert(err.response?.data?.message || 'Failed to send message. Please try again.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;
    
    setUploadingFile(true);
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const uploadRes = await axios.post(`${API_URL}/api/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (uploadRes.data.success) {
        const attachmentUrl = uploadRes.data.url;
        await sendAttachment(attachmentUrl);
      }
    } catch (err) {
      alert('Failed to upload image');
    } finally {
      setUploadingFile(false);
      e.target.value = ''; // Reset input
    }
  };

  const sendAttachment = async (attachmentUrl) => {
    const ownerId = searchParams.get('ownerId');
    const customerIdParam = searchParams.get('customerId');
    const activeOtherUserId = typeof activeChat.otherUser === 'string' ? activeChat.otherUser : activeChat.otherUser?._id;
    const receiverId = activeOtherUserId === 'new' ? (ownerId || customerIdParam) : activeOtherUserId;

    if (!receiverId || receiverId === 'undefined') return;

    try {
      const { data } = await axios.post(`${API_URL}/api/messages`, {
        receiverId: receiverId,
        boutiqueId: activeChat.boutique?._id,
        content: '📎 Attachment',
        attachment: attachmentUrl
      }, { withCredentials: true });

      setMessages(prev => [...prev, data.data]);
      if (activeChat.otherUser._id === 'new') fetchConversations();
    } catch (err) {
      alert('Failed to send attachment');
    }
  };

  const handleDeleteMessage = async (messageId, forEveryone = false) => {
    if (!window.confirm(`Are you sure you want to delete this message${forEveryone ? ' for everyone' : ''}?`)) return;
    try {
      await axios.delete(`${API_URL}/api/messages/${messageId}`, { 
        data: { forEveryone },
        withCredentials: true 
      });
      setMessages(messages.filter(m => m._id !== messageId));
    } catch (err) {
      alert('Failed to delete message');
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeChat || !activeChat.otherUser) return;
    if (!window.confirm('Clear this entire conversation? This cannot be undone.')) return;
    try {
      const otherId = typeof activeChat.otherUser === 'string' ? activeChat.otherUser : activeChat.otherUser._id;
      await axios.delete(`${API_URL}/api/messages/conversation/${otherId}`, { withCredentials: true });
      setMessages([]);
      fetchConversations();
    } catch (err) {
      alert('Failed to clear conversation');
    }
  };


  return (
    <div className="chat-page-immersive page-enter">
      <div className="chat-container-premium glass-card">
        {/* Sidebar: Conversations */}
        <aside className="chat-sidebar-v3">
          <div className="chat-sidebar-header">
            <h2 className="chat-title-serif">Messages</h2>
            <div className="chat-search-wrap">
              <Search size={16} />
              <input type="text" placeholder="Search conversations..." />
            </div>
          </div>

          <div className="conversations-list">
            {loading ? (
              <div className="chat-loading">Loading chats...</div>
            ) : conversations.length === 0 && !boutiqueId ? (
              <div className="chat-empty-sidebar">
                <p>No messages yet</p>
              </div>
            ) : (
              <>
                {/* Temporary "New" chat if boutiqueId is provided and no conversation exists */}
                {boutiqueId && !conversations.find(c => c.boutique?._id === boutiqueId) && (
                  <button className="conv-item active">
                    <div className="conv-avatar">
                      {boutiqueName?.charAt(0) || 'B'}
                    </div>
                    <div className="conv-info">
                      <h4>{boutiqueName}</h4>
                      <p className="last-msg">Start a conversation...</p>
                    </div>
                  </button>
                )}
                {/* Temporary "New" chat if customerId is provided and no conversation exists */}
                {customerId && !conversations.find(c => c.otherUser?._id === customerId) && (
                  <button className="conv-item active">
                    <div className="conv-avatar">
                      {customerName?.charAt(0) || 'C'}
                    </div>
                    <div className="conv-info">
                      <h4>{customerName}</h4>
                      <p className="last-msg">Start a conversation...</p>
                    </div>
                  </button>
                )}
                {conversations.map(conv => (
                  <button 
                    key={conv.otherUser._id} 
                    className={`conv-item ${activeChat?.otherUser._id === conv.otherUser._id ? 'active' : ''}`}
                    onClick={() => setActiveChat(conv)}
                  >
                    <div className="conv-avatar">
                      {conv.boutique?.logo ? <img src={conv.boutique.logo} alt="" /> : conv.otherUser?.name?.charAt(0) || '?'}
                    </div>
                    <div className="conv-info">
                      <div className="conv-header">
                        <h4>{conv.boutique?.name || conv.otherUser.name}</h4>
                        <span className="conv-time">
                          {conv.lastMessage?.createdAt && new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="last-msg">{conv.lastMessage?.content}</p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="chat-main-v3">
          {activeChat ? (
            <>
              <header className="chat-header-v3">
                <div className="active-user-info">
                  <div className="active-avatar">
                    {activeChat?.boutique?.logo ? <img src={activeChat.boutique.logo} alt="" /> : activeChat?.otherUser?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3>{currentUser?.role === 'boutique_owner' ? activeChat?.otherUser?.name : (activeChat?.boutique?.name || activeChat?.otherUser?.name || 'Chat')}</h3>
                    <p className="online-status"><span className="status-dot-green"></span> Online</p>
                  </div>
                </div>
                <div className="chat-header-actions">
                  {activeChat?.boutique?._id && (
                    <Link to={`/boutiques/${activeChat.boutique._id}`} className="btn-icon-minimal" title="View Boutique">
                      <Store size={20} />
                    </Link>
                  )}
                  <button className="btn-icon-minimal" onClick={handleDeleteConversation} title="Clear Conversation">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </header>

              <div className="chat-messages-v3">
                {messages.length === 0 ? (
                  <div className="messages-empty">
                    <div className="welcome-chat">
                      <div className="welcome-icon"><Smile size={32} /></div>
                      <h4>Your conversation begins here</h4>
                      <p>Ask about modifications, fabric details, or custom timelines.</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    if (!msg) return null;
                    const msgSenderId = typeof msg.sender === 'object' ? msg?.sender?._id : msg.sender;
                    const isMine = msgSenderId === currentUserId;
                    return (
                      <div key={msg._id} className={`msg-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                        <div className="msg-bubble">
                          {msg.attachment && (
                            <div style={{ marginBottom: '8px' }}>
                              <a href={msg.attachment} target="_blank" rel="noopener noreferrer">
                                <img src={msg.attachment} alt="Attachment" style={{ maxWidth: '200px', borderRadius: '8px', cursor: 'pointer' }} />
                              </a>
                            </div>
                          )}
                          {msg.content !== '📎 Attachment' && <p>{msg.content}</p>}
                          <div className="msg-actions-hover">
                            <button className="btn-msg-del" onClick={() => handleDeleteMessage(msg._id, false)}>Delete</button>
                            {isMine && (
                              <button className="btn-msg-recall" onClick={() => handleDeleteMessage(msg._id, true)}>Recall</button>
                            )}
                          </div>
                          <span className="msg-time">
                            {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMine && <CheckCheck size={12} style={{ marginLeft: '4px' }} />}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <footer className="chat-footer-v3">
                <form className="chat-input-form" onSubmit={handleSend}>
                  <input 
                    type="file" 
                    id="chat-upload" 
                    style={{ display: 'none' }} 
                    accept="image/*"
                    onChange={handleFileUpload} 
                  />
                  <button type="button" className="btn-icon-minimal" onClick={() => document.getElementById('chat-upload').click()}>
                    <Paperclip size={20} />
                  </button>
                  <button type="button" className="btn-icon-minimal" onClick={() => document.getElementById('chat-upload').click()}>
                    <ImageIcon size={20} />
                  </button>
                  <input 
                    type="text" 
                    placeholder="Type your message..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button type="submit" className="btn-send-v3" disabled={!newMessage.trim()}>
                    <Send size={18} />
                  </button>
                </form>
              </footer>
            </>
          ) : (
            <div className="chat-welcome-screen">
              <div className="welcome-illust">
                <MessageSquare size={48} strokeWidth={1} />
              </div>
              <h2>Your Conversations</h2>
              <p>Select a boutique from the list to start discussing your bespoke modifications.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
