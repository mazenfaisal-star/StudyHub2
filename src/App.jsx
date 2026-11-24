import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { BookOpen, CalendarDays, CheckCircle2, Clock3, LayoutDashboard, Moon, Plus, Search, Sun, GraduationCap, LogOut, ShieldCheck, Pencil, Trash2, RefreshCw, Eye, EyeOff, ExternalLink } from 'lucide-react';

const labels = { completed: 'مكتملة', in_progress: 'بدأت ولم تكتمل', not_started: 'لم تبدأ' };
const blankPlatform = { name: '', subject: '', color: '#6c63d9', url: '', teacher_name: '', grade_level: 'الثالث الثانوي', integration_status: 'لا يوجد تكامل رسمي مؤكد' };

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
  const [showPassword, setShowPassword] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPlatform, setNewPlatform] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0,10));
  const [platformForm, setPlatformForm] = useState(blankPlatform);
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [showPlatformForm, setShowPlatformForm] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionForm, setSuggestionForm] = useState({ name: '', url: '', subject: '', grade_level: 'الثالث الثانوي', notes: '' });
  const [suggestionMessage, setSuggestionMessage] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('sh-dark', String(dark));
  }, [dark]);

  const loadData = useCallback(async (currentUser) => {
    if (!currentUser || !supabase) return;
    setLoading(true); setError('');
    const results = await Promise.all([
      supabase.from('platform_catalog').select('id,name,subject,color,active,url,teacher_name,grade_level,integration_status').eq('active', true).order('name'),
      supabase.from('user_lessons').select('id,user_id,platform_id,title,subject,duration_minutes,status,lesson_date,url').eq('user_id', currentUser.id).order('lesson_date'),
      supabase.from('user_roles').select('role').eq('user_id', currentUser.id).maybeSingle(),
      supabase.from('platform_suggestions').select('id,user_id,platform_name,official_url,subject,grade_level,notes,status,admin_note,created_at').order('created_at', { ascending: false })
    ]);
    const problem = results.find(x => x.error);
    if (problem) setError('تعذر تحميل بيانات قاعدة البيانات. شغّل ملف supabase/studyhub_v2.sql في Supabase SQL Editor. التفاصيل: ' + problem.error.message);
    else {
      setPlatforms(results[0].data || []);
      setLessons(results[1].data || []);
      setIsAdmin(results[2].data?.role === 'admin');
      setSuggestions(results[3].data || []);
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
      else { setPlatforms([]); setLessons([]); setIsAdmin(false); setSuggestions([]); setLoading(false); }
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
  async function submitSuggestion(e) {
    e.preventDefault();
    if (!suggestionForm.name.trim() || !suggestionForm.subject.trim()) return;
    setSaving(true); setSuggestionMessage('');
    const result = await supabase.from('platform_suggestions').insert({
      user_id: user.id,
      platform_name: suggestionForm.name.trim(),
      official_url: suggestionForm.url.trim() || null,
      subject: suggestionForm.subject.trim(),
      grade_level: suggestionForm.grade_level.trim() || 'الثالث الثانوي',
      notes: suggestionForm.notes.trim() || null
    }).select().single();
    if (result.error) setSuggestionMessage('تعذر إرسال الاقتراح: ' + result.error.message);
    else {
      setSuggestions(old => [result.data, ...old]);
      setSuggestionForm({ name: '', url: '', subject: '', grade_level: 'الثالث الثانوي', notes: '' });
      setSuggestionMessage('تم إرسال اقتراحك للأدمن للمراجعة. هتظهر المنصة في القائمة بعد الموافقة.');
    }
    setSaving(false);
  }
  async function reviewSuggestion(item, approved) {
    if (!isAdmin) return;
    setSaving(true); setError('');
    if (approved) {
      const added = await supabase.from('platform_catalog').upsert({
        name: item.platform_name, subject: item.subject, url: item.official_url,
        grade_level: item.grade_level || 'الثالث الثانوي', teacher_name: item.platform_name,
        integration_status: 'لا يوجد تكامل رسمي مؤكد', color: '#6c63d9', active: true
      }, { onConflict: 'name' }).select().single();
      if (added.error) { setError('تعذرت إضافة المنصة: ' + added.error.message); setSaving(false); return; }
      setPlatforms(old => [...old.filter(p => p.id !== added.data.id), added.data].sort((a,b) => a.name.localeCompare(b.name, 'ar')));
    }
    const updated = await supabase.from('platform_suggestions').update({ status: approved ? 'approved' : 'rejected' }).eq('id', item.id).select().single();
    if (updated.error) setError('تم التعامل مع المنصة لكن تعذر تحديث حالة الاقتراح: ' + updated.error.message);
    else setSuggestions(old => old.map(s => s.id === item.id ? updated.data : s));
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
    setPlatformForm(platform ? { name: platform.name, subject: platform.subject, color: platform.color || '#6c63d9', url: platform.url || '', teacher_name: platform.teacher_name || '', grade_level: platform.grade_level || 'الثالث الثانوي', integration_status: platform.integration_status || 'لا يوجد تكامل رسمي مؤكد' } : blankPlatform);
    setShowPlatformForm(true);
  }
  async function savePlatform(e) {
    e.preventDefault();
    if (!isAdmin || !platformForm.name.trim() || !platformForm.subject.trim()) return;
    setSaving(true); setError('');
    const values = { name: platformForm.name.trim(), subject: platformForm.subject.trim(), color: platformForm.color, url: platformForm.url.trim() || null, teacher_name: platformForm.teacher_name.trim() || null, grade_level: platformForm.grade_level.trim() || 'الثالث الثانوي', integration_status: platformForm.integration_status, active: true };
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
  if (!user) return <main className="auth-wrap"><section className="auth-card"><div className="brand-mark"><GraduationCap size={28}/></div><h1>StudyHub</h1><p>كل محاضراتك ومواعيدك في مكان واحد</p><form onSubmit={authenticate}><label>البريد الإلكتروني<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></label><label>كلمة المرور<div className="password-field"><input type={showPassword ? "text" : "password"} required minLength="6" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/><button type="button" className="password-toggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label><button className="primary full" disabled={saving}>{saving ? 'جارٍ التنفيذ...' : authMode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}</button></form><button className="text-btn" onClick={() => {setAuthMode(authMode === 'login' ? 'signup' : 'login');setAuthMessage('');}}>{authMode === 'login' ? 'ليس لديك حساب؟ أنشئ حسابًا' : 'لديك حساب بالفعل؟ سجل الدخول'}</button>{authMessage && <small className="notice">{authMessage}</small>}</section></main>;

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
        <section className="panel suggestion-panel"><div className="panel-head"><div><h3>مش لاقي منصتك؟</h3><p>اقترح منصة جديدة، والأدمن هيراجع بياناتها قبل إضافتها.</p></div></div><form className="suggestion-form" onSubmit={submitSuggestion}><label>اسم المنصة أو المدرس<input required value={suggestionForm.name} onChange={e=>setSuggestionForm({...suggestionForm,name:e.target.value})} placeholder="اسم المنصة"/></label><label>الرابط الرسمي<input type="url" value={suggestionForm.url} onChange={e=>setSuggestionForm({...suggestionForm,url:e.target.value})} placeholder="https://example.com"/></label><label>المادة<input required value={suggestionForm.subject} onChange={e=>setSuggestionForm({...suggestionForm,subject:e.target.value})} placeholder="مثال: الفيزياء"/></label><label>الصف الدراسي<input value={suggestionForm.grade_level} onChange={e=>setSuggestionForm({...suggestionForm,grade_level:e.target.value})}/></label><label className="wide-field">ملاحظات إضافية<textarea value={suggestionForm.notes} onChange={e=>setSuggestionForm({...suggestionForm,notes:e.target.value})} placeholder="أي تفاصيل تساعدنا نراجع المنصة"/></label><button className="primary" disabled={saving}>{saving ? 'جارٍ الإرسال...' : 'إرسال اقتراح المنصة'}</button>{suggestionMessage && <small className="notice">{suggestionMessage}</small>}</form><div className="suggestion-history"><b>اقتراحاتك السابقة</b>{suggestions.filter(s=>s.user_id===user.id).slice(0,4).map(s=><div className="suggestion-row" key={s.id}><span>{s.platform_name}</span><small className={'suggestion-status '+s.status}>{s.status==='pending'?'قيد المراجعة':s.status==='approved'?'تمت الموافقة':'مرفوض'}</small></div>)}</div></section>
        <section className="section-head"><div><h3>المنصات التعليمية</h3><p>اختار منصة عشان تشوف محاضراتها</p></div></section><section className="platform-grid">{platforms.map(p => <button className={'platform-card ' + (selected === p.id ? 'chosen' : '')} key={p.id} onClick={() => {setSelected(p.id);setTab('lessons');}}><span className="platform-icon" style={{background:p.color + '22',color:p.color}}><GraduationCap/></span><b>{p.name}</b><small>{p.subject}</small>{p.url && <span className="platform-link" role="link" tabIndex={0} onClick={e=>{e.stopPropagation();window.open(p.url, "_blank", "noopener,noreferrer");}} onKeyDown={e=>{if(e.key==="Enter"){e.stopPropagation();window.open(p.url, "_blank", "noopener,noreferrer");}}}>زيارة المنصة <ExternalLink size={13}/></span>}<span className="platform-count">{lessons.filter(l => l.platform_id === p.id).length} محاضرة</span></button>)}</section>
      </>}
      {tab === 'lessons' && <><section className="section-head"><div><h3>المحاضرات المسجلة</h3><p>حدّث حالة كل محاضرة حسب تقدمك</p></div><button className="primary" disabled={!platforms.length} onClick={() => {setNewPlatform(platforms[0]?.id || '');setShowAdd(true);}}><Plus size={17}/> إضافة محاضرة</button></section><div className="toolbar"><div className="searchbox"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن محاضرة..."/></div><select value={selected} onChange={e => setSelected(e.target.value)}><option value="all">كل المنصات</option>{platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div className="lesson-list">{visibleLessons.map(l => <article className="lesson-card" key={l.id}><div className="lesson-symbol"><BookOpen/></div><div className="lesson-info"><b>{l.title}</b><small>{l.subject} · {platforms.find(p => p.id === l.platform_id)?.name || 'منصة'}</small><small>تاريخ المحاضرة: {l.lesson_date || 'غير محدد'}</small></div><select className={'status-select ' + l.status} value={l.status} onChange={e => changeStatus(l.id,e.target.value)}><option value="not_started">لم تبدأ</option><option value="in_progress">بدأت ولم تكتمل</option><option value="completed">مكتملة</option></select></article>)}{visibleLessons.length === 0 && <div className="empty large">مفيش محاضرات مطابقة. أضف أول محاضرة ليك.</div>}</div></>}
      {tab === 'calendar' && <><section className="section-head"><div><h3>التقويم الدراسي</h3><p>مواعيد المحاضرات المسجلة عندك</p></div><button className="primary" disabled={!platforms.length} onClick={() => {setNewPlatform(platforms[0]?.id || '');setShowAdd(true);}}><Plus size={17}/> إضافة موعد</button></section><div className="panel calendar-panel">{lessons.slice().sort((a,b) => (a.lesson_date || '').localeCompare(b.lesson_date || '')).map(l => <div className="calendar-row" key={l.id}><div className="date-box"><b>{l.lesson_date ? new Date(l.lesson_date + 'T00:00:00').getDate() : '—'}</b><small>{l.lesson_date ? new Date(l.lesson_date + 'T00:00:00').toLocaleDateString('ar-EG',{month:'short'}) : 'بدون'}</small></div><div><b>{l.title}</b><small>{l.subject} · {labels[l.status]}</small></div><span className={'status-dot ' + l.status}/></div>)}{lessons.length === 0 && <p className="empty">أضف محاضراتك عشان تظهر هنا.</p>}</div></>}
      {tab === 'admin' && isAdmin && <><section className="section-head"><div><h3>إدارة المنصات التعليمية</h3><p>إضافة وتعديل وإخفاء المنصات المشتركة لكل الطلاب</p></div><button className="primary" onClick={() => editPlatform(null)}><Plus size={17}/> إضافة منصة</button></section>
        {showPlatformForm && <form className="panel platform-form" onSubmit={savePlatform}><div className="panel-head"><h3>{editingPlatform ? 'تعديل المنصة' : 'إضافة منصة جديدة'}</h3><button type="button" className="icon-btn" onClick={() => setShowPlatformForm(false)}>×</button></div><label>اسم المنصة<input required value={platformForm.name} onChange={e => setPlatformForm({...platformForm,name:e.target.value})} placeholder="اسم المنصة"/></label><label>المادة أو التخصص<input required value={platformForm.subject} onChange={e => setPlatformForm({...platformForm,subject:e.target.value})} placeholder="مثال: الأحياء"/></label><label>الرابط الرسمي<input type="url" value={platformForm.url} onChange={e => setPlatformForm({...platformForm,url:e.target.value})} placeholder="https://example.com"/></label><label>اسم المدرس<input value={platformForm.teacher_name} onChange={e => setPlatformForm({...platformForm,teacher_name:e.target.value})} placeholder="اسم المدرس"/></label><label>الصف الدراسي<input value={platformForm.grade_level} onChange={e => setPlatformForm({...platformForm,grade_level:e.target.value})} placeholder="الثالث الثانوي"/></label><label>حالة التكامل<select value={platformForm.integration_status} onChange={e => setPlatformForm({...platformForm,integration_status:e.target.value})}><option>لا يوجد تكامل رسمي مؤكد</option><option>بانتظار رد المنصة</option><option>تكامل رسمي متاح - يحتاج إعداد</option><option>فتح خارجي وتحديث يدوي</option></select></label><label>لون المنصة<input type="color" value={platformForm.color} onChange={e => setPlatformForm({...platformForm,color:e.target.value})}/></label><button className="primary" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ المنصة'}</button></form>}
        <section className="panel suggestion-admin"><div className="panel-head"><div><h3>اقتراحات الطلاب</h3><p>راجع المنصات المقترحة قبل ظهورها في الكتالوج</p></div><span className="count-badge">{suggestions.filter(s=>s.status==='pending').length} جديدة</span></div>{suggestions.map(s=><article className="suggestion-admin-row" key={s.id}><div><b>{s.platform_name}</b><small>{s.subject} · {s.grade_level}</small>{s.official_url && <a className="platform-link" href={s.official_url} target="_blank" rel="noreferrer">فحص الرابط <ExternalLink size={13}/></a>}{s.notes && <p>{s.notes}</p>}<small>الحالة: {s.status==='pending'?'قيد المراجعة':s.status==='approved'?'تمت الموافقة':'مرفوضة'}</small></div>{s.status==='pending' && <div className="suggestion-actions"><button type="button" className="primary" disabled={saving} onClick={()=>reviewSuggestion(s,true)}>قبول وإضافة</button><button type="button" className="secondary" disabled={saving} onClick={()=>reviewSuggestion(s,false)}>رفض</button></div>}</article>)}{suggestions.length===0 && <p className="empty">لا توجد اقتراحات حتى الآن.</p>}</section>
        <div className="admin-platform-list">{platforms.map(p => <article className="lesson-card" key={p.id}><span className="platform-icon" style={{background:p.color + '22',color:p.color}}><GraduationCap/></span><div className="lesson-info"><b>{p.name}</b><small>{p.subject} · {p.grade_level || "الثالث الثانوي"}</small>{p.url && <a className="platform-link" href={p.url} target="_blank" rel="noreferrer">فتح الموقع <ExternalLink size={13}/></a>}<small className="integration-note">{p.integration_status || "لا يوجد تكامل رسمي مؤكد"}</small></div><button className="icon-btn" onClick={() => editPlatform(p)} title="تعديل"><Pencil size={16}/></button><button className="icon-btn danger-btn" onClick={() => hidePlatform(p)} title="إخفاء"><Trash2 size={16}/></button></article>)}</div>
      </>}
      </>}
      <footer>StudyHub <span>·</span> نسخة أولية قيد التطوير</footer>
    </main>
    {showAdd && <div className="modal-backdrop" onClick={() => setShowAdd(false)}><form className="modal" onSubmit={addLesson} onClick={e => e.stopPropagation()}><div className="panel-head"><h3>إضافة محاضرة</h3><button type="button" className="icon-btn" onClick={() => setShowAdd(false)}>×</button></div><label>اسم المحاضرة<input required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="مثال: الفصل الأول"/></label><label>المنصة<select required value={newPlatform} onChange={e => setNewPlatform(e.target.value)}>{platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>تاريخ المحاضرة<input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}/></label><button className="primary full" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ المحاضرة'}</button></form></div>}
  </div>;
}
function Stat({icon,label,value,tone}) { return <div className="stat-card"><span className={'stat-icon ' + tone}>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>; }
