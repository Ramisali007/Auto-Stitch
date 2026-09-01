import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Send, User, Store, ArrowLeft, MoreVertical, 
  Paperclip, Smile, Image as ImageIcon, Search,
  CheckCheck, Clock, MessageSquare, Tag, Check, X, ShieldCheck, Upload
} from 'lucide-react';
import API_URL from '../../config/api';
import { getSocket } from '../../utils/socket';
import { playLuxuryChime } from '../../utils/audioNotification';
import './Chat.css';
import toast from 'react-hot-toast';

export default function Chat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
  const [uploadingQuoteImage, setUploadingQuoteImage] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isOtherOnline, setIsOtherOnline] = useState(true);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [boutiqueProducts, setBoutiqueProducts] = useState([]);
  const [acceptingQuoteId, setAcceptingQuoteId] = useState(null);
  
  // Quote Form
  const [quoteForm, setQuoteForm] = useState({
    description: 'Custom Bespoke Tailored Piece',
    price: '',
    timeline: '5',
    notes: 'Handcrafted luxury finish with premium threadwork.',
    image: '',
    productId: ''
  });

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUser._id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    document.title = 'Boutique Messages — Auto Stitch';
    fetchConversations();
    if (currentUser.role === 'boutique_owner') {
      fetchMyProducts();
    }
  }, []);

  const fetchMyProducts = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/products/my-products`, { withCredentials: true });
      if (data.products) setBoutiqueProducts(data.products);
    } catch (err) {
      console.error('Failed to fetch boutique products:', err);
    }
  };

  const socket = getSocket();

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (msg) => {
        fetchConversations();
        playLuxuryChime('message');
      };

      const handleUserTyping = (data) => {
        if (activeChat && (data.senderId === activeChat.otherUser?._id || data.senderId === activeChat.otherUser)) {
          setIsOtherTyping(true);
        }
      };

      const handleUserStopTyping = (data) => {
        if (activeChat && (data.senderId === activeChat.otherUser?._id || data.senderId === activeChat.otherUser)) {
          setIsOtherTyping(false);
        }
      };

      const handleStatusChange = (data) => {
        if (activeChat && (data.userId === activeChat.otherUser?._id || data.userId === activeChat.otherUser)) {
          setIsOtherOnline(data.status === 'online');
        }
      };

      socket.on('new_message', handleNewMessage);
      socket.on('user_typing', handleUserTyping);
      socket.on('user_stop_typing', handleUserStopTyping);
      socket.on('user_status_change', handleStatusChange);

      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('user_typing', handleUserTyping);
        socket.off('user_stop_typing', handleUserStopTyping);
        socket.off('user_status_change', handleStatusChange);
      };
    }
  }, [socket, activeChat]);

  useEffect(() => {
    if (activeChat?.otherUser?._id) {
      fetchMessages(activeChat.otherUser._id);
      setIsOtherTyping(false);
      
      if (activeChat.otherUser._id !== 'new' && socket) {
        const ids = [currentUserId, activeChat.otherUser._id].sort();
        const chatRoom = `chat_${ids[0]}_${ids[1]}`;
        socket.emit('join_chat', chatRoom);

        socket.emit('check_user_online', activeChat.otherUser._id, (res) => {
          if (res) setIsOtherOnline(res.isOnline);
        });

        const handleReceive = (msg) => {
          setMessages(prev => {
            const exists = prev.find(m => m._id === msg._id);
            if (exists) {
              return prev.map(m => m._id === msg._id ? msg : m);
            }
            return [...prev, msg];
          });
          playLuxuryChime('message');
        };

        socket.on('receive_message', handleReceive);
        return () => socket.off('receive_message', handleReceive);
      }
    }
  }, [activeChat, socket, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOtherTyping]);

  useEffect(() => {
    if (loading || conversations.length === -1) return;

    if (boutiqueId) {
      const existing = conversations.find(c => c.boutique?._id === boutiqueId);
      if (existing) {
        setActiveChat(existing);
      } else {
        setActiveChat({
          otherUser: { name: boutiqueName || 'Boutique Atelier', _id: 'new' },
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

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    if (socket && activeChat?.otherUser?._id && activeChat.otherUser._id !== 'new') {
      const ids = [currentUserId, activeChat.otherUser._id].sort();
      const chatRoom = `chat_${ids[0]}_${ids[1]}`;

      if (!isTyping) {
        setIsTyping(true);
        socket.emit('typing', { chatId: chatRoom, senderName: currentUser.name, senderId: currentUserId });
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socket.emit('stop_typing', { chatId: chatRoom, senderId: currentUserId });
      }, 2000);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (socket && activeChat?.otherUser?._id && activeChat.otherUser._id !== 'new') {
      const ids = [currentUserId, activeChat.otherUser._id].sort();
      const chatRoom = `chat_${ids[0]}_${ids[1]}`;
      socket.emit('stop_typing', { chatId: chatRoom, senderId: currentUserId });
      setIsTyping(false);
    }

    const ownerId = searchParams.get('ownerId');
    const customerIdParam = searchParams.get('customerId');
    const activeOtherUserId = typeof activeChat.otherUser === 'string' ? activeChat.otherUser : activeChat.otherUser?._id;
    const receiverId = activeOtherUserId === 'new' ? (ownerId || customerIdParam) : activeOtherUserId;

    if (!receiverId || receiverId === 'undefined') {
      toast.error('Recipient ID is missing or invalid.');
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
      playLuxuryChime('message');
      if (activeChat.otherUser._id === 'new') {
        fetchConversations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message.');
    }
  };

  const handleSelectProduct = (prodId) => {
    const prod = boutiqueProducts.find(p => p._id === prodId);
    if (prod) {
      setQuoteForm(prev => ({
        ...prev,
        productId: prod._id,
        description: prod.name,
        price: prod.price || '',
        image: prod.images?.[0] || '',
        notes: prod.description ? prod.description.slice(0, 80) : prev.notes
      }));
    }
  };

  const handleQuoteImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingQuoteImage(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const uploadRes = await axios.post(`${API_URL}/api/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (uploadRes.data.success) {
        setQuoteForm(prev => ({ ...prev, image: uploadRes.data.url }));
        toast.success('Garment image attached!');
      }
    } catch (err) {
      toast.error('Failed to upload garment photo');
    } finally {
      setUploadingQuoteImage(false);
    }
  };

  const handleSendQuotation = async (e) => {
    e.preventDefault();
    if (!quoteForm.price || !activeChat) return;

    const quoteContent = `🏷️ [OFFICIAL QUOTATION] ${quoteForm.description} — PKR ${Number(quoteForm.price).toLocaleString()} (${quoteForm.timeline} Days Delivery). Notes: ${quoteForm.notes}`;
    
    const ownerId = searchParams.get('ownerId');
    const customerIdParam = searchParams.get('customerId');
    const activeOtherUserId = typeof activeChat.otherUser === 'string' ? activeChat.otherUser : activeChat.otherUser?._id;
    const receiverId = activeOtherUserId === 'new' ? (ownerId || customerIdParam) : activeOtherUserId;

    try {
      const { data } = await axios.post(`${API_URL}/api/messages`, {
        receiverId: receiverId,
        boutiqueId: activeChat.boutique?._id,
        content: quoteContent,
        attachment: quoteForm.image,
        quoteData: {
          isQuote: true,
          title: quoteForm.description,
          price: Number(quoteForm.price),
          timeline: quoteForm.timeline,
          notes: quoteForm.notes,
          image: quoteForm.image,
          productId: quoteForm.productId,
          isAccepted: false
        }
      }, { withCredentials: true });

      setMessages([...messages, data.data]);
      setShowQuoteModal(false);
      toast.success('Custom quotation card sent to customer!');
      playLuxuryChime('success');
      setQuoteForm({ description: 'Custom Bespoke Tailored Piece', price: '', timeline: '5', notes: '', image: '', productId: '' });
    } catch (err) {
      toast.error('Failed to submit quote card');
    }
  };

  const handleAcceptQuote = async (messageId) => {
    try {
      setAcceptingQuoteId(messageId);
      const { data } = await axios.patch(`${API_URL}/api/messages/${messageId}/accept-quote`, {}, { withCredentials: true });

      if (data.success) {
        toast.success('Quotation Accepted! Order created successfully.');
        playLuxuryChime('success');
        setMessages(prev => prev.map(m => m._id === messageId ? data.data : m));
        navigate(`/orders/${data.order._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'This quotation has already been accepted.');
      if (activeChat?.otherUser?._id) fetchMessages(activeChat.otherUser._id);
    } finally {
      setAcceptingQuoteId(null);
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
      toast.error('Failed to upload image');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
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
      playLuxuryChime('message');
      if (activeChat.otherUser._id === 'new') fetchConversations();
    } catch (err) {
      toast.error('Failed to send attachment');
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
      toast.success('Message deleted');
    } catch (err) {
      toast.error('Failed to delete message');
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
      toast.success('Conversation cleared');
    } catch (err) {
      toast.error('Failed to clear conversation');
    }
  };

  return (
    <div className="chat-page-immersive page-enter" style={{ background: '#fff' }}>
      <div className="chat-container-premium glass-card" style={{ border: '1px solid #e5e5e5', background: '#fff' }}>
        {/* Sidebar: Conversations */}
        <aside className={`chat-sidebar-v3 ${activeChat ? 'mobile-hidden' : 'mobile-visible'}`} style={{ borderRight: '1px solid #f0f0f0', background: '#fafafa' }}>
          <div className="chat-sidebar-header" style={{ padding: '1.5rem', borderBottom: '1px solid #eee' }}>
            <h2 className="chat-title-serif" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', margin: '0 0 1rem 0' }}>Conversations</h2>
            <div className="chat-search-wrap" style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '2px', padding: '8px 12px' }}>
              <Search size={16} color="#888" />
              <input type="text" placeholder="Search conversations..." style={{ border: 'none', outline: 'none', marginLeft: '8px', fontSize: '0.85rem', width: '100%' }} />
            </div>
          </div>

          <div className="conversations-list">
            {loading ? (
              <div className="chat-loading" style={{ padding: '2rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>Loading conversations...</div>
            ) : conversations.length === 0 && !boutiqueId ? (
              <div className="chat-empty-sidebar" style={{ padding: '2rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
                <p>No active conversations yet</p>
              </div>
            ) : (
              <>
                {boutiqueId && !conversations.find(c => c.boutique?._id === boutiqueId) && (
                  <button className="conv-item active">
                    <div className="conv-avatar" style={{ background: '#1a1a2e', color: '#fff' }}>
                      {boutiqueName?.charAt(0) || 'B'}
                    </div>
                    <div className="conv-info">
                      <h4>{boutiqueName}</h4>
                      <p className="last-msg">Start a conversation...</p>
                    </div>
                  </button>
                )}
                {customerId && !conversations.find(c => c.otherUser?._id === customerId) && (
                  <button className="conv-item active">
                    <div className="conv-avatar" style={{ background: '#1a1a2e', color: '#fff' }}>
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
                    <div className="conv-avatar" style={{ background: '#1a1a2e', color: '#fff' }}>
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
        <main className={`chat-main-v3 ${!activeChat ? 'mobile-hidden' : 'mobile-visible'}`} style={{ background: '#fff' }}>
          {activeChat ? (
            <>
              <header className="chat-header-v3" style={{ borderBottom: '1px solid #eee', padding: '1rem 1.5rem', background: '#fff' }}>
                <div className="active-user-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button 
                    type="button" 
                    className="chat-back-mobile-btn" 
                    onClick={() => setActiveChat(null)}
                    title="Back to conversation list"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="active-avatar" style={{ background: '#1a1a2e', color: '#fff' }}>
                    {activeChat?.boutique?.logo ? <img src={activeChat.boutique.logo} alt="" /> : activeChat?.otherUser?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontFamily: 'Playfair Display, serif' }}>
                      {currentUser?.role === 'boutique_owner' ? activeChat?.otherUser?.name : (activeChat?.boutique?.name || activeChat?.otherUser?.name || 'Boutique')}
                    </h3>
                    <p className="online-status" style={{ margin: '2px 0 0 0', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', color: isOtherOnline ? '#16a34a' : '#888' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOtherOnline ? '#16a34a' : '#cbd5e1' }}></span>
                      {isOtherOnline ? 'Online' : 'Away'}
                    </p>
                  </div>
                </div>
                
                <div className="chat-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {currentUser?.role === 'boutique_owner' && (
                    <button
                      onClick={() => setShowQuoteModal(true)}
                      style={{
                        padding: '6px 14px', background: '#1a1a2e', color: '#fff', border: 'none',
                        fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <Tag size={13} /> Send Price Quote
                    </button>
                  )}
                  {activeChat?.boutique?._id && (
                    <Link to={`/boutiques/${activeChat.boutique._id}`} className="btn-icon-minimal" title="View Boutique Profile">
                      <Store size={18} />
                    </Link>
                  )}
                  <button className="btn-icon-minimal" onClick={handleDeleteConversation} title="Clear Conversation">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </header>

              <div className="chat-messages-v3" style={{ background: '#fafafa', padding: '1.5rem' }}>
                {messages.length === 0 ? (
                  <div className="messages-empty" style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                    <Smile size={32} style={{ marginBottom: '12px' }} />
                    <h4 style={{ margin: '0 0 4px 0', fontFamily: 'Playfair Display, serif', color: '#1a1a2e' }}>Start Your Conversation</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Ask questions about custom fittings, stitching time, or fabric choices.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    if (!msg) return null;
                    const msgSenderId = typeof msg.sender === 'object' ? msg?.sender?._id : msg.sender;
                    const isMine = msgSenderId === currentUserId;
                    const isQuotation = msg.quoteData?.isQuote || msg.content?.startsWith('🏷️ [OFFICIAL QUOTATION');
                    const isAccepted = msg.quoteData?.isAccepted || msg.content?.includes('[OFFICIAL QUOTATION ACCEPTED]');
                    const quoteImage = msg.quoteData?.image || (isQuotation && msg.attachment ? msg.attachment : '');
                    const orderId = msg.quoteData?.orderId || (msg.content?.match(/Order #([A-Z0-9]+)/)?.[1]);

                    return (
                      <div key={msg._id} className={`msg-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                        {isQuotation ? (
                          <div style={{
                            background: '#fff', border: `1px solid ${isAccepted ? '#16a34a' : '#c5a059'}`, borderRadius: '4px',
                            padding: '1.2rem', maxWidth: '380px', boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                            color: '#1a1a2e'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isAccepted ? '#16a34a' : '#c5a059', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                <ShieldCheck size={16} /> {isAccepted ? 'Quotation Accepted' : 'Official Price Quote'}
                              </span>
                              {isAccepted && (
                                <span style={{ fontSize: '0.7rem', background: '#f0fdf4', color: '#16a34a', padding: '2px 6px', fontWeight: 700, borderRadius: '2px' }}>
                                  ✓ ONE-TIME ACCEPTED
                                </span>
                              )}
                            </div>

                            {/* Specific Garment Picture */}
                            {quoteImage && (
                              <div style={{ marginBottom: '10px', borderRadius: '4px', overflow: 'hidden', maxHeight: '180px' }}>
                                <img 
                                  src={quoteImage} 
                                  alt="Custom Cloth" 
                                  style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
                                />
                              </div>
                            )}

                            <p style={{ margin: '0 0 8px 0', fontSize: '0.92rem', lineHeight: '1.4', fontWeight: 500 }}>
                              {msg.content?.replace(/^🏷️\s*\[OFFICIAL QUOTATION( ACCEPTED)?\]\s*/, '')}
                            </p>

                            {/* Status and Action Buttons */}
                            {isAccepted ? (
                              <div style={{ marginTop: '12px', padding: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px' }}>
                                <p style={{ margin: 0, color: '#16a34a', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Check size={14} /> ORDER CONFIRMED & IN STITCHING
                                </p>
                                {orderId && (
                                  <Link 
                                    to={`/orders/${typeof orderId === 'object' ? orderId._id || orderId : orderId}`}
                                    style={{ display: 'inline-block', marginTop: '6px', fontSize: '0.8rem', color: '#1a1a2e', fontWeight: 700, textDecoration: 'underline' }}
                                  >
                                    View Order #{typeof orderId === 'string' && orderId.length > 8 ? orderId.slice(-6).toUpperCase() : orderId} →
                                  </Link>
                                )}
                              </div>
                            ) : (
                              <>
                                {!isMine && currentUser.role === 'customer' ? (
                                  <button
                                    disabled={acceptingQuoteId === msg._id}
                                    onClick={() => handleAcceptQuote(msg._id)}
                                    style={{
                                      width: '100%', marginTop: '12px', padding: '12px', background: '#1a1a2e',
                                      color: '#fff', border: 'none', fontSize: '0.8rem', fontWeight: 700,
                                      textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
                                      opacity: acceptingQuoteId === msg._id ? 0.7 : 1
                                    }}
                                  >
                                    {acceptingQuoteId === msg._id ? 'Creating Order...' : 'Accept Quote & Place Order'}
                                  </button>
                                ) : (
                                  <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: '#888', fontStyle: 'italic' }}>
                                    ⏳ Waiting for customer to accept
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="msg-bubble" style={{ background: isMine ? '#1a1a2e' : '#fff', color: isMine ? '#fff' : '#1a1a2e', border: isMine ? 'none' : '1px solid #e5e5e5' }}>
                            {msg.attachment && (
                              <div style={{ marginBottom: '8px' }}>
                                <a href={msg.attachment} target="_blank" rel="noopener noreferrer">
                                  <img src={msg.attachment} alt="Attachment" style={{ maxWidth: '220px', borderRadius: '2px', cursor: 'pointer' }} />
                                </a>
                              </div>
                            )}
                            {msg.content !== '📎 Attachment' && <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>{msg.content}</p>}
                            <div className="msg-actions-hover">
                              <button className="btn-msg-del" onClick={() => handleDeleteMessage(msg._id, false)}>Delete</button>
                              {isMine && (
                                <button className="btn-msg-recall" onClick={() => handleDeleteMessage(msg._id, true)}>Recall</button>
                              )}
                            </div>
                            <span className="msg-time" style={{ color: isMine ? 'rgba(255,255,255,0.7)' : '#888' }}>
                              {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {isMine && <CheckCheck size={12} style={{ marginLeft: '4px' }} />}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Real-time Typing Indicator */}
                {isOtherTyping && (
                  <div className="msg-wrapper theirs">
                    <div className="msg-bubble" style={{ background: '#fff', border: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px' }}>
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>Typing</span>
                      <span className="typing-dots" style={{ display: 'inline-flex', gap: '3px' }}>
                        <span style={{ width: '4px', height: '4px', background: '#1a1a2e', borderRadius: '50%', animation: 'typingDot 1.4s infinite' }} />
                        <span style={{ width: '4px', height: '4px', background: '#1a1a2e', borderRadius: '50%', animation: 'typingDot 1.4s infinite 0.2s' }} />
                        <span style={{ width: '4px', height: '4px', background: '#1a1a2e', borderRadius: '50%', animation: 'typingDot 1.4s infinite 0.4s' }} />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <footer className="chat-footer-v3" style={{ background: '#fff', borderTop: '1px solid #eee', padding: '1rem 1.5rem' }}>
                <form className="chat-input-form" onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="file" 
                    id="chat-upload" 
                    style={{ display: 'none' }} 
                    accept="image/*"
                    onChange={handleFileUpload} 
                  />
                  <button type="button" className="btn-icon-minimal" onClick={() => document.getElementById('chat-upload').click()} title="Attach file">
                    <Paperclip size={18} />
                  </button>
                  <input 
                    type="text" 
                    placeholder={isOtherTyping ? 'Other person is typing...' : 'Compose your message...'} 
                    value={newMessage}
                    onChange={handleInputChange}
                    style={{ flex: 1, padding: '10px 14px', border: '1px solid #e5e5e5', outline: 'none', fontSize: '0.88rem' }}
                  />
                  <button type="submit" className="btn-send-v3" disabled={!newMessage.trim()} style={{ background: '#1a1a2e', color: '#fff', border: 'none', padding: '10px 18px', cursor: 'pointer' }}>
                    <Send size={16} />
                  </button>
                </form>
              </footer>
            </>
          ) : (
            <div className="chat-welcome-screen" style={{ textAlign: 'center', padding: '5rem 2rem', color: '#888' }}>
              <div className="welcome-illust" style={{ marginBottom: '1.5rem' }}>
                <MessageSquare size={48} strokeWidth={1} />
              </div>
              <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#1a1a2e', margin: '0 0 8px 0' }}>Message Center</h2>
              <p style={{ maxWidth: '400px', margin: '0 auto', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Select a boutique or client from the list to discuss custom tailoring orders.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* ===== SEND QUICK QUOTATION MODAL ===== */}
      {showQuoteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '20px'
        }}>
          <div style={{
            background: '#fff', maxWidth: '500px', width: '100%', padding: '2rem',
            position: 'relative', color: '#1a1a2e', border: '1px solid #e5e5e5', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <button onClick={() => setShowQuoteModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={18} />
            </button>

            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.35rem', margin: '0 0 6px 0' }}>
              Send Price Quotation
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 1.5rem 0' }}>
              Send an official quote with the exact garment picture. The customer can accept <strong>only once</strong> to place their order.
            </p>

            <form onSubmit={handleSendQuotation}>
              {/* Optional: Pick existing product design */}
              {boutiqueProducts.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                    Select from Store Catalog (Optional)
                  </label>
                  <select
                    onChange={(e) => handleSelectProduct(e.target.value)}
                    style={{ width: '100%', padding: '9px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                  >
                    <option value="">-- Or enter custom piece below --</option>
                    {boutiqueProducts.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} — PKR {p.price?.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Garment Name / Scope of Stitching
                </label>
                <input
                  type="text"
                  value={quoteForm.description}
                  onChange={(e) => setQuoteForm({ ...quoteForm, description: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Exact Garment Image Upload / URL */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Specific Garment Photo
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Image URL or upload..."
                    value={quoteForm.image}
                    onChange={(e) => setQuoteForm({ ...quoteForm, image: e.target.value })}
                    style={{ flex: 1, padding: '9px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                  <label style={{ padding: '9px 12px', background: '#f3f4f6', border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Upload size={14} />
                    <span>{uploadingQuoteImage ? 'Uploading...' : 'Upload'}</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleQuoteImageUpload} />
                  </label>
                </div>
                {quoteForm.image && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={quoteForm.image} alt="Preview" style={{ width: '48px', height: '60px', objectFit: 'cover', borderRadius: '2px', border: '1px solid #eee' }} />
                    <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>✓ Exact garment picture attached</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                    Price Quote (PKR)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 18000"
                    value={quoteForm.price}
                    onChange={(e) => setQuoteForm({ ...quoteForm, price: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                    Delivery (Days)
                  </label>
                  <input
                    type="number"
                    value={quoteForm.timeline}
                    onChange={(e) => setQuoteForm({ ...quoteForm, timeline: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Fabric & Craft Notes
                </label>
                <textarea
                  rows={2}
                  value={quoteForm.notes}
                  onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                ></textarea>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%', padding: '12px', background: '#1a1a2e', color: '#fff', border: 'none',
                  fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer'
                }}
              >
                Issue Formal Quotation Card
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


