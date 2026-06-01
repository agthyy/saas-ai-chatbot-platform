import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bot, Sparkles, MessageSquare, Calendar, Shield, LogOut, CheckCircle, 
  Trash2, Plus, Edit2, Code, ChevronRight, Settings, Users, ArrowRight,
  Eye, RefreshCw, Star, ArrowUpRight, Check, X, ShieldAlert, BarChart2,
  Palette, User, Menu, Coffee, Scissors, Stethoscope
} from 'lucide-react';

export default function App() {
  // Authentication State
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);

  // Navigation State
  const [currentView, setCurrentView] = useState('landing'); // landing, login, register, dashboard, admin, settings, slots, chats, bookings
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Business Owner States
  const [business, setBusiness] = useState(null);
  const [stats, setStats] = useState({ faqs: 0, slots: 0, bookings: 0, chats: 0 });
  const [faqs, setFaqs] = useState([]);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [previewKey, setPreviewKey] = useState(0); // to reload preview iframe

  // Admin States
  const [adminBusinesses, setAdminBusinesses] = useState([]);
  const [adminBookings, setAdminBookings] = useState([]);
  const [adminChats, setAdminChats] = useState([]);

  // Form inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBusName, setRegBusName] = useState('');
  const [regTemplate, setRegTemplate] = useState('cafe');

  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [editingFaqId, setEditingFaqId] = useState(null);

  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');

  // Settings form
  const [settingsName, setSettingsName] = useState('');
  const [settingsWelcome, setSettingsWelcome] = useState('');
  const [settingsTheme, setSettingsTheme] = useState('#3b82f6');
  const [settingsLogo, setSettingsLogo] = useState('');
  const [settingsApiKey, setSettingsApiKey] = useState('');

  // Loading/Notification States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Auto-clear messages
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Load User Profile on token change
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUserProfile();
    } else {
      localStorage.removeItem('token');
      setUser(null);
      setBusiness(null);
    }
  }, [token]);

  // Load contextual data based on view
  useEffect(() => {
    if (!user) return;

    if (user.role === 'owner') {
      if (['dashboard', 'settings', 'slots', 'chats', 'bookings'].includes(currentView)) {
        fetchBusinessDetails();
      }
      if (currentView === 'settings') {
        fetchFaqs();
      }
      if (currentView === 'slots') {
        fetchSlots();
      }
      if (currentView === 'bookings') {
        fetchBookings();
      }
      if (currentView === 'chats') {
        fetchChats();
      }
    } else if (user.role === 'admin') {
      if (currentView === 'admin') {
        fetchAdminData();
      }
    }
  }, [currentView, user]);

  // Fetch Message history for active chat
  useEffect(() => {
    if (activeChatId && currentView === 'chats') {
      fetchChatMessages(activeChatId);
      // Poll message history every 4 seconds when viewing a dialogue
      const interval = setInterval(() => {
        fetchChatMessages(activeChatId);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [activeChatId, currentView]);

  // API Call Helpers
  async function fetchUserProfile() {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        if (data.user.role === 'admin') {
          setCurrentView('admin');
        } else {
          setCurrentView('dashboard');
        }
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error(err);
      handleLogout();
    }
  }

  async function fetchBusinessDetails() {
    try {
      const res = await fetch('/api/business', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setBusiness(data.business);
        setStats(data.stats);
        // Prepopulate settings
        setSettingsName(data.business.name);
        setSettingsWelcome(data.business.welcome_message);
        setSettingsTheme(data.business.color_theme);
        setSettingsLogo(data.business.logo_url || '');
        setSettingsApiKey(data.business.custom_api_key || '');
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchFaqs() {
    try {
      const res = await fetch('/api/business/faq', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setFaqs(data.faqs);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchSlots() {
    try {
      const res = await fetch('/api/business/slots', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setSlots(data.slots);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchBookings() {
    try {
      const res = await fetch('/api/business/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setBookings(data.bookings);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchChats() {
    try {
      const res = await fetch('/api/business/chats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setChats(data.chats);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchChatMessages(chatId) {
    try {
      const res = await fetch(`/api/business/chats/${chatId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setChatMessages(data.messages);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchAdminData() {
    try {
      setLoading(true);
      const res1 = await fetch('/api/admin/businesses', { headers: { 'Authorization': `Bearer ${token}` } });
      const data1 = await res1.json();
      if (res1.ok) setAdminBusinesses(data1.businesses);

      const res2 = await fetch('/api/admin/bookings', { headers: { 'Authorization': `Bearer ${token}` } });
      const data2 = await res2.json();
      if (res2.ok) setAdminBookings(data2.bookings);

      const res3 = await fetch('/api/admin/chats', { headers: { 'Authorization': `Bearer ${token}` } });
      const data3 = await res3.json();
      if (res3.ok) setAdminChats(data3.chats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Handle Actions
  function handleLogout() {
    setToken('');
    setUser(null);
    setBusiness(null);
    setCurrentView('landing');
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setSuccessMsg('Вход выполнен успешно!');
        // Inputs reset
        setLoginEmail('');
        setLoginPassword('');
      } else {
        setErrorMsg(data.error || 'Ошибка входа.');
      }
    } catch (err) {
      setErrorMsg('Не удалось связаться с сервером.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: regEmail, 
          password: regPassword, 
          businessName: regBusName, 
          template: regTemplate 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setSuccessMsg('Успешная регистрация!');
        setRegEmail('');
        setRegPassword('');
        setRegBusName('');
      } else {
        setErrorMsg(data.error || 'Ошибка регистрации.');
      }
    } catch (err) {
      setErrorMsg('Не удалось связаться с сервером.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/business', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: settingsName,
          welcome_message: settingsWelcome,
          color_theme: settingsTheme,
          logo_url: settingsLogo,
          custom_api_key: settingsApiKey
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBusiness(data.business);
        setSuccessMsg('Настройки сохранены.');
        setPreviewKey(prev => prev + 1); // reload preview iframe
      } else {
        setErrorMsg(data.error || 'Ошибка сохранения.');
      }
    } catch (err) {
      setErrorMsg('Ошибка на сервере.');
    } finally {
      setLoading(false);
    }
  }

  // FAQ CRUD Actions
  async function handleAddOrUpdateFaq(e) {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;

    setLoading(true);
    try {
      const url = editingFaqId ? `/api/business/faq/${editingFaqId}` : '/api/business/faq';
      const method = editingFaqId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: faqQuestion, answer: faqAnswer })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(editingFaqId ? 'Вопрос-ответ обновлен.' : 'Вопрос-ответ добавлен.');
        setFaqQuestion('');
        setFaqAnswer('');
        setEditingFaqId(null);
        fetchFaqs();
        setPreviewKey(prev => prev + 1);
      } else {
        setErrorMsg(data.error || 'Не удалось обновить FAQ.');
      }
    } catch (err) {
      setErrorMsg('Ошибка соединения.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteFaq(id) {
    if (!confirm('Вы уверены, что хотите удалить этот вопрос-ответ?')) return;
    try {
      const res = await fetch(`/api/business/faq/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg('Вопрос-ответ удален.');
        fetchFaqs();
        setPreviewKey(prev => prev + 1);
      }
    } catch (err) {
      setErrorMsg('Ошибка удаления.');
    }
  }

  // Slots CRUD Actions
  async function handleAddSlot(e) {
    e.preventDefault();
    if (!slotDate || !slotTime) return;

    setLoading(true);
    try {
      const res = await fetch('/api/business/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ slot_date: slotDate, slot_times: [slotTime] })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Временной слот добавлен.');
        setSlotTime('');
        fetchSlots();
        setPreviewKey(prev => prev + 1);
      } else {
        setErrorMsg(data.error || 'Ошибка при добавлении слота.');
      }
    } catch (err) {
      setErrorMsg('Ошибка.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSlot(id) {
    if (!confirm('Вы уверены, что хотите удалить этот слот?')) return;
    try {
      const res = await fetch(`/api/business/slots/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Слот удален.');
        fetchSlots();
        setPreviewKey(prev => prev + 1);
      } else {
        setErrorMsg(data.error || 'Не удалось удалить.');
      }
    } catch (err) {
      setErrorMsg('Ошибка удаления.');
    }
  }

  // Change business plan (Simulated payment/action)
  async function handleChangePlan(newPlan) {
    if (!confirm(`Переключиться на тарифный план "${newPlan}"?`)) return;
    try {
      const res = await fetch('/api/business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: newPlan })
      });
      const data = await res.json();
      if (res.ok) {
        setBusiness(data.business);
        setSuccessMsg(`Тариф изменен на: ${newPlan}`);
      }
    } catch (err) {
      setErrorMsg('Ошибка изменения тарифа.');
    }
  }

  // Admin Actions
  async function handleToggleBusinessActive(businessId, currentStatus) {
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ active: !currentStatus })
      });
      if (res.ok) {
        setSuccessMsg('Статус бота изменен.');
        fetchAdminData();
      }
    } catch (err) {
      setErrorMsg('Ошибка изменения статуса.');
    }
  }

  async function handleAdminChangePlan(businessId, currentPlan) {
    const plans = ['trial', 'pro', 'enterprise'];
    const nextIndex = (plans.indexOf(currentPlan) + 1) % plans.length;
    const nextPlan = plans[nextIndex];
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: nextPlan })
      });
      if (res.ok) {
        setSuccessMsg(`Тариф изменен на ${nextPlan}.`);
        fetchAdminData();
      }
    } catch (err) {
      setErrorMsg('Ошибка изменения тарифа.');
    }
  }

  // Helper for generating copy embed code snippet
  const embedCodeSnippet = useMemo(() => {
    if (!business) return '';
    const origin = window.location.origin;
    return `<!-- AI Chatbot widget insertion -->
<script>
  window.AIChatbotConfig = {
    businessId: "${business.id}",
    serverUrl: "${origin}"
  };
</script>
<script src="${origin}/widget.js" async></script>`;
  }, [business]);

  // Handle copy to clipboard
  function handleCopySnippet() {
    navigator.clipboard.writeText(embedCodeSnippet);
    alert('Код виджета скопирован в буфер обмена!');
  }

  return (
    <div className="min-h-screen flex flex-col justify-between relative bg-slate-950 bg-gradient-radial">
      
      {/* Toast Alert Notifications */}
      {errorMsg && (
        <div className="fixed top-4 right-4 z-[99999] flex items-center bg-red-950 border border-red-500 text-red-100 px-4 py-3 rounded-xl shadow-2xl toast-enter max-w-sm">
          <ShieldAlert className="w-5 h-5 mr-3 text-red-400 flex-shrink-0" />
          <span className="text-xs font-medium">{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="fixed top-4 right-4 z-[99999] flex items-center bg-emerald-950 border border-emerald-500 text-emerald-100 px-4 py-3 rounded-xl shadow-2xl toast-enter max-w-sm">
          <CheckCircle className="w-5 h-5 mr-3 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-medium">{successMsg}</span>
        </div>
      )}

      {/* Main Header / Navigation */}
      <header className="border-b border-slate-900 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setCurrentView('landing')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-outfit font-extrabold text-lg bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              AIChatBot
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-800 text-indigo-400 px-2 py-0.5 rounded-full border border-slate-700">
              SaaS
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-6">
            {!user ? (
              <>
                <button onClick={() => setCurrentView('landing')} className={`text-sm transition-colors ${currentView === 'landing' ? 'text-indigo-400 nav-active' : 'text-slate-400 hover:text-slate-200 underline-reveal'}`}>Главная</button>
                <button onClick={() => setCurrentView('login')} className={`text-sm transition-colors ${currentView === 'login' ? 'text-indigo-400 nav-active' : 'text-slate-400 hover:text-slate-200 underline-reveal'}`}>Вход</button>
                <button onClick={() => setCurrentView('register')} className="px-4 py-2 rounded-xl bg-indigo-600 text-sm font-semibold hover:bg-indigo-500 transition-all text-white shadow-md shadow-indigo-600/10 btn-press">Регистрация</button>
              </>
            ) : (
              <>
                {user.role === 'admin' ? (
                  <span className="text-xs font-semibold px-2.5 py-1 bg-red-950 border border-red-800 text-red-400 rounded-full animate-pulse-glow">Панель Администратора</span>
                ) : (
                  <>
                    <button onClick={() => setCurrentView('dashboard')} className={`text-sm transition-colors ${currentView === 'dashboard' ? 'text-indigo-400 nav-active' : 'text-slate-400 hover:text-slate-200 underline-reveal'}`}>Дашборд</button>
                    <button onClick={() => setCurrentView('settings')} className={`text-sm transition-colors ${currentView === 'settings' ? 'text-indigo-400 nav-active' : 'text-slate-400 hover:text-slate-200 underline-reveal'}`}>Настройки и FAQ</button>
                    <button onClick={() => setCurrentView('slots')} className={`text-sm transition-colors ${currentView === 'slots' ? 'text-indigo-400 nav-active' : 'text-slate-400 hover:text-slate-200 underline-reveal'}`}>Расписание</button>
                    <button onClick={() => { setCurrentView('chats'); setActiveChatId(null); }} className={`text-sm transition-colors ${currentView === 'chats' ? 'text-indigo-400 nav-active' : 'text-slate-400 hover:text-slate-200 underline-reveal'}`}>Диалоги</button>
                    <button onClick={() => setCurrentView('bookings')} className={`text-sm transition-colors ${currentView === 'bookings' ? 'text-indigo-400 nav-active' : 'text-slate-400 hover:text-slate-200 underline-reveal'}`}>Записи</button>
                  </>
                )}
                
                <div className="flex items-center space-x-3 pl-4 border-l border-slate-900">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 icon-hover">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-300 truncate max-w-[120px]">{user.email}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{user.role}</p>
                  </div>
                  <button onClick={handleLogout} className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-all btn-press" title="Выйти">
                    <LogOut className="w-4.5 h-4.5" />
                  </button>
                </div>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-slate-400 hover:text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-900 flex flex-col space-y-3 pb-6">
            {!user ? (
              <>
                <button onClick={() => { setCurrentView('landing'); setMobileMenuOpen(false); }} className="text-left py-1.5 text-sm text-slate-300">Главная</button>
                <button onClick={() => { setCurrentView('login'); setMobileMenuOpen(false); }} className="text-left py-1.5 text-sm text-slate-300">Вход</button>
                <button onClick={() => { setCurrentView('register'); setMobileMenuOpen(false); }} className="text-left py-1.5 text-sm text-indigo-400 font-semibold">Регистрация</button>
              </>
            ) : (
              <>
                {user.role === 'admin' ? (
                  <button onClick={() => { setCurrentView('admin'); setMobileMenuOpen(false); }} className="text-left py-1.5 text-sm text-red-400 font-bold">Панель Админа</button>
                ) : (
                  <>
                    <button onClick={() => { setCurrentView('dashboard'); setMobileMenuOpen(false); }} className="text-left py-1.5 text-sm text-slate-300">Дашборд</button>
                    <button onClick={() => { setCurrentView('settings'); setMobileMenuOpen(false); }} className="text-left py-1.5 text-sm text-slate-300">Настройки и FAQ</button>
                    <button onClick={() => { setCurrentView('slots'); setMobileMenuOpen(false); }} className="text-left py-1.5 text-sm text-slate-300">Расписание</button>
                    <button onClick={() => { setCurrentView('chats'); setActiveChatId(null); setMobileMenuOpen(false); }} className="text-left py-1.5 text-sm text-slate-300">Диалоги</button>
                    <button onClick={() => { setCurrentView('bookings'); setMobileMenuOpen(false); }} className="text-left py-1.5 text-sm text-slate-300">Записи</button>
                  </>
                )}
                <div className="pt-3 border-t border-slate-900 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{user.email}</span>
                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="text-xs text-red-400 flex items-center">
                    <LogOut className="w-3.5 h-3.5 mr-1" /> Выйти
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* Main Content Areas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* VIEW 1: LANDING PAGE */}
        {currentView === 'landing' && (
          <div className="space-y-24 py-6">
            
            {/* Hero Section */}
            <div className="text-center space-y-8 max-w-3xl mx-auto py-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-glow -z-10 pointer-events-none"></div>
              
              {/* Custom Hero Particles */}
              <div className="hero-particles">
                <div className="hero-particle"></div>
                <div className="hero-particle"></div>
                <div className="hero-particle"></div>
                <div className="hero-particle"></div>
                <div className="hero-particle"></div>
              </div>

              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-indigo-400 text-xs font-semibold animate-pulse-glow">
                <Sparkles className="w-3.5 h-3.5 icon-hover" />
                <span>Запуск платформы: ИИ-чат-боты без кода</span>
              </div>
              
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-none font-outfit animate-slide-up">
                Умные ИИ-ассистенты для вашего <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent animate-gradient-text">бизнеса</span>
              </h1>
              
              <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto animate-slide-up delay-200">
                Создайте и настройте умного чат-бота для вашего кафе, салона красоты или клиники за 5 минут. Позвольте ИИ отвечать на частые вопросы клиентов и автоматически записывать их на свободные слоты.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up delay-300">
                <button onClick={() => setCurrentView('register')} className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white shadow-xl shadow-indigo-600/20 flex items-center justify-center btn-press shimmer-btn">
                  Попробовать бесплатно <ArrowRight className="w-4 h-4 ml-2 animate-bounce" />
                </button>
                <button onClick={() => setCurrentView('login')} className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm bg-slate-900 hover:bg-slate-850 transition-all text-slate-200 border border-slate-850 flex items-center justify-center btn-press">
                  Вход для клиентов
                </button>
              </div>
            </div>

            {/* Template Scenarios Grid */}
            <div className="space-y-12">
              <div className="text-center space-y-3">
                <h2 className="text-2xl sm:text-3xl font-extrabold font-outfit">Выбирайте готовый шаблон под свой бизнес</h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto">Каждый шаблон преднастроен с типовыми сценариями и готов к работе.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Cafe */}
                <div className="glass-card card-lift glow-border rounded-2xl p-6 flex flex-col justify-between space-y-6 border border-slate-900 shadow-xl animate-slide-up">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-950/60 border border-orange-850 flex items-center justify-center text-orange-400 icon-hover animate-float">
                      <Coffee className="w-5.5 h-5.5" />
                    </div>
                    <h3 className="text-lg font-bold font-outfit text-white">Кафе и Рестораны</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Бот расскажет меню, цены, ингредиенты блюд, расписание работы, а также поможет забронировать столик на вечер или заказать банкет.
                    </p>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 border-t border-slate-900 pt-4">
                    <li className="flex items-center"><Check className="w-4 h-4 text-orange-400 mr-2 flex-shrink-0" /> Интеграция меню</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-orange-400 mr-2 flex-shrink-0" /> Бронь столов по времени</li>
                  </ul>
                </div>

                {/* Salon */}
                <div className="glass-card card-lift glow-border rounded-2xl p-6 flex flex-col justify-between space-y-6 border border-slate-900 shadow-xl animate-slide-up delay-100">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-pink-950/60 border border-pink-850 flex items-center justify-center text-pink-400 icon-hover animate-float" style={{ animationDelay: '0.2s' }}>
                      <Scissors className="w-5.5 h-5.5" />
                    </div>
                    <h3 className="text-lg font-bold font-outfit text-white">Салоны Красоты</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      ИИ ответит о стоимости услуг (маникюр, окрашивание, стрижки), расскажет об опыте мастеров и предоставит выбор времени для записи на процедуры.
                    </p>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 border-t border-slate-900 pt-4">
                    <li className="flex items-center"><Check className="w-4 h-4 text-pink-400 mr-2 flex-shrink-0" /> Выбор категорий мастеров</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-pink-400 mr-2 flex-shrink-0" /> Быстрая запись на маникюр/стрижку</li>
                  </ul>
                </div>

                {/* Clinic */}
                <div className="glass-card card-lift glow-border rounded-2xl p-6 flex flex-col justify-between space-y-6 border border-slate-900 shadow-xl animate-slide-up delay-200">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-950/60 border border-teal-850 flex items-center justify-center text-teal-400 icon-hover animate-float" style={{ animationDelay: '0.4s' }}>
                      <Stethoscope className="w-5.5 h-5.5" />
                    </div>
                    <h3 className="text-lg font-bold font-outfit text-white">Медицинские Клиники</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Информирование о приеме узких специалистов (кардиолог, терапевт), ценах на анализы, адресе и расписании клиники. Интеграция со свободными слотами.
                    </p>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 border-t border-slate-900 pt-4">
                    <li className="flex items-center"><Check className="w-4 h-4 text-teal-400 mr-2 flex-shrink-0" /> Расписание приемов врачей</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-teal-400 mr-2 flex-shrink-0" /> Сбор контактных данных для приема</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-12">
              <div className="text-center space-y-3">
                <h2 className="text-2xl sm:text-3xl font-extrabold font-outfit">Прозрачные тарифы под ваши масштабы</h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto">Начните бесплатно, расширяйте функционал по мере роста бизнеса.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {/* Trial */}
                <div className="glass-card card-lift glow-border rounded-2xl p-8 border border-slate-900 relative flex flex-col justify-between h-96 animate-slide-up">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-300">Пробный (Trial)</h3>
                    <p className="text-3xl font-extrabold text-white">Бесплатно</p>
                    <p className="text-xs text-slate-500">Базовый чат-бот для старта.</p>
                    <ul className="text-xs text-slate-400 space-y-2 pt-4">
                      <li className="flex items-center"><Check className="w-4.5 h-4.5 text-indigo-400 mr-2" /> До 50 диалогов в месяц</li>
                      <li className="flex items-center"><Check className="w-4.5 h-4.5 text-indigo-400 mr-2" /> Базовые шаблоны FAQ</li>
                    </ul>
                  </div>
                  <button onClick={() => setCurrentView('register')} className="w-full py-2.5 rounded-xl border border-slate-800 text-xs font-bold hover:bg-slate-900 transition-all text-slate-300 btn-press">
                    Попробовать
                  </button>
                </div>

                {/* Pro */}
                <div className="glass-card card-lift glow-border pricing-popular rounded-2xl p-8 bg-slate-900/60 relative flex flex-col justify-between h-96 shadow-indigo-500/5 animate-slide-up delay-100">
                  <div className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 rounded-full bg-indigo-600 text-[10px] font-bold text-white uppercase tracking-wider">Популярный</div>
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-indigo-300">Про (4 990 ₽/мес)</h3>
                    <p className="text-3xl font-extrabold text-white">4 990 ₽<span className="text-xs font-normal text-slate-500">/мес</span></p>
                    <p className="text-xs text-slate-400">Идеально для растущего бизнеса.</p>
                    <ul className="text-xs text-slate-300 space-y-2 pt-4">
                      <li className="flex items-center"><Check className="w-4.5 h-4.5 text-indigo-400 mr-2" /> Неограниченные диалоги</li>
                      <li className="flex items-center"><Check className="w-4.5 h-4.5 text-indigo-400 mr-2" /> Возможность вставки своего API-ключа</li>
                      <li className="flex items-center"><Check className="w-4.5 h-4.5 text-indigo-400 mr-2" /> До 500 слотов записи</li>
                    </ul>
                  </div>
                  <button onClick={() => setCurrentView('register')} className="w-full py-2.5 rounded-xl bg-indigo-600 text-xs font-bold hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 btn-press animate-pulse-glow">
                    Начать сейчас
                  </button>
                </div>

                {/* Enterprise */}
                <div className="glass-card card-lift glow-border rounded-2xl p-8 border border-slate-900 relative flex flex-col justify-between h-96 animate-slide-up delay-200">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-300">Бизнес (24 990 ₽/мес)</h3>
                    <p className="text-3xl font-extrabold text-white">24 990 ₽<span className="text-xs font-normal text-slate-500">/мес</span></p>
                    <p className="text-xs text-slate-500">Для сетей и крупных заведений.</p>
                    <ul className="text-xs text-slate-400 space-y-2 pt-4">
                      <li className="flex items-center"><Check className="w-4.5 h-4.5 text-indigo-400 mr-2" /> Доступ ко всем возможностям</li>
                      <li className="flex items-center"><Check className="w-4.5 h-4.5 text-indigo-400 mr-2" /> Персональная поддержка 24/7</li>
                      <li className="flex items-center"><Check className="w-4.5 h-4.5 text-indigo-400 mr-2" /> Приоритетные LLM модели</li>
                    </ul>
                  </div>
                  <button onClick={() => setCurrentView('register')} className="w-full py-2.5 rounded-xl border border-slate-800 text-xs font-bold hover:bg-slate-900 transition-all text-slate-300 btn-press">
                    Выбрать Бизнес
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: LOGIN */}
        {currentView === 'login' && (
          <div className="max-w-md mx-auto py-12">
            <div className="glass-card rounded-2xl p-8 border border-slate-900 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl sm:text-2xl font-extrabold font-outfit text-white">Вход в личный кабинет</h2>
                <p className="text-xs text-slate-400">Авторизуйтесь для управления ботами</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email адрес</label>
                  <input 
                    type="email" 
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@business.com" 
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100 text-sm" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Пароль</label>
                  <input 
                    type="password" 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100 text-sm" 
                    required 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center"
                >
                  {loading ? 'Вход...' : 'Войти'}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-slate-900">
                <span className="text-xs text-slate-400">Нет аккаунта? </span>
                <button onClick={() => setCurrentView('register')} className="text-xs text-indigo-400 font-semibold hover:underline">Зарегистрироваться</button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: REGISTER */}
        {currentView === 'register' && (
          <div className="max-w-md mx-auto py-6">
            <div className="glass-card rounded-2xl p-8 border border-slate-900 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl sm:text-2xl font-extrabold font-outfit text-white">Регистрация кабинета</h2>
                <p className="text-xs text-slate-400">Создайте учетную запись и чат-бота в один клик</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email адрес</label>
                  <input 
                    type="email" 
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="owner@mybusiness.com" 
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100 text-sm" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Пароль</label>
                  <input 
                    type="password" 
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Придумайте пароль" 
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100 text-sm" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Название вашего бизнеса</label>
                  <input 
                    type="text" 
                    value={regBusName}
                    onChange={(e) => setRegBusName(e.target.value)}
                    placeholder="Например: Кафе Ромашка" 
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100 text-sm" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Шаблон деятельности</label>
                  <select 
                    value={regTemplate}
                    onChange={(e) => setRegTemplate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100 text-sm"
                    required
                  >
                    <option value="cafe">Кафе / Ресторан (Меню, бронь столиков)</option>
                    <option value="salon">Салон красоты (Стрижка, маникюр, слоты времени)</option>
                    <option value="clinic">Клиника / Медцентр (Консультация врача, запись)</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center"
                >
                  {loading ? 'Создание аккаунта...' : 'Создать бизнес и бота'}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-slate-900">
                <span className="text-xs text-slate-400">Уже есть аккаунт? </span>
                <button onClick={() => setCurrentView('login')} className="text-xs text-indigo-400 font-semibold hover:underline">Войти</button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: OWNER DASHBOARD */}
        {currentView === 'dashboard' && business && (
          <div className="space-y-8">
            
            {/* Business Header Status */}
            <div className="glass-card rounded-2xl p-6 border border-slate-900 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 border border-indigo-850 flex items-center justify-center text-indigo-400">
                  {business.logo_url ? <img src={business.logo_url} className="w-full h-full object-cover rounded-2xl animate-fade-in" alt="logo" /> : (business.template === 'cafe' ? <Coffee className="w-6 h-6 animate-bounce" /> : business.template === 'salon' ? <Scissors className="w-6 h-6 animate-bounce" /> : <Stethoscope className="w-6 h-6 animate-bounce" />)}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-white font-outfit">{business.name}</h2>
                  <p className="text-xs text-slate-400">Шаблон: <span className="text-indigo-400 font-semibold uppercase">{business.template}</span> • Тариф: <span className="text-indigo-400 font-semibold uppercase">{business.plan}</span></p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${business.active ? 'bg-emerald-950 border border-emerald-800 text-emerald-400' : 'bg-red-950 border border-red-800 text-red-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${business.active ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                  {business.active ? 'Бот активен' : 'Бот отключен'}
                </span>
                <button onClick={() => setCurrentView('settings')} className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-200 transition-colors flex items-center">
                  <Settings className="w-3.5 h-3.5 mr-2" /> Настроить
                </button>
              </div>
            </div>

            {/* Quick Analytics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
              <div onClick={() => setCurrentView('settings')} className="glass-card card-lift glow-border stat-glow rounded-xl p-5 border border-slate-900 flex flex-col justify-between cursor-pointer hover:bg-slate-900/40 transition-colors shadow-lg">
                <div className="flex items-center justify-between text-indigo-400">
                  <Sparkles className="w-5 h-5 icon-hover" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase">База знаний</span>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-black text-white stat-number">{stats.faqs}</p>
                  <p className="text-xs text-slate-400">Вопросов в FAQ</p>
                </div>
              </div>

              <div onClick={() => setCurrentView('slots')} className="glass-card card-lift glow-border stat-glow rounded-xl p-5 border border-slate-900 flex flex-col justify-between cursor-pointer hover:bg-slate-900/40 transition-colors shadow-lg">
                <div className="flex items-center justify-between text-indigo-400">
                  <Calendar className="w-5 h-5 icon-hover" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Слоты записи</span>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-black text-white stat-number">{stats.slots}</p>
                  <p className="text-xs text-slate-400">Свободных часов</p>
                </div>
              </div>

              <div onClick={() => setCurrentView('bookings')} className="glass-card card-lift glow-border stat-glow rounded-xl p-5 border border-slate-900 flex flex-col justify-between cursor-pointer hover:bg-slate-900/40 transition-colors shadow-lg">
                <div className="flex items-center justify-between text-indigo-400">
                  <CheckCircle className="w-5 h-5 icon-hover" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Записи</span>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-black text-white stat-number">{stats.bookings}</p>
                  <p className="text-xs text-slate-400">Всего записей</p>
                </div>
              </div>

              <div onClick={() => setCurrentView('chats')} className="glass-card card-lift glow-border stat-glow rounded-xl p-5 border border-slate-900 flex flex-col justify-between cursor-pointer hover:bg-slate-900/40 transition-colors shadow-lg">
                <div className="flex items-center justify-between text-indigo-400">
                  <MessageSquare className="w-5 h-5 icon-hover" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Диалоги</span>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-black text-white stat-number">{stats.chats}</p>
                  <p className="text-xs text-slate-400">Сессий общения</p>
                </div>
              </div>
            </div>

            {/* Embed Code Widget & Live Demo Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Embed Integration Code */}
              <div className="glass-card rounded-2xl p-6 border border-slate-900 shadow-xl space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <Code className="w-5 h-5" />
                    <h3 className="text-base font-bold text-white font-outfit">Инструкция по интеграции</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Чтобы добавить ИИ-виджет чата на ваш веб-сайт, скопируйте следующий HTML-код и вставьте его непосредственно перед закрывающим тегом <code className="bg-slate-900 text-indigo-300 px-1 py-0.5 rounded">&lt;/body&gt;</code> на всех страницах вашего сайта.
                  </p>

                  <div className="relative">
                    <pre className="bg-slate-950 border border-slate-900 rounded-xl p-4 text-[10px] text-indigo-300 font-mono overflow-x-auto select-all max-h-48 whitespace-pre-wrap">
                      {embedCodeSnippet}
                    </pre>
                  </div>
                </div>

                <button 
                  onClick={handleCopySnippet} 
                  className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:bg-indigo-600 hover:text-white transition-all text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center"
                >
                  Копировать код виджета
                </button>
              </div>

              {/* Live Preview Panel */}
              <div className="glass-card rounded-2xl p-6 border border-slate-900 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <Eye className="w-5 h-5" />
                    <h3 className="text-base font-bold text-white font-outfit">Тестирование ИИ-бота</h3>
                  </div>
                  <button 
                    onClick={() => setPreviewKey(prev => prev + 1)} 
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-850 transition-all flex items-center" 
                    title="Перезагрузить чат"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Ниже представлен интерактивный виджет вашего чат-бота. Проверьте ответы и симулируйте запись на услуги.
                </p>

                {/* Widget Iframe Simulator container */}
                <div className="border border-slate-900 rounded-2xl overflow-hidden bg-slate-950 h-[380px] relative">
                  <iframe 
                    key={previewKey}
                    src={`/widget-chat.html?businessId=${business.id}`} 
                    className="w-full h-full border-none"
                    title="Bot Preview"
                  />
                </div>
              </div>
            </div>

            {/* Change Subscription Plan (Owner side) */}
            <div className="glass-card rounded-2xl p-6 border border-slate-900 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white font-outfit">Управление тарифным планом</h3>
              <p className="text-xs text-slate-400">Текущий тарифный план вашего бизнеса: <span className="font-bold text-indigo-400 uppercase">{business.plan}</span>. Вы можете переключать его в демонстрационных целях ниже:</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <button 
                  onClick={() => handleChangePlan('trial')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold border transition-all btn-press ${business.plan === 'trial' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                >
                  Пробный (Trial) — 0 ₽
                </button>
                <button 
                  onClick={() => handleChangePlan('pro')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold border transition-all btn-press ${business.plan === 'pro' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                >
                  Про (4 990 ₽/мес)
                </button>
                <button 
                  onClick={() => handleChangePlan('enterprise')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold border transition-all btn-press ${business.plan === 'enterprise' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                >
                  Бизнес (24 990 ₽/мес)
                </button>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 5: SETTINGS & FAQ BUILDER */}
        {currentView === 'settings' && business && (
          <div className="space-y-8">
            
            {/* Back button */}
            <button onClick={() => setCurrentView('dashboard')} className="text-xs text-slate-400 hover:text-white flex items-center transition-colors">
              &larr; Вернуться в дашборд
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Bot Customization Form */}
              <div className="lg:col-span-1 glass-card rounded-2xl p-6 border border-slate-900 shadow-xl space-y-6 h-fit">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <Palette className="w-5 h-5" />
                  <h3 className="text-base font-bold text-white font-outfit">Кастомизация бота</h3>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Название бота / бизнеса</label>
                    <input 
                      type="text" 
                      value={settingsName}
                      onChange={(e) => setSettingsName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Приветственное сообщение</label>
                    <textarea 
                      value={settingsWelcome}
                      onChange={(e) => setSettingsWelcome(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Цвет виджета</label>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="color" 
                        value={settingsTheme}
                        onChange={(e) => setSettingsTheme(e.target.value)}
                        className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                      />
                      <span className="font-mono text-slate-300 uppercase">{settingsTheme}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Ссылка на логотип (URL)</label>
                    <input 
                      type="url" 
                      value={settingsLogo}
                      onChange={(e) => setSettingsLogo(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>Свой OpenRouter API-Ключ</span>
                      <span className="text-[9px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded font-mono">Опционально</span>
                    </label>
                    <input 
                      type="password" 
                      value={settingsApiKey}
                      onChange={(e) => setSettingsApiKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-[10px]"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      Если не заполнено, будет использоваться общий бесплатный баланс платформы.
                    </p>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md"
                  >
                    Сохранить изменения
                  </button>
                </form>
              </div>

              {/* Visual FAQ Editor */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-900 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="text-base font-bold text-white font-outfit">База знаний (FAQ)</h3>
                  </div>
                  
                  {editingFaqId && (
                    <button 
                      onClick={() => { setEditingFaqId(null); setFaqQuestion(''); setFaqAnswer(''); }}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Отменить редактирование
                    </button>
                  )}
                </div>

                {/* FAQ Edit/Add Form */}
                <form onSubmit={handleAddOrUpdateFaq} className="bg-slate-950 p-4 border border-slate-900 rounded-xl space-y-3.5 text-xs">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    {editingFaqId ? <Edit2 className="w-4 h-4 text-indigo-400" /> : <Plus className="w-4 h-4 text-indigo-400" />}
                    <span>{editingFaqId ? 'Редактирование вопроса-ответа' : 'Добавить новый вопрос-ответ'}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 mb-1">Вопрос клиента</label>
                      <input 
                        type="text"
                        value={faqQuestion}
                        onChange={(e) => setFaqQuestion(e.target.value)}
                        placeholder="Например: Каковы часы работы?"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Ответ бота</label>
                      <input 
                        type="text"
                        value={faqAnswer}
                        onChange={(e) => setFaqAnswer(e.target.value)}
                        placeholder="Например: Мы работаем с 10:00 до 22:00 ежедневно."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all flex items-center justify-center"
                  >
                    {editingFaqId ? 'Сохранить изменения' : 'Добавить в базу знаний'}
                  </button>
                </form>

                {/* FAQ List Table */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Все вопросы-ответы ({faqs.length})</div>
                  
                  {faqs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/20 border border-dashed border-slate-900 rounded-xl">
                      В базе знаний пока нет записей. Создайте первую запись выше!
                    </div>
                  ) : (
                    <div className="border border-slate-900 rounded-xl overflow-hidden bg-slate-950/40">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-900 bg-slate-900/30 text-slate-400">
                            <th className="px-4 py-3 font-semibold">Вопрос</th>
                            <th className="px-4 py-3 font-semibold">Ответ</th>
                            <th className="px-4 py-3 font-semibold text-right w-24">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900">
                          {faqs.map(faq => (
                            <tr key={faq.id} className="hover:bg-slate-900/20 transition-colors">
                              <td className="px-4 py-3.5 font-medium text-slate-200">{faq.question}</td>
                              <td className="px-4 py-3.5 text-slate-400 leading-normal">{faq.answer}</td>
                              <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                                <button 
                                  onClick={() => {
                                    setEditingFaqId(faq.id);
                                    setFaqQuestion(faq.question);
                                    setFaqAnswer(faq.answer);
                                  }}
                                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all inline-flex items-center"
                                  title="Редактировать"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteFaq(faq.id)}
                                  className="p-1 rounded bg-slate-900 hover:bg-red-950 text-slate-450 hover:text-red-400 border border-slate-800 transition-all inline-flex items-center"
                                  title="Удалить"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* VIEW 6: SLOTS SCHEDULER */}
        {currentView === 'slots' && business && (
          <div className="space-y-8">
            <button onClick={() => setCurrentView('dashboard')} className="text-xs text-slate-400 hover:text-white flex items-center transition-colors">
              &larr; Вернуться в дашборд
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Add slot Form */}
              <div className="lg:col-span-1 glass-card rounded-2xl p-6 border border-slate-900 shadow-xl space-y-4 h-fit">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <Calendar className="w-5 h-5" />
                  <h3 className="text-base font-bold text-white font-outfit">Добавить свободное время</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Создайте временной слот, который клиенты смогут выбрать для записи в чат-боте.
                </p>

                <form onSubmit={handleAddSlot} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Дата</label>
                    <input 
                      type="date"
                      value={slotDate}
                      onChange={(e) => setSlotDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Время</label>
                    <input 
                      type="time"
                      value={slotTime}
                      onChange={(e) => setSlotTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md"
                  >
                    Добавить в календарь
                  </button>
                </form>
              </div>

              {/* Slot Calendar List */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-900 shadow-xl space-y-6">
                <div className="flex items-center space-x-2 text-indigo-400 border-b border-slate-900 pb-4">
                  <Calendar className="w-5 h-5" />
                  <h3 className="text-base font-bold text-white font-outfit">Сетка свободного времени ({slots.length})</h3>
                </div>

                {slots.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/20 border border-dashed border-slate-900 rounded-xl">
                    Слотов записи не обнаружено. Создайте свободные часы слева!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {slots.map(slot => (
                      <div key={slot.id} className="bg-slate-950 border border-slate-900 p-4 rounded-xl flex items-center justify-between hover:border-slate-800 transition-colors shadow-md relative overflow-hidden">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-200">{new Date(slot.slot_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}</p>
                          <p className="text-base font-black text-white">{slot.slot_time}</p>
                          <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${slot.status === 'available' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-red-950 text-red-400 border border-red-900'}`}>
                            {slot.status === 'available' ? 'Свободен' : 'Занят'}
                          </span>
                        </div>

                        <button 
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950 text-slate-500 hover:text-red-400 border border-slate-850 hover:border-red-900 transition-all flex items-center"
                          title="Удалить слот"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* VIEW 7: VISITOR CHATS VIEWER */}
        {currentView === 'chats' && business && (
          <div className="space-y-8">
            <button onClick={() => setCurrentView('dashboard')} className="text-xs text-slate-400 hover:text-white flex items-center transition-colors">
              &larr; Вернуться в дашборд
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-[600px]">
              
              {/* Chats List sidebar */}
              <div className="md:col-span-1 glass-card rounded-2xl border border-slate-900 shadow-xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-900 bg-slate-900/30 flex items-center justify-between">
                  <span className="font-bold text-sm text-white font-outfit">Диалоги посетителей</span>
                  <span className="text-[10px] bg-slate-800 text-indigo-400 px-2 py-0.5 rounded font-bold">{chats.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-900/40">
                  {chats.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">Диалогов пока нет. Посетители сайта увидят чат, когда вы его интегрируете.</div>
                  ) : (
                    chats.map(chat => (
                      <div 
                        key={chat.id} 
                        onClick={() => setActiveChatId(chat.id)}
                        className={`p-4 cursor-pointer hover:bg-slate-900/20 transition-colors space-y-1.5 ${activeChatId === chat.id ? 'bg-indigo-900/10 border-l-2 border-indigo-500' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-300">Сессия #{chat.visitor_session_id.substring(0, 8)}</span>
                          <span className="text-[9px] text-slate-500">
                            {chat.last_message_time ? new Date(chat.last_message_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate leading-snug">
                          {chat.last_message || 'Без сообщений'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Chat log body */}
              <div className="md:col-span-2 glass-card rounded-2xl border border-slate-900 shadow-xl overflow-hidden flex flex-col bg-slate-950/40">
                {activeChatId ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-slate-900 bg-slate-900/20 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm text-white">Сессия #{chats.find(c => c.id === activeChatId)?.visitor_session_id.substring(0, 16)}</span>
                        <p className="text-[10px] text-slate-400">Вся переписка сохраняется в БД в реальном времени</p>
                      </div>
                    </div>

                    {/* Messages log */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5 flex flex-col">
                      {chatMessages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender === 'visitor' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed shadow ${
                            msg.sender === 'visitor' 
                              ? 'bg-blue-600 text-white rounded-tr-sm' 
                              : msg.sender === 'bot' 
                              ? 'bg-slate-900 text-slate-200 border border-slate-850 rounded-tl-sm'
                              : 'bg-indigo-950 text-indigo-200 border border-indigo-900 rounded-tl-sm'
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            <span className="block text-[8px] text-slate-400 text-right mt-1.5">
                              {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-2 p-6 text-center">
                    <MessageSquare className="w-8 h-8 text-slate-700 animate-bounce" />
                    <h4 className="font-bold text-slate-400 text-sm">Выберите диалог</h4>
                    <p className="text-xs text-slate-500 max-w-xs">Выберите одну из сессий посетителей в левой колонке, чтобы прочитать переписку с ботом.</p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* VIEW 8: BOOKINGS LIST */}
        {currentView === 'bookings' && business && (
          <div className="space-y-8">
            <button onClick={() => setCurrentView('dashboard')} className="text-xs text-slate-400 hover:text-white flex items-center transition-colors">
              &larr; Вернуться в дашборд
            </button>

            <div className="glass-card rounded-2xl p-6 border border-slate-900 shadow-xl space-y-6">
              <div className="flex items-center space-x-2 text-indigo-400 border-b border-slate-900 pb-4">
                <CheckCircle className="w-5 h-5" />
                <h3 className="text-base font-bold text-white font-outfit">Записи клиентов на прием/услуги ({bookings.length})</h3>
              </div>

              {bookings.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/20 border border-dashed border-slate-900 rounded-xl">
                  Активных записей не обнаружено. Бот может записывать клиентов, когда они выбирают слоты в виджете чата.
                </div>
              ) : (
                <div className="border border-slate-900 rounded-xl overflow-hidden bg-slate-950/40">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-900 bg-slate-900/30 text-slate-400 font-semibold">
                        <th className="px-4 py-3">Имя клиента</th>
                        <th className="px-4 py-3">Телефон</th>
                        <th className="px-4 py-3">Услуга</th>
                        <th className="px-4 py-3">Дата приема</th>
                        <th className="px-4 py-3">Время приема</th>
                        <th className="px-4 py-3 text-right">Зарегистрировано</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-slate-200">
                      {bookings.map(booking => (
                        <tr key={booking.id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-100">{booking.customer_name}</td>
                          <td className="px-4 py-3.5 font-mono">{booking.customer_phone}</td>
                          <td className="px-4 py-3.5">
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-indigo-400 font-medium border border-slate-800">{booking.service_name}</span>
                          </td>
                          <td className="px-4 py-3.5 font-medium">{new Date(booking.slot_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-100 text-base">{booking.slot_time}</td>
                          <td className="px-4 py-3.5 text-right text-slate-500">
                            {new Date(booking.created_at).toLocaleDateString('ru-RU')} {new Date(booking.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW 9: PLATFORM ADMIN VIEW */}
        {currentView === 'admin' && user?.role === 'admin' && (
          <div className="space-y-8">
            
            <div className="glass-card rounded-2xl p-6 border border-slate-900 shadow-xl space-y-4">
              <h2 className="text-xl font-extrabold text-white font-outfit flex items-center">
                <Shield className="w-5 h-5 text-indigo-400 mr-2" />
                Глобальный мониторинг платформы
              </h2>
              <p className="text-xs text-slate-400">
                Кабинет супер-администратора. Контроль работы бизнесов, включение/отключение ботов, просмотр метрик и подписок.
              </p>
            </div>

            {/* Platform statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl text-center shadow-lg">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Всего бизнесов</p>
                <p className="text-2xl font-black text-indigo-400">{adminBusinesses.length}</p>
              </div>
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl text-center shadow-lg">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Всего записей</p>
                <p className="text-2xl font-black text-emerald-400">{adminBookings.length}</p>
              </div>
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl text-center shadow-lg">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Всего чатов</p>
                <p className="text-2xl font-black text-purple-400">{adminChats.length}</p>
              </div>
            </div>

            {/* Businesses Control Table */}
            <div className="glass-card rounded-2xl p-6 border border-slate-900 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white font-outfit uppercase tracking-wider">Управление компаниями и подписками</h3>
              
              <div className="border border-slate-900 rounded-xl overflow-hidden bg-slate-950/40">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-900/30 text-slate-400 font-semibold">
                      <th className="px-4 py-3">Название</th>
                      <th className="px-4 py-3">Email владельца</th>
                      <th className="px-4 py-3">Шаблон</th>
                      <th className="px-4 py-3">FAQ</th>
                      <th className="px-4 py-3">Активные слоты</th>
                      <th className="px-4 py-3">Записи</th>
                      <th className="px-4 py-3">Диалоги</th>
                      <th className="px-4 py-3">Тариф</th>
                      <th className="px-4 py-3 text-right">Бот активен</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-200">
                    {adminBusinesses.map(bus => (
                      <tr key={bus.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-100">{bus.name}</td>
                        <td className="px-4 py-3.5">{bus.owner_email}</td>
                        <td className="px-4 py-3.5 uppercase font-mono text-[10px] text-indigo-400">{bus.template}</td>
                        <td className="px-4 py-3.5 text-center font-bold">{bus.faq_count}</td>
                        <td className="px-4 py-3.5 text-center font-bold">{bus.total_slots}</td>
                        <td className="px-4 py-3.5 text-center font-bold">{bus.booking_count}</td>
                        <td className="px-4 py-3.5 text-center font-bold">{bus.chat_count}</td>
                        <td className="px-4 py-3.5">
                          <button 
                            onClick={() => handleAdminChangePlan(bus.id, bus.plan)}
                            className="px-2.5 py-0.5 rounded-full font-bold uppercase bg-indigo-950 text-indigo-300 border border-indigo-900 hover:bg-indigo-900 transition-colors text-[9px]"
                            title="Нажмите для переключения тарифа"
                          >
                            {bus.plan}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button 
                            onClick={() => handleToggleBusinessActive(bus.id, bus.active)}
                            className={`px-3 py-1 rounded-xl font-bold transition-all text-[10px] ${bus.active ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-red-950 text-red-400 border border-red-900'}`}
                          >
                            {bus.active ? 'ВКЛ' : 'ВЫКЛ'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Global platform activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Global Bookings logs */}
              <div className="glass-card rounded-2xl p-6 border border-slate-900 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white font-outfit uppercase tracking-wider">Последние записи на платформе</h3>
                <div className="border border-slate-900 rounded-xl overflow-hidden bg-slate-950/40 text-[11px] max-h-80 overflow-y-auto">
                  {adminBookings.length === 0 ? (
                    <p className="p-6 text-center text-slate-500">Записей пока нет.</p>
                  ) : (
                    <div className="divide-y divide-slate-900">
                      {adminBookings.map(b => (
                        <div key={b.id} className="p-3 flex justify-between items-center hover:bg-slate-900/10">
                          <div>
                            <span className="font-bold text-slate-200">{b.customer_name}</span> &rarr; <span className="text-indigo-400">{b.business_name}</span>
                            <p className="text-[10px] text-slate-500">Услуга: {b.service_name} • Тел: {b.customer_phone}</p>
                          </div>
                          <span className="font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{b.slot_date} в {b.slot_time}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Global Chats logs */}
              <div className="glass-card rounded-2xl p-6 border border-slate-900 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white font-outfit uppercase tracking-wider">Активность чат-сессий</h3>
                <div className="border border-slate-900 rounded-xl overflow-hidden bg-slate-950/40 text-[11px] max-h-80 overflow-y-auto">
                  {adminChats.length === 0 ? (
                    <p className="p-6 text-center text-slate-500">Чатов пока нет.</p>
                  ) : (
                    <div className="divide-y divide-slate-900">
                      {adminChats.map(c => (
                        <div key={c.id} className="p-3 flex justify-between items-start hover:bg-slate-900/10">
                          <div>
                            <span className="font-bold text-slate-200">Компания: {c.business_name}</span>
                            <p className="text-[10px] text-slate-500 truncate max-w-xs">Сообщение: {c.last_message || 'Нет сообщений'}</p>
                          </div>
                          <span className="text-[9px] text-slate-500">{new Date(c.created_at).toLocaleDateString('ru-RU')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Main Footer */}
      <footer className="border-t border-slate-900 py-6 px-4 bg-slate-950/80 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} AIChatBot Platform. Все права защищены. Создано для предпринимателей малого бизнеса.</p>
          <div className="flex space-x-4">
            <span className="cursor-pointer hover:text-slate-400">Правила сервиса</span>
            <span className="cursor-pointer hover:text-slate-400">Политика конфиденциальности</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
