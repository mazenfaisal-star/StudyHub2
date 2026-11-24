import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { BookOpen, CalendarDays, CheckCircle2, Clock3, LayoutDashboard, Moon, Plus, Search, Sun, GraduationCap, LogOut, ShieldCheck, Pencil, Trash2, RefreshCw } from 'lucide-react';

const labels = { completed: 'مكتملة', in_progress: 'بدأت ولم تكتمل', not_started: 'لم تبدأ' };
const blankPlatform = { name: '', subject: '', color: '#6c63d9' };

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('sh-dark') === 'true');
  const [tab, setTab] = useState('home');
  const [platforms, setPlatforms] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selected, setSelected] = useState('all');
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPlatform, setNewPlatform] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0,10));
  const [platformForm, setPlatformForm] = useState(blankPlatform);
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [showPlatformForm, setShowPlatformForm] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('sh-dark', String(dark));
  }, [dark]);

  const loadData = useCallback(async (currentUser) => {
    if (!currentUser || !supabase) return;
    setLoading(true); setError('');
    const results = await Promise.all([
      supabase.from('platform_catalog').select('id,name,subject,color,active').eq('active', true).order('name'),
      supabase.from('user_lessons').select('id,user_id,platform_id,title,subject,duration_minutes,status,lesson_date,url').eq('user_id', currentUser.id).order('lesson_date'),
      supabase.from('user_roles').select('role').eq('user_id', currentUser.id).maybeSingle()
    ]);
    const problem = results.find(x => x.error);
    if (problem) setError('تعذر تحميل بيانات قاعدة البيانات. شغّل ملف supabase/studyhub_v2.sql في Supabase SQL Editor. التفاصيل: ' + problem.error.message);
    else {
      setPlatforms(results[0].data || []);
      setLessons(results[1].data || []);
      setIsAdmin(results[2].data?.role === 'admin');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    supabase.auth.getSession().then(({ data, error: e }) => {
      if (!active) return;
      if (e) setError(e.message);
      const current = data.session?.user || null;
      setUser(current);
      if (current) loadData(current); else setLoading(false);
    });
    const listener = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const current = session?.user || null;
      setUser(current);
      if (current) setTimeout(() => active && loadData(current), 0);
      else { setPlatforms([]); setLessons([]); setIsAdmin(false); setLoading(false); }
    });
    return () => { active = false; listener.data.subscription.unsubscribe(); };
  }, [loadData]);

  const visibleLessons = useMemo(() => lessons.filter(l =>
    (selected === 'all' || l.platform_id === selected) &&
    (l.title + ' ' + (l.subject || '')).toLowerCase().includes(search.toLowerCase())
  ), [lessons, selected, search]);
  const done = lessons.filter(l => l.status === 'completed').length;
  const started = lessons.filter(l => l.status === 'in_progress').length;
  const pending = lessons.filter(l => l.status === 'not_started').length;
  const progress = lessons.length ? Math.round(done / lessons.length * 100) : 0;

  async function authenticate(e) {
    e.preventDefault(); setSaving(true); setAuthMessage('');
    const result = authMode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setAuthMessage(result.error ? result.error.message : (authMode === 'login' ? 'تم تسجيل الدخول.' : 'تم إنشاء الحساب. راجع بريدك لتأكيد الحساب إذا طُلب منك ذلك.'));
    setSaving(false);
  }
  async function logout() { await supabase.auth.signOut(); }
  async function addLesson(e) {
    e.preventDefault();
    if (!newTitle.trim() || !newPlatform) return;
    setSaving(true); setError('');
    const platform = platforms.find(p => p.id === newPlatform);
    const result = await supabase.from('user_lessons').insert({
      user_id: user.id, platform_id: newPlatform, title: newTitle.trim(),
      subject: platform?.subject || 'عام', status: 'not_started', lesson_date: newDate
    }).select().single();
    if (result.error) setError('تعذر حفظ المحاضرة: ' + result.error.message);
    else { setLessons(old => [...old, result.data]); setNewTitle(''); setShowAdd(false); }
    setSaving(false);
  }
  async function changeStatus(id, status) {
    const result = await supabase.from('user_lessons').update({ status }).eq('id', id).eq('user_id', user.id);
    if (result.error) setError('تعذر تحديث الحالة: ' + result.error.message);
    else setLessons(old => old.map(l => l.id === id ? { ...l, status } : l));
  }
  function editPlatform(platform) {
    setEditingPlatform(platform || null);
    setPlatformForm(platform ? { name: platform.name, subject: platform.subject, color: platform.color || '#6c63d9' } : blankPlatform);
    setShowPlatformForm(true);
  }
  async function savePlatform(e) {
    e.preventDefault();
    if (!isAdmin || !platformForm.name.trim() || !platformForm.subject.trim()) return;
    setSaving(true); setError('');
    const values = { name: platformForm.name.trim(), subject: platformForm.subject.trim(), color: platformForm.color, active: true };
    const result = editingPlatform
      ? await supabase.from('platform_catalog').update(values).eq('id', editingPlatform.id).select().single()
      : await supabase.from('platform_catalog').insert(values).select().single();
    if (result.error) setError('تعذر حفظ المنصة: ' + result.error.message);
    else {
      setPlatforms(old => (editingPlatform ? old.map(p => p.id === editingPlatform.id ? result.data : p) : [...old, result.data]).sort((a,b) => a.name.localeCompare(b.name, 'ar')));
      setShowPlatformForm(false); setEditingPlatform(null); setPlatformForm(blankPlatform);
    }
    setSaving(false);
  }
  async function hidePlatform(p) {
    if (!isAdmin || !window.confirm('إخفاء منصة ' + p.name + ' من قائمة الطلاب؟')) return;
    const result = await supabase.from('platform_catalog').update({ active: false }).eq('id', p.id);
    if (result.error) setError('تعذر إخفاء المنصة: ' + result.error.message);
    else { setPlatforms(old => old.filter(x => x.id !== p.id)); if (selected === p.id) setSelected('all'); }
  }

  if (!supabase) return <main className="auth-wrap"><section className="auth-card"><div className="brand-mark"><GraduationCap size={28}/></div><h1>StudyHub</h1><p>لا يمكن فتح الموقع قبل ضبط الاتصال بـ Supabase.</p><div className="setup-warning">أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في GitHub Actions Secrets ثم أعد النشر. لا تضع service_role key هنا.</div></section></main>;
  if (!user) return <main className="auth-wrap"><section className="auth-card"><div className="brand-mark"><GraduationCap size={28}/></div><h1>StudyHub</h1><p>كل محاضراتك ومواعيدك في مكان واحد</p><form onSubmit={authenticate}><label>البريد الإلكتروني<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></label><label>كلمة المرور<input type="password" required minLength="6" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></label><button className="primary full" disabled={saving}>{saving ? 'جارٍ التنفيذ...' : authMode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}</button></form><button className="text-btn" onClick={() => {setAuthMode(authMode === 'login' ? 'signup' : 'login');setAuthMessage('');}}>{authMode === 'login' ? 'ليس لديك حساب؟ أنشئ حسابًا' : 'لديك حساب بالفعل؟ سجل الدخول'}</button>{authMessage && <small className="notice">{authMessage}</small>}</section></main>;

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><GraduationCap/></div><div><b>StudyHub</b><small>منصة المحاضرات</small></div></div>
      <nav>
        <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}><LayoutDashboard/>الرئيسية</button>
        <button className={tab === 'lessons' ? 'active' : ''} onClick={() => setTab('lessons')}><BookOpen/>المحاضرات</button>
        <button className={tab === 'calendar' ? 'active' : ''} onClick={() => setTab('calendar')}><CalendarDays/>التقويم</button>
        {isAdmin && <button className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}><ShieldCheck/>إدارة المنصات</button>}
      </nav>
      <div className="side-bottom"><div className="profile"><div className="avatar">ط</div><div><b>{user.email?.split('@')[0] || 'طالب'}</b><small>{isAdmin ? 'مدير النظام' : 'مساحة الدراسة'}</small></div><button className="icon-btn" onClick={logout} title="تسجيل الخروج"><LogOut size={16}/></button></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="eyebrow">مساحة مذاكرتك</span><h2>{tab === 'home' ? 'أهلاً بيك، جاهز تنجز؟' : tab === 'lessons' ? 'كل المحاضرات' : tab === 'calendar' ? 'جدولك الدراسي' : 'إدارة المنصات'}</h2></div><div className="top-actions"><button className="icon-btn" onClick={() => loadData(user)} title="تحديث"><RefreshCw size={17}/></button><button className="icon-btn theme-btn" onClick={() => setDark(!dark)} title="تغيير المظهر">{dark ? <Sun/> : <Moon/>}</button></div></header>
      {error && <div className="error-banner">{error}</div>}
      {loading ? <div className="empty large">جارٍ تحميل البيانات...</div> : <>
      {tab === 'home' && <>
        <section className="welcome-card"><div><span className="pill">خطوة بخطوة</span><h1>خلّي مذاكرتك <em>أوضح وأسهل.</em></h1><p>تابع اللي خلصته، واعرف إيه اللي لسه مستنيك.</p><button className="primary" onClick={() => setTab('lessons')}>عرض المحاضرات</button></div><div className="welcome-art"><BookOpen size={86}/></div></section>
        <section className="stats"><Stat icon={<CheckCircle2/>} label="محاضرات مكتملة" value={done} tone="green"/><Stat icon={<Clock3/>} label="بدأت ولم تكتمل" value={started} tone="orange"/><Stat icon={<BookOpen/>} label="لم تبدأ بعد" value={pending} tone="blue"/></section>
        <section className="content-grid"><div className="panel"><div className="panel-head"><div><h3>تقدمك الإجمالي</h3><p>حسب حالات المحاضرات المسجلة</p></div><strong>{progress}%</strong></div><div className="progress-track"><span style={{width:progress + '%'}}/></div><div className="progress-foot"><span>{done} من {lessons.length} محاضرة مكتملة</span><span>استمر 👏</span></div></div><div className="panel"><div className="panel-head"><div><h3>ماذا فاتك؟</h3><p>محاضرات لم تبدأها بعد</p></div><span className="count-badge">{pending}</span></div>{lessons.filter(l => l.status === 'not_started').slice(0,3).map(l => <div className="mini-row" key={l.id}><span className="dot orange-dot"/><div><b>{l.title}</b><small>{l.subject} · {l.lesson_date || ''}</small></div></div>)}{pending === 0 && <p className="empty">مفيش محاضرات فائتة حاليًا.</p>}</div></section>
        <section className="section-head"><div><h3>المنصات التعليمية</h3><p>اختار منصة عشان تشوف محاضراتها</p></div></section><section className="platform-grid">{platforms.map(p => <button className={'platform-card ' + (selected === p.id ? 'chosen' : '')} key={p.id} onClick={() => {setSelected(p.id);setTab('lessons');}}><span className="platform-icon" style={{background:p.color + '22',color:p.color}}><GraduationCap/></span><b>{p.name}</b><small>{p.subject}</small><span className="platform-count">{lessons.filter(l => l.platform_id === p.id).length} محاضرة</span></button>)}</section>
      </>}
      {tab === 'lessons' && <><section className="section-head"><div><h3>المحاضرات المسجلة</h3><p>حدّث حالة كل محاضرة حسب تقدمك</p></div><button className="primary" disabled={!platforms.length} onClick={() => {setNewPlatform(platforms[0]?.id || '');setShowAdd(true);}}><Plus size={17}/> إضافة محاضرة</button></section><div className="toolbar"><div className="searchbox"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن محاضرة..."/></div><select value={selected} onChange={e => setSelected(e.target.value)}><option value="all">كل المنصات</option>{platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div className="lesson-list">{visibleLessons.map(l => <article className="lesson-card" key={l.id}><div className="lesson-symbol"><BookOpen/></div><div className="lesson-info"><b>{l.title}</b><small>{l.subject} · {platforms.find(p => p.id === l.platform_id)?.name || 'منصة'}</small><small>تاريخ المحاضرة: {l.lesson_date || 'غير محدد'}</small></div><select className={'status-select ' + l.status} value={l.status} onChange={e => changeStatus(l.id,e.target.value)}><option value="not_started">لم تبدأ</option><option value="in_progress">بدأت ولم تكتمل</option><option value="completed">مكتملة</option></select></article>)}{visibleLessons.length === 0 && <div className="empty large">مفيش محاضرات مطابقة. أضف أول محاضرة ليك.</div>}</div></>}
      {tab === 'calendar' && <><section className="section-head"><div><h3>التقويم الدراسي</h3><p>مواعيد المحاضرات المسجلة عندك</p></div><button className="primary" disabled={!platforms.length} onClick={() => {setNewPlatform(platforms[0]?.id || '');setShowAdd(true);}}><Plus size={17}/> إضافة موعد</button></section><div className="panel calendar-panel">{lessons.slice().sort((a,b) => (a.lesson_date || '').localeCompare(b.lesson_date || '')).map(l => <div className="calendar-row" key={l.id}><div className="date-box"><b>{l.lesson_date ? new Date(l.lesson_date + 'T00:00:00').getDate() : '—'}</b><small>{l.lesson_date ? new Date(l.lesson_date + 'T00:00:00').toLocaleDateString('ar-EG',{month:'short'}) : 'بدون'}</small></div><div><b>{l.title}</b><small>{l.subject} · {labels[l.status]}</small></div><span className={'status-dot ' + l.status}/></div>)}{lessons.length === 0 && <p className="empty">أضف محاضراتك عشان تظهر هنا.</p>}</div></>}
      {tab === 'admin' && isAdmin && <><section className="section-head"><div><h3>إدارة المنصات التعليمية</h3><p>إضافة وتعديل وإخفاء المنصات المشتركة لكل الطلاب</p></div><button className="primary" onClick={() => editPlatform(null)}><Plus size={17}/> إضافة منصة</button></section>
        {showPlatformForm && <form className="panel platform-form" onSubmit={savePlatform}><div className="panel-head"><h3>{editingPlatform ? 'تعديل المنصة' : 'إضافة منصة جديدة'}</h3><button type="button" className="icon-btn" onClick={() => setShowPlatformForm(false)}>×</button></div><label>اسم المنصة<input required value={platformForm.name} onChange={e => setPlatformForm({...platformForm,name:e.target.value})} placeholder="اسم المنصة"/></label><label>المادة أو التخصص<input required value={platformForm.subject} onChange={e => setPlatformForm({...platformForm,subject:e.target.value})} placeholder="مثال: الأحياء"/></label><label>لون المنصة<input type="color" value={platformForm.color} onChange={e => setPlatformForm({...platformForm,color:e.target.value})}/></label><button className="primary" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ المنصة'}</button></form>}
        <div className="admin-platform-list">{platforms.map(p => <article className="lesson-card" key={p.id}><span className="platform-icon" style={{background:p.color + '22',color:p.color}}><GraduationCap/></span><div className="lesson-info"><b>{p.name}</b><small>{p.subject}</small></div><button className="icon-btn" onClick={() => editPlatform(p)} title="تعديل"><Pencil size={16}/></button><button className="icon-btn danger-btn" onClick={() => hidePlatform(p)} title="إخفاء"><Trash2 size={16}/></button></article>)}</div>
      </>}
      </>}
      <footer>StudyHub <span>·</span> نسخة أولية قيد التطوير</footer>
    </main>
    {showAdd && <div className="modal-backdrop" onClick={() => setShowAdd(false)}><form className="modal" onSubmit={addLesson} onClick={e => e.stopPropagation()}><div className="panel-head"><h3>إضافة محاضرة</h3><button type="button" className="icon-btn" onClick={() => setShowAdd(false)}>×</button></div><label>اسم المحاضرة<input required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="مثال: الفصل الأول"/></label><label>المنصة<select required value={newPlatform} onChange={e => setNewPlatform(e.target.value)}>{platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>تاريخ المحاضرة<input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}/></label><button className="primary full" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ المحاضرة'}</button></form></div>}
  </div>;
}
function Stat({icon,label,value,tone}) { return <div className="stat-card"><span className={'stat-icon ' + tone}>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>; }
