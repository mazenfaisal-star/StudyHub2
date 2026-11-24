import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { BookOpen, CalendarDays, CheckCircle2, CirclePlay, Clock3, LayoutDashboard, Moon, Plus, Search, Sun, GraduationCap, LogOut } from 'lucide-react';

const initialPlatforms = [
  { id: 'p1', name: 'بسطتهالك', subject: 'اللغة العربية', color: '#8b7cf6' },
  { id: 'p2', name: 'محمد صلاح', subject: 'اللغة الإنجليزية', color: '#43b9a5' },
  { id: 'p3', name: 'الجوهري', subject: 'الأحياء', color: '#e5a34b' },
  { id: 'p4', name: 'Dr. Clicks', subject: 'الكيمياء', color: '#5799e8' }
];
const initialLessons = [
  { id: 'l1', platformId: 'p1', title: 'مقدمة في النحو', subject: 'اللغة العربية', duration: 55, status: 'completed', date: '2026-11-20', url: '' },
  { id: 'l2', platformId: 'p1', title: 'المبتدأ والخبر', subject: 'اللغة العربية', duration: 72, status: 'in_progress', date: '2026-11-22', url: '' },
  { id: 'l3', platformId: 'p2', title: 'Unit 3 - Reading', subject: 'اللغة الإنجليزية', duration: 48, status: 'not_started', date: '2026-11-23', url: '' },
  { id: 'l4', platformId: 'p3', title: 'تركيب الخلية', subject: 'الأحياء', duration: 65, status: 'not_started', date: '2026-11-24', url: '' }
];
const labels = { completed: 'مكتملة', in_progress: 'بدأت ولم تكتمل', not_started: 'لم تبدأ' };

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('sh-dark') !== 'false');
  const [tab, setTab] = useState('home');
  const [platforms, setPlatforms] = useState(() => JSON.parse(localStorage.getItem('sh-platforms') || 'null') || initialPlatforms);
  const [lessons, setLessons] = useState(() => JSON.parse(localStorage.getItem('sh-lessons') || 'null') || initialLessons);
  const [selected, setSelected] = useState('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPlatform, setNewPlatform] = useState(initialPlatforms[0].id);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0,10));
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('sh-dark', dark); }, [dark]);
  useEffect(() => { localStorage.setItem('sh-platforms', JSON.stringify(platforms)); }, [platforms]);
  useEffect(() => { localStorage.setItem('sh-lessons', JSON.stringify(lessons)); }, [lessons]);
  useEffect(() => { if (!supabase) return; supabase.auth.getSession().then(({data}) => setUser(data.session?.user || null)); const {data:{subscription}} = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user || null)); return () => subscription.unsubscribe(); }, []);

  const visibleLessons = useMemo(() => lessons.filter(l => (selected === 'all' || l.platformId === selected) && (l.title + l.subject).toLowerCase().includes(search.toLowerCase())), [lessons, selected, search]);
  const done = lessons.filter(l => l.status === 'completed').length;
  const started = lessons.filter(l => l.status === 'in_progress').length;
  const pending = lessons.filter(l => l.status === 'not_started').length;
  const progress = lessons.length ? Math.round(done / lessons.length * 100) : 0;

  async function authenticate(e) {
    e.preventDefault(); setAuthMessage('');
    if (!supabase) { setAuthMessage('أضف بيانات Supabase في ملف .env.local لتفعيل تسجيل الدخول الحقيقي.'); return; }
    const fn = authMode === 'login' ? supabase.auth.signInWithPassword({email,password}) : supabase.auth.signUp({email,password});
    const {error} = await fn; setAuthMessage(error ? error.message : 'تم إرسال طلب الحساب بنجاح.');
  }
  async function logout() { if (supabase) await supabase.auth.signOut(); setUser(null); }
  function addLesson(e) { e.preventDefault(); if (!newTitle.trim()) return; const p = platforms.find(x=>x.id===newPlatform); setLessons([...lessons,{id:crypto.randomUUID(),platformId:newPlatform,title:newTitle.trim(),subject:p?.subject || 'عام',duration:0,status:'not_started',date:newDate,url:''}]); setNewTitle(''); setShowAdd(false); }
  function changeStatus(id,status) { setLessons(lessons.map(l=>l.id===id?{...l,status}:l)); }
  function addPlatform() { const name = prompt('اسم المنصة الجديدة:'); if (name?.trim()) { const p={id:crypto.randomUUID(),name:name.trim(),subject:'مادة جديدة',color:'#8b7cf6'}; setPlatforms([...platforms,p]); setSelected(p.id); } }

  if (supabase && !user) return <main className="auth-wrap"><section className="auth-card"><div className="brand-mark"><GraduationCap size={28}/></div><h1>StudyHub</h1><p>كل محاضراتك ومواعيدك في مكان واحد</p><form onSubmit={authenticate}><label>البريد الإلكتروني<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></label><label>كلمة المرور<input type="password" required minLength="6" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></label><button className="primary full">{authMode==='login'?'تسجيل الدخول':'إنشاء حساب'}</button></form><button className="text-btn" onClick={()=>setAuthMode(authMode==='login'?'signup':'login')}>{authMode==='login'?'ليس لديك حساب؟ أنشئ حسابًا':'لديك حساب بالفعل؟ سجل الدخول'}</button>{authMessage && <small className="notice">{authMessage}</small>}</section></main>;

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><GraduationCap/></div><div><b>StudyHub</b><small>منصة المحاضرات</small></div></div><nav><button className={tab==='home'?'active':''} onClick={()=>setTab('home')}><LayoutDashboard/>الرئيسية</button><button className={tab==='lessons'?'active':''} onClick={()=>setTab('lessons')}><BookOpen/>المحاضرات</button><button className={tab==='calendar'?'active':''} onClick={()=>setTab('calendar')}><CalendarDays/>التقويم</button></nav><div className="side-bottom"><div className="profile"><div className="avatar">ط</div><div><b>{user?.email?.split('@')[0] || 'طالب'}</b><small>مساحة الدراسة</small></div>{user && <button className="icon-btn" onClick={logout} title="تسجيل الخروج"><LogOut size={16}/></button>}</div></div></aside>
    <main className="main"><header className="topbar"><div><span className="eyebrow">مساحة مذاكرتك</span><h2>{tab==='home'?'أهلاً بيك، جاهز تنجز؟':tab==='lessons'?'كل المحاضرات':'جدولك الدراسي'}</h2></div><button className="icon-btn theme-btn" onClick={()=>setDark(!dark)} title="تغيير المظهر">{dark?<Sun/>:<Moon/>}</button></header>
    {tab==='home' && <>
      <section className="welcome-card"><div><span className="pill">خطوة بخطوة</span><h1>خلّي مذاكرتك <em>أوضح وأسهل.</em></h1><p>تابع اللي خلصته، واعرف إيه اللي لسه مستنيك.</p><button className="primary" onClick={()=>setTab('lessons')}>عرض المحاضرات <CirclePlay size={17}/></button></div><div className="welcome-art"><div className="orb">✦</div><BookOpen size={86}/></div></section>
      <section className="stats"><Stat icon={<CheckCircle2/>} label="محاضرات مكتملة" value={done} tone="green"/><Stat icon={<Clock3/>} label="بدأت ولم تكتمل" value={started} tone="orange"/><Stat icon={<BookOpen/>} label="لم تبدأ بعد" value={pending} tone="blue"/></section>
      <section className="content-grid"><div className="panel progress-panel"><div className="panel-head"><div><h3>تقدمك الإجمالي</h3><p>حسب حالات المحاضرات المسجلة</p></div><strong>{progress}%</strong></div><div className="progress-track"><span style={{width:progress+'%'}}/></div><div className="progress-foot"><span>{done} من {lessons.length} محاضرة مكتملة</span><span>استمر 👏</span></div></div><div className="panel"><div className="panel-head"><div><h3>ماذا فاتك؟</h3><p>محاضرات لم تبدأها بعد</p></div><span className="count-badge">{pending}</span></div>{lessons.filter(l=>l.status==='not_started').slice(0,3).map(l=><div className="mini-row" key={l.id}><span className="dot orange-dot"/><div><b>{l.title}</b><small>{l.subject} · {l.date}</small></div></div>)}{pending===0&&<p className="empty">مفيش محاضرات فائتة حاليًا.</p>}</div></section>
      <section className="section-head"><div><h3>منصاتك التعليمية</h3><p>اختار منصة عشان تشوف محاضراتها</p></div><button className="secondary" onClick={addPlatform}><Plus size={16}/> إضافة منصة</button></section><section className="platform-grid">{platforms.map(p=><button className={'platform-card '+(selected===p.id?'chosen':'')} key={p.id} onClick={()=>{setSelected(p.id);setTab('lessons')}}><span className="platform-icon" style={{background:p.color+'22',color:p.color}}><GraduationCap/></span><b>{p.name}</b><small>{p.subject}</small><span className="platform-count">{lessons.filter(l=>l.platformId===p.id).length} محاضرة</span></button>)}</section>
    </>}
    {tab==='lessons' && <><section className="section-head"><div><h3>المحاضرات المسجلة</h3><p>حدّث حالة كل محاضرة حسب تقدمك</p></div><button className="primary" onClick={()=>setShowAdd(true)}><Plus size={17}/> إضافة محاضرة</button></section><div className="toolbar"><div className="searchbox"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن محاضرة..."/></div><select value={selected} onChange={e=>setSelected(e.target.value)}><option value="all">كل المنصات</option>{platforms.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div className="lesson-list">{visibleLessons.map(l=><article className="lesson-card" key={l.id}><div className="lesson-symbol"><BookOpen/></div><div className="lesson-info"><b>{l.title}</b><small>{l.subject} · {platforms.find(p=>p.id===l.platformId)?.name || 'منصة'}</small><small>تاريخ الإضافة: {l.date} {l.duration?`· ${l.duration} دقيقة`:''}</small></div><select className={'status-select '+l.status} value={l.status} onChange={e=>changeStatus(l.id,e.target.value)}><option value="not_started">لم تبدأ</option><option value="in_progress">بدأت ولم تكتمل</option><option value="completed">مكتملة</option></select></article>)}{visibleLessons.length===0&&<div className="empty large">مفيش محاضرات مطابقة. أضف أول محاضرة ليك.</div>}</div></>}
    {tab==='calendar' && <><section className="section-head"><div><h3>التقويم الدراسي</h3><p>مواعيد المحاضرات المسجلة عندك</p></div><button className="primary" onClick={()=>setShowAdd(true)}><Plus size={17}/> إضافة موعد</button></section><div className="panel calendar-panel">{lessons.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(l=><div className="calendar-row" key={l.id}><div className="date-box"><b>{new Date(l.date+'T00:00:00').getDate()}</b><small>{new Date(l.date+'T00:00:00').toLocaleDateString('ar-EG',{month:'short'})}</small></div><div><b>{l.title}</b><small>{l.subject} · {labels[l.status]}</small></div><span className={'status-dot '+l.status}/></div>)}{lessons.length===0&&<p className="empty">أضف محاضراتك عشان تظهر هنا.</p>}</div><p className="hint">ملاحظة: التقويم حاليًا يعرض المواعيد التي تضيفها بنفسك، وليس مواعيد المنصات تلقائيًا.</p></>}
    <footer>StudyHub <span>·</span> نسخة أولية قيد التطوير</footer>
    </main>
    {showAdd&&<div className="modal-backdrop" onClick={()=>setShowAdd(false)}><form className="modal" onSubmit={addLesson} onClick={e=>e.stopPropagation()}><div className="panel-head"><h3>إضافة محاضرة</h3><button type="button" className="icon-btn" onClick={()=>setShowAdd(false)}>×</button></div><label>اسم المحاضرة<input required value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="مثال: الفصل الأول"/></label><label>المنصة<select value={newPlatform} onChange={e=>setNewPlatform(e.target.value)}>{platforms.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>تاريخ المحاضرة<input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)}/></label><button className="primary full">حفظ المحاضرة</button></form></div>}
  </div>;
}
function Stat({icon,label,value,tone}) { return <div className="stat-card"><span className={'stat-icon '+tone}>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>; }