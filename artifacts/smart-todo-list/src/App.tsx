import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { Activity, ArrowLeft, ArrowRight, BarChart3, Bell, CalendarDays, Check, CheckCircle2, ChevronDown, Clock3, Command, Filter, LayoutDashboard, ListTodo, LogOut, Menu, Plus, Search, Settings, Sparkles, Target, Trash2, X } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { createTask, deleteTask, getTaskStatistics, getTasks, localDateKey, toggleTaskStatus, updateTask, type Category, type Priority, type Task } from '@/lib/tasks';

const queryClient = new QueryClient();
const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/tasks', label: 'My tasks', icon: ListTodo },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/analytics', label: 'Insights', icon: BarChart3 },
];
const categories: Category[] = ['Personal', 'College', 'Work', 'Projects', 'Other'];
const priorities: Priority[] = ['Low', 'Medium', 'High'];
const todayStr = () => localDateKey(new Date());
const dateLabel = (value?: string | null) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date';

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><AuthProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><AppRoutes /></RoutedErrorBoundary></WouterRouter><Toaster /></AuthProvider></TooltipProvider></QueryClientProvider>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function AppRoutes() {
  const [location] = useLocation();
  const auth = useAuth();
  const publicRoute = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location);
  if (publicRoute) return <AuthPage route={location} />;
  if (auth.loading) return <div className="min-h-[100dvh] grid place-items-center"><div className="w-72 space-y-3"><div className="h-4 rounded-full bg-indigo-100 animate-pulse" /><div className="h-3 w-2/3 rounded-full bg-slate-100 animate-pulse" /><div className="h-24 rounded-2xl bg-slate-100 animate-pulse" /></div></div>;
  if (!auth.user) return <AuthPage route="/login" />;
  return <AppShell />;
}

function AppShell() {
  const auth = useAuth();
  const [location, setLocation] = useLocation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<Task | 'new' | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'));
  const load = async () => {
    if (!auth.user) return;
    setLoading(true); setError('');
    try { setTasks(await getTasks(auth.user.id)); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load tasks.'); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [auth.user?.id]);
  useEffect(() => { const node = document.documentElement; node.classList.toggle('dark', dark); }, [dark]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2800); return () => window.clearTimeout(timer); }, [toast]);
  const changeStatus = async (task: Task) => {
    try { const next = await toggleTaskStatus(task); setTasks((old) => old.map((t) => t.id === task.id ? next : t)); setToast(next.status === 'Completed' ? 'A little progress, beautifully done.' : 'Task moved back to your list.'); }
    catch (e) { setToast(e instanceof Error ? e.message : 'Could not update task.'); }
  };
  const remove = async (task: Task) => {
    if (!window.confirm(`Delete “${task.title}”? This can’t be undone.`)) return;
    try { await deleteTask(task.id); setTasks((old) => old.filter((t) => t.id !== task.id)); setToast('Task removed.'); }
    catch (e) { setToast(e instanceof Error ? e.message : 'Could not delete task.'); }
  };
  const save = async (payload: { title: string; description: string; due_date: string; due_time: string; priority: Priority; category: Category; reminder_enabled: boolean }, task: Task | null) => {
    if (!auth.user) return;
    try {
      if (task) { const updated = await updateTask(task.id, payload); setTasks((old) => old.map((t) => t.id === task.id ? updated : t)); setToast('Changes saved.'); }
      else { const created = await createTask({ ...payload, user_id: auth.user.id, status: 'Pending' }); setTasks((old) => [created, ...old]); setToast('Added to your list.'); }
      setModal(null);
    } catch (e) { setToast(e instanceof Error ? e.message : 'Could not save task.'); throw e; }
  };
  const quickAdd = async (title: string) => {
    if (!auth.user) throw new Error('Please sign in again to add a task.');
    const created = await createTask({
      user_id: auth.user.id,
      title,
      description: '',
      due_date: todayStr(),
      due_time: null,
      priority: 'Medium',
      category: 'Personal',
      status: 'Pending',
      reminder_enabled: false,
    });
    setTasks((old) => [created, ...old]);
    setToast('Added to your list.');
  };
  const navLink = (item: typeof navItems[number]) => <Link key={item.href} href={item.href} onClick={() => setMobileMenu(false)} data-testid={`link-nav-${item.label.toLowerCase().replace(' ', '-')}`} className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-[14px] font-semibold transition-all ${location === item.href ? 'bg-indigo-600 text-white shadow-[0_8px_18px_rgba(74,82,193,.18)]' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-700'}`}><item.icon size={18} strokeWidth={1.9} /><span>{item.label}</span>{item.href === '/tasks' && tasks.filter((t) => t.status === 'Pending').length > 0 && <span className={`ml-auto text-xs ${location === item.href ? 'text-indigo-100' : 'text-slate-400'}`}>{tasks.filter((t) => t.status === 'Pending').length}</span>}</Link>;
  return <div className="min-h-[100dvh] bg-[#f5f7fc] text-slate-800 dark:bg-slate-950 dark:text-slate-100">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[246px] flex-col border-r border-indigo-100/70 bg-[#f0f3fc] px-5 py-6 dark:border-slate-800 dark:bg-slate-900 md:flex">
      <Link href="/" className="mb-10 flex items-center gap-3 px-1" data-testid="link-brand"><div className="grid h-10 w-10 place-items-center rounded-[14px] bg-indigo-600 text-white shadow-lg shadow-indigo-200"><Command size={20} /></div><div><div className="font-[Manrope] text-[16px] font-extrabold tracking-[-.04em]">daywell</div><div className="text-[10px] font-semibold uppercase tracking-[.19em] text-slate-400">your own pace</div></div></Link>
      <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Workspace</div>
      <nav className="space-y-1">{navItems.map((n) => navLink(n))}</nav>
      <div className="mt-9 mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Personal</div>
      <Link href="/settings" data-testid="link-settings" className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${location === '/settings' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-700'}`}><Settings size={18} />Settings</Link>
      <div className="mt-auto rounded-2xl bg-[#e3e9fb] p-4 dark:bg-slate-800"><div className="mb-3 grid h-9 w-9 place-items-center rounded-full bg-white text-indigo-600"><Sparkles size={17} /></div><div className="text-sm font-bold">One thing at a time.</div><p className="mt-1 text-xs leading-5 text-slate-500">Small steps still move you forward.</p><div className="mt-3 h-1 overflow-hidden rounded-full bg-indigo-100"><div className="h-full w-[67%] rounded-full bg-indigo-500" /></div></div>
      <button onClick={async () => { await auth.signOut(); setLocation('/login'); }} data-testid="button-sign-out" className="mt-5 flex items-center gap-2 px-3 text-sm font-semibold text-slate-500 hover:text-rose-600"><LogOut size={16} />Sign out</button>
    </aside>
    {mobileMenu && <div className="fixed inset-0 z-40 bg-slate-950/30 md:hidden" onClick={() => setMobileMenu(false)}><aside className="h-full w-[275px] bg-[#f1f4fc] p-5 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}><div className="mb-7 flex items-center justify-between"><Brand /><button onClick={() => setMobileMenu(false)} aria-label="Close menu" data-testid="button-close-menu"><X /></button></div><nav className="space-y-1">{navItems.map((n) => navLink(n))}<Link href="/settings" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-500" data-testid="link-mobile-settings"><Settings size={18} />Settings</Link></nav></aside></div>}
    <main className="min-h-[100dvh] md:ml-[246px]">
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-indigo-100/70 bg-[#f7f8fc]/90 px-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 sm:px-8 lg:px-11">
        <div className="flex items-center gap-3"><button className="md:hidden" onClick={() => setMobileMenu(true)} aria-label="Open menu" data-testid="button-open-menu"><Menu size={21} /></button><div className="hidden items-center gap-2 text-xs font-medium text-slate-400 sm:flex"><span>Personal space</span><span>/</span><span className="capitalize text-slate-600 dark:text-slate-300">{location === '/' ? 'Overview' : location.slice(1)}</span></div><span className="font-semibold md:hidden">daywell</span></div>
        <div className="flex items-center gap-3"><span className="hidden text-sm font-medium text-slate-500 sm:block">A fresh start, every day</span><div className="grid h-9 w-9 place-items-center rounded-full bg-[#dce4fb] text-xs font-bold uppercase text-indigo-700" data-testid="text-user-avatar">{(auth.fullName || auth.user?.email || 'Y').slice(0, 1)}</div></div>
      </header>
      <div className="mx-auto max-w-[1400px] px-5 pb-28 pt-8 sm:px-8 lg:px-11 lg:pt-10">
        {error && <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700"><span>{error}</span><button onClick={() => void load()} className="rounded-lg bg-white px-3 py-2 font-bold" data-testid="button-retry-load">Try again</button></div>}
        <Switch>
          <Route path="/"><Dashboard tasks={tasks} loading={loading} userName={auth.fullName || auth.user?.email?.split('@')[0] || 'there'} onAdd={() => setModal('new')} onQuickAdd={quickAdd} onToggle={changeStatus} /></Route>
          <Route path="/tasks"><TasksPage tasks={tasks} loading={loading} onAdd={() => setModal('new')} onToggle={changeStatus} onEdit={(t) => setModal(t)} onDelete={remove} /></Route>
          <Route path="/calendar"><CalendarPage tasks={tasks} onAdd={(date) => setModal({ ...blankTask(auth.user!.id), due_date: date } as Task)} onSelectDate={(d) => setLocation(`/tasks?date=${d}`)} onToggle={changeStatus} /></Route>
          <Route path="/analytics"><Analytics tasks={tasks} loading={loading} /></Route>
          <Route path="/settings"><SettingsPage dark={dark} setDark={setDark} /></Route>
          <Route><NotFound /></Route>
        </Switch>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-indigo-100 bg-white/95 px-2 py-2 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900 md:hidden">{navItems.map((item) => <Link href={item.href} key={item.href} className={`flex min-w-[61px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-semibold ${location === item.href ? 'text-indigo-700' : 'text-slate-400'}`} data-testid={`mobile-nav-${item.label.toLowerCase().replace(' ', '-')}`}><item.icon size={19} />{item.label}</Link>)}</nav>
    </main>
    {modal && <TaskDialog task={modal === 'new' || !modal.id ? null : modal} initialDate={modal !== 'new' && !modal.id ? modal.due_date : undefined} onClose={() => setModal(null)} onSave={save} />}
    {toast && <div role="status" data-testid="status-toast" className="fixed bottom-24 right-5 z-50 flex max-w-sm items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white shadow-xl md:bottom-6"><CheckCircle2 size={18} className="text-emerald-300" />{toast}</div>}
  </div>;
}
function Brand() { return <Link href="/" className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-[14px] bg-indigo-600 text-white"><Command size={20} /></div><span className="font-[Manrope] text-base font-extrabold tracking-[-.04em]">daywell</span></Link>; }
function blankTask(user_id: string) { return { id: '', user_id, title: '', description: '', due_date: todayStr(), due_time: '', priority: 'Medium' as Priority, category: 'Personal' as Category, status: 'Pending' as const, reminder_enabled: false, created_at: '', updated_at: '' }; }

function Dashboard({ tasks, loading, userName, onAdd, onQuickAdd, onToggle }: { tasks: Task[]; loading: boolean; userName: string; onAdd: () => void; onQuickAdd: (title: string) => Promise<void>; onToggle: (t: Task) => void }) {
  const [quickTitle, setQuickTitle] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState('');
  const stats = getTaskStatistics(tasks);
  const todayTasks = tasks.filter((t) => t.status === 'Pending' && t.due_date === todayStr());
  const upcoming = tasks.filter((t) => t.status === 'Pending' && t.due_date && t.due_date > todayStr()).sort((a, b) => a.due_date!.localeCompare(b.due_date!)).slice(0, 4);
  const weekData = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const key = localDateKey(d); return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), count: tasks.filter((t) => t.status === 'Completed' && t.updated_at?.slice(0, 10) === key).length }; }), [tasks]);
  const max = Math.max(1, ...weekData.map((d) => d.count));
  const submitQuickAdd = async (event: FormEvent) => {
    event.preventDefault();
    const title = quickTitle.trim();
    if (!title) {
      setQuickError('Add a task name first.');
      return;
    }
    setQuickSaving(true);
    setQuickError('');
    try {
      await onQuickAdd(title);
      setQuickTitle('');
    } catch (error) {
      setQuickError(error instanceof Error ? error.message : 'Could not add this task.');
    } finally {
      setQuickSaving(false);
    }
  };
  return <div className="page-enter space-y-8">
    <section className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-indigo-500"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div><h1 className="font-[Manrope] text-3xl font-extrabold tracking-[-.055em] text-slate-800 dark:text-white sm:text-[38px]">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {userName.split(' ')[0]}<span className="text-indigo-500">.</span></h1><p className="mt-2 text-sm text-slate-500">Make room for what matters today.</p></div><button onClick={onAdd} data-testid="button-add-task" className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700"><Plus size={17} /> Add a task</button></section>
    <form onSubmit={submitQuickAdd} className="rounded-[22px] border border-indigo-100/70 bg-white p-4 shadow-sm sm:flex sm:items-center sm:gap-3 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
      <label htmlFor="quick-add-task" className="mb-2 block text-xs font-bold text-slate-500 sm:mb-0 sm:shrink-0">Quick add</label>
      <input id="quick-add-task" value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} maxLength={120} placeholder="What would you like to get done today?" data-testid="input-quick-add-task" className="w-full rounded-xl border border-slate-200 bg-[#fafbfe] px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800" />
      <button type="submit" disabled={quickSaving || !quickTitle.trim()} data-testid="button-quick-add-task" className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0 sm:w-auto sm:shrink-0"><Plus size={16} />{quickSaving ? 'Adding…' : 'Add task'}</button>
      {quickError && <p role="alert" className="mt-2 text-xs text-rose-600 sm:absolute sm:mt-14">{quickError}</p>}
    </form>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Still to do" value={stats.pending} note="on your list" icon={<ListTodo />} tone="indigo" />
      <StatCard label="Done so far" value={stats.completed} note={`${stats.completion}% of all tasks`} icon={<CheckCircle2 />} tone="teal" />
      <StatCard label="Due today" value={stats.today} note="one step at a time" icon={<Target />} tone="peach" />
      <StatCard label="Past due" value={stats.overdue} note={stats.overdue ? 'Give these a fresh look' : 'You’re all caught up'} icon={<Clock3 />} tone="lilac" />
    </section>
    <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
      <div className="rounded-[24px] border border-indigo-100/70 bg-white p-5 shadow-[0_8px_30px_rgba(48,62,112,.035)] sm:p-7 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-start justify-between"><div><div className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">Your focus</div><h2 className="mt-1 font-[Manrope] text-xl font-extrabold tracking-tight">Today’s rhythm</h2></div><div className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:bg-slate-800">{todayTasks.length} on the list</div></div>
        {loading ? <SkeletonRows /> : todayTasks.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{todayTasks.slice(0, 5).map((t) => <TaskRow key={t.id} task={t} onToggle={() => onToggle(t)} />)}</div> : <EmptyState title="A little breathing room." copy="Nothing is due today. Want to add something you’d like to make time for?" action="Plan a task" onAction={onAdd} />}
        <div className="mt-5 flex justify-end"><Link href="/tasks" data-testid="link-all-tasks" className="text-sm font-bold text-indigo-600 hover:text-indigo-800">View all tasks <span aria-hidden>→</span></Link></div>
      </div>
      <div className="rounded-[24px] border border-indigo-100/70 bg-white p-5 shadow-[0_8px_30px_rgba(48,62,112,.035)] sm:p-7 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-7 flex items-start justify-between"><div><div className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">Little by little</div><h2 className="mt-1 font-[Manrope] text-xl font-extrabold tracking-tight">This week</h2></div><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#ecf0ff] text-indigo-600"><Activity size={18} /></div></div>
        <div className="flex h-[155px] items-end justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">{weekData.map((d, i) => <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] font-semibold text-slate-400">{d.count || ''}</span><div className={`bar-fill w-full max-w-[25px] rounded-t-lg ${i === 6 ? 'bg-indigo-500' : 'bg-indigo-100 dark:bg-slate-700'}`} style={{ height: `${Math.max(9, d.count / max * 100)}%`, animationDelay: `${i * 50}ms` }} /><span className="text-[10px] font-semibold text-slate-400">{d.label}</span></div>)}</div>
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#f4f6ff] px-4 py-3 dark:bg-slate-800"><div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-indigo-600 dark:bg-slate-700"><Sparkles size={16} /></div><p className="text-xs leading-5 text-slate-500">Every completed task is a promise you kept to yourself.</p></div>
      </div>
    </section>
    <section className="rounded-[24px] border border-indigo-100/70 bg-white p-5 shadow-[0_8px_30px_rgba(48,62,112,.035)] sm:p-7 dark:border-slate-800 dark:bg-slate-900"><div className="mb-5 flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">Just ahead</div><h2 className="mt-1 font-[Manrope] text-xl font-extrabold tracking-tight">Upcoming</h2></div><Link href="/calendar" data-testid="link-upcoming-calendar" className="flex items-center gap-1 text-xs font-bold text-indigo-600">Open calendar <ArrowRight size={14} /></Link></div>{loading ? <SkeletonRows /> : upcoming.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{upcoming.map((t) => <div key={t.id} data-testid={`card-upcoming-${t.id}`} className="rounded-2xl bg-[#f6f7fc] p-4 transition hover:bg-indigo-50 dark:bg-slate-800"><div className="mb-3 flex items-center justify-between"><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-600 dark:bg-slate-700">{dateLabel(t.due_date)}</span><PriorityDot priority={t.priority} /></div><div className="font-bold">{t.title}</div><div className="mt-1 text-xs text-slate-400">{t.category}{t.due_time ? ` · ${t.due_time}` : ''}</div></div>)}</div> : <EmptyState title="Your next chapter is open." copy="Give a future task a date and it’ll find a spot here." action="Add a task" onAction={onAdd} />}</section>
  </div>;
}
function StatCard({ label, value, note, icon, tone }: { label: string; value: number; note: string; icon: ReactNode; tone: string }) {
  const tones: Record<string, string> = { indigo: 'bg-indigo-50 text-indigo-600', teal: 'bg-[#e3f6f3] text-[#278e83]', peach: 'bg-[#fff1e8] text-[#dc8950]', lilac: 'bg-[#f0eafb] text-[#946bc1]' };
  return <div className="rounded-[21px] border border-indigo-100/70 bg-white p-5 shadow-[0_8px_28px_rgba(48,62,112,.03)] transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900" data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{label}</span><span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}>{icon}</span></div><div className="mt-5 flex items-baseline gap-2"><span className="font-[Manrope] text-3xl font-extrabold tracking-tight">{value}</span><span className="text-[11px] text-slate-400">{note}</span></div></div>;
}
function SkeletonRows() { return <div className="space-y-4 py-2"><div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /><div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /><div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /></div>; }
function EmptyState({ title, copy, action, onAction }: { title: string; copy: string; action: string; onAction: () => void }) { return <div className="soft-grid flex min-h-[190px] flex-col items-center justify-center rounded-2xl bg-[#f7f8ff] px-5 py-7 text-center dark:bg-slate-800/60"><div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-white text-indigo-500 shadow-sm dark:bg-slate-700"><Sparkles size={19} /></div><div className="font-bold">{title}</div><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{copy}</p><button onClick={onAction} className="mt-4 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-indigo-700" data-testid="button-empty-action">{action}</button></div>; }
function PriorityDot({ priority }: { priority: Priority }) { return <span title={`${priority} priority`} className={`h-2 w-2 rounded-full ${priority === 'High' ? 'bg-rose-400' : priority === 'Medium' ? 'bg-amber-400' : 'bg-teal-400'}`} />; }
function TaskRow({ task, onToggle, onEdit, onDelete }: { task: Task; onToggle: () => void; onEdit?: () => void; onDelete?: () => void }) {
  return <div className="group flex items-center gap-3 py-3.5" data-testid={`row-task-${task.id}`}><button onClick={onToggle} aria-label={task.status === 'Completed' ? 'Mark as pending' : 'Complete task'} data-testid={`button-check-${task.id}`} className={`task-check grid h-[21px] w-[21px] shrink-0 place-items-center rounded-full border-2 ${task.status === 'Completed' ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 text-transparent hover:border-indigo-500'}`}>{task.status === 'Completed' && <Check size={13} strokeWidth={3} />}</button><div className="min-w-0 flex-1"><div className={`truncate text-sm font-semibold ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-100'}`}>{task.title}</div><div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400"><span>{task.category}</span><span className="h-1 w-1 rounded-full bg-slate-300" /><span>{task.due_time || dateLabel(task.due_date)}</span></div></div><PriorityDot priority={task.priority} />{onEdit && <button onClick={onEdit} aria-label="Edit task" className="rounded-lg p-2 text-slate-400 opacity-0 transition hover:bg-indigo-50 hover:text-indigo-600 group-hover:opacity-100 focus:opacity-100" data-testid={`button-edit-${task.id}`}><Settings size={15} /></button>}{onDelete && <button onClick={onDelete} aria-label="Delete task" className="rounded-lg p-2 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 focus:opacity-100" data-testid={`button-delete-${task.id}`}><Trash2 size={15} /></button>}</div>;
}

function TasksPage({ tasks, loading, onAdd, onToggle, onEdit, onDelete }: { tasks: Task[]; loading: boolean; onAdd: () => void; onToggle: (t: Task) => void; onEdit: (t: Task) => void; onDelete: (t: Task) => void }) {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All categories');
  const [priority, setPriority] = useState('All priorities');
  const [status, setStatus] = useState('All status');
  const [view, setView] = useState('Everything');
  const [sort, setSort] = useState('Due date');
  const dateParam = new URLSearchParams(window.location.search).get('date');
  const filtered = useMemo(() => tasks.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${t.title} ${t.description ?? ''} ${t.category}`.toLowerCase().includes(q);
    const matchView = view === 'Everything' || (view === 'Today' && t.due_date === todayStr()) || (view === 'Upcoming' && t.due_date && t.due_date > todayStr() && t.status === 'Pending') || (view === 'Overdue' && t.due_date && t.due_date < todayStr() && t.status === 'Pending');
    return matchSearch && matchView && (category === 'All categories' || t.category === category) && (priority === 'All priorities' || t.priority === priority) && (status === 'All status' || t.status === status) && (!dateParam || t.due_date === dateParam);
  }).sort((a, b) => sort === 'Priority' ? priorities.indexOf(b.priority) - priorities.indexOf(a.priority) : sort === 'Created date' ? b.created_at.localeCompare(a.created_at) : (a.due_date || '9999').localeCompare(b.due_date || '9999')), [tasks, search, category, priority, status, view, sort, dateParam]);
  return <div className="page-enter space-y-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 text-xs font-bold uppercase tracking-[.15em] text-indigo-500">Make a little room</div><h1 className="font-[Manrope] text-3xl font-extrabold tracking-[-.05em]">My tasks</h1><p className="mt-2 text-sm text-slate-500">{tasks.length} things you’re making time for</p></div><button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700" data-testid="button-task-create"><Plus size={17} /> New task</button></div>
    <div className="flex flex-wrap gap-2">{['Everything', 'Today', 'Upcoming', 'Overdue'].map((v) => <button key={v} onClick={() => setView(v)} className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${view === v ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'border border-indigo-100 bg-white text-slate-500 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900'}`} data-testid={`filter-view-${v.toLowerCase()}`}>{v}</button>)}</div>
    <section className="rounded-[24px] border border-indigo-100/70 bg-white p-4 shadow-[0_8px_28px_rgba(48,62,112,.03)] sm:p-6 dark:border-slate-800 dark:bg-slate-900"><div className="grid gap-3 lg:grid-cols-[minmax(200px,1fr)_repeat(4,auto)]"><label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your tasks..." aria-label="Search tasks" data-testid="input-task-search" className="w-full rounded-xl border border-slate-200 bg-[#fafbfe] py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800" /></label><SelectControl label="Category" value={category} setValue={setCategory} options={['All categories', ...categories]} /><SelectControl label="Priority" value={priority} setValue={setPriority} options={['All priorities', ...priorities]} /><SelectControl label="Status" value={status} setValue={setStatus} options={['All status', 'Pending', 'Completed']} /><SelectControl label="Sort by" value={sort} setValue={setSort} options={['Due date', 'Created date', 'Priority']} /></div>
       {dateParam && <div className="mt-4 flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-2.5 text-xs font-semibold text-indigo-700">Tasks for {dateLabel(dateParam)}<button onClick={() => setLocation('/tasks')} aria-label="Clear selected date"><X size={15} /></button></div>}
      <div className="mt-5 flex items-center justify-between border-b border-slate-100 pb-3 text-[11px] font-bold uppercase tracking-[.15em] text-slate-400 dark:border-slate-800"><span><Filter size={13} className="mr-1 inline" /> Your list</span><span>{filtered.length} {filtered.length === 1 ? 'task' : 'tasks'}</span></div>
      {loading ? <div className="py-6"><SkeletonRows /></div> : filtered.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{filtered.map((t) => <TaskRow key={t.id} task={t} onToggle={() => onToggle(t)} onEdit={() => onEdit(t)} onDelete={() => onDelete(t)} />)}</div> : <div className="py-7"><EmptyState title={tasks.length ? 'Nothing in this view.' : 'Your list starts here.'} copy={tasks.length ? 'Try another filter or clear your search to see more.' : 'Add something worth making time for. You can always change the plan.'} action={tasks.length ? 'Add a task anyway' : 'Create your first task'} onAction={onAdd} /></div>}
    </section></div>;
}
function SelectControl({ label, value, setValue, options }: { label: string; value: string; setValue: (v: string) => void; options: string[] }) { return <label className="relative"><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={(e) => setValue(e.target.value)} data-testid={`select-${label.toLowerCase().replace(' ', '-')}`} className="w-full appearance-none rounded-xl border border-slate-200 bg-[#fafbfe] py-2.5 pl-3 pr-8 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{options.map((o) => <option key={o}>{o}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" /></label>; }

function TaskDialog({ task, initialDate, onClose, onSave }: { task: Task | null; initialDate?: string | null; onClose: () => void; onSave: (value: { title: string; description: string; due_date: string; due_time: string; priority: Priority; category: Category; reminder_enabled: boolean }, task: Task | null) => Promise<void> }) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [dueDate, setDueDate] = useState(task?.due_date ?? initialDate ?? todayStr());
  const [dueTime, setDueTime] = useState(task?.due_time ?? '');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'Medium');
  const [category, setCategory] = useState<Category>(task?.category ?? 'Personal');
  const [reminder, setReminder] = useState(task?.reminder_enabled ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!title.trim()) { setError('Give your task a name first.'); return; } if (title.trim().length > 120) { setError('Keep the title under 120 characters.'); return; } setSaving(true); setError(''); try { await onSave({ title: title.trim(), description: description.trim(), due_date: dueDate, due_time: dueTime, priority, category, reminder_enabled: reminder }, task); } catch (err) { setError(err instanceof Error ? err.message : 'Could not save. Please try again.'); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-[3px]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="task-dialog-title" className="page-enter max-h-[94dvh] w-full max-w-[540px] overflow-y-auto rounded-[26px] border border-indigo-100 bg-white p-6 shadow-2xl sm:p-8 dark:border-slate-700 dark:bg-slate-900"><div className="mb-6 flex items-start justify-between"><div><div className="mb-2 text-[10px] font-bold uppercase tracking-[.17em] text-indigo-500">{task ? 'Make an adjustment' : 'Make a little space'}</div><h2 id="task-dialog-title" className="font-[Manrope] text-2xl font-extrabold tracking-tight">{task ? 'Edit task' : 'A new intention'}</h2><p className="mt-1 text-xs text-slate-500">Keep it simple. You can always refine the plan.</p></div><button onClick={onClose} aria-label="Close dialog" data-testid="button-close-task-dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div>
    <form onSubmit={submit} className="space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Task name <span className="text-rose-500">*</span></span><input autoFocus maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What would you like to get done?" data-testid="input-task-title" className="w-full rounded-xl border border-slate-200 bg-[#fbfcff] px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800" /></label>
      <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">A few details</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Add a note for your future self (optional)" data-testid="input-task-description" className="w-full resize-none rounded-xl border border-slate-200 bg-[#fbfcff] px-3.5 py-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800" /></label>
      <div className="grid grid-cols-2 gap-3"><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Date</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} data-testid="input-task-due-date" className="w-full rounded-xl border border-slate-200 bg-[#fbfcff] px-3 py-2.5 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800" /></label><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Time</span><input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} data-testid="input-task-due-time" className="w-full rounded-xl border border-slate-200 bg-[#fbfcff] px-3 py-2.5 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800" /></label></div>
      <div className="grid grid-cols-2 gap-3"><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Category</span><select value={category} onChange={(e) => setCategory(e.target.value as Category)} data-testid="select-task-category" className="w-full rounded-xl border border-slate-200 bg-[#fbfcff] px-3 py-2.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800">{categories.map((c) => <option key={c}>{c}</option>)}</select></label><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Priority</span><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} data-testid="select-task-priority" className="w-full rounded-xl border border-slate-200 bg-[#fbfcff] px-3 py-2.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800">{priorities.map((p) => <option key={p}>{p}</option>)}</select></label></div>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-[#f6f7fc] px-4 py-3 dark:bg-slate-800"><input type="checkbox" checked={reminder} onChange={(e) => setReminder(e.target.checked)} data-testid="checkbox-task-reminder" className="h-4 w-4 accent-indigo-600" /><span className="flex-1"><span className="block text-xs font-bold">Reminder setting</span><span className="block text-[10px] text-slate-400">Stored preference only; no notifications are sent.</span></span><Bell size={16} className="text-slate-400" /></label>
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100" data-testid="button-cancel-task">Not now</button><button disabled={saving} type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60" data-testid="button-save-task">{saving ? 'Saving…' : task ? 'Save changes' : 'Add to my list'}</button></div>
    </form></section></div>;
}
function CalendarPage({ tasks, onAdd, onSelectDate, onToggle }: { tasks: Task[]; onAdd: (date: string) => void; onSelectDate: (date: string) => void; onToggle: (task: Task) => void }) {
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(todayStr());
  const year = month.getFullYear(); const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => i - offset + 1);
  const dayTasks = tasks.filter((t) => t.due_date === selected);
  return <div className="page-enter space-y-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 text-xs font-bold uppercase tracking-[.15em] text-indigo-500">The shape of your month</div><h1 className="font-[Manrope] text-3xl font-extrabold tracking-[-.05em]">Calendar</h1><p className="mt-2 text-sm text-slate-500">See what’s coming, and leave room to breathe.</p></div><button onClick={() => onAdd(selected)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700" data-testid="button-calendar-add"><Plus size={16} /> Add for {dateLabel(selected)}</button></div>
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]"><section className="rounded-[24px] border border-indigo-100/70 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900"><div className="mb-7 flex items-center justify-between"><div><div className="font-[Manrope] text-xl font-extrabold">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div><div className="mt-1 text-xs text-slate-400">A gentle plan, made by you</div></div><div className="flex gap-2"><button aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-indigo-50" data-testid="button-calendar-prev"><ArrowLeft size={16} /></button><button aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-indigo-50" data-testid="button-calendar-next"><ArrowRight size={16} /></button></div></div>
      <div className="grid grid-cols-7 gap-1 text-center">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="pb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">{day}</div>)}{cells.map((num, idx) => { const valid = num > 0 && num <= days; const key = valid ? `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(num).padStart(2, '0')}` : ''; const count = tasks.filter((t) => t.due_date === key).length; const isToday = key === todayStr(); return <button key={idx} disabled={!valid} onClick={() => setSelected(key)} data-testid={valid ? `calendar-date-${key}` : undefined} aria-label={valid ? `${month.toLocaleDateString('en-US', { month: 'long' })} ${num}${count ? `, ${count} tasks` : ''}` : undefined} className={`relative flex min-h-[57px] flex-col items-center justify-center rounded-xl text-sm transition sm:min-h-[75px] ${!valid ? 'pointer-events-none' : 'hover:bg-indigo-50'} ${selected === key ? 'bg-indigo-600 font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700' : isToday ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-slate-600 dark:text-slate-300'}`}><span>{valid ? num : ''}</span>{count > 0 && <span className={`mt-1 h-1 w-1 rounded-full ${selected === key ? 'bg-white' : 'bg-indigo-500'}`} />}{isToday && selected !== key && <span className="absolute bottom-1 text-[8px] font-bold uppercase text-indigo-500">Today</span>}</button>; })}</div>
    </section>
    <section className="rounded-[24px] border border-indigo-100/70 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900"><div className="mb-5 flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">Selected day</div><h2 className="mt-1 font-[Manrope] text-xl font-extrabold">{new Date(`${selected}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2></div><CalendarDays className="text-indigo-500" /></div>
      {dayTasks.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{dayTasks.map((t) => <TaskRow key={t.id} task={t} onToggle={() => onToggle(t)} />)}</div> : <EmptyState title="A day with room in it." copy="Nothing planned for this day yet. Keep it open, or add something you care about." action="Add to this day" onAction={() => onAdd(selected)} />}
      {dayTasks.length > 0 && <button onClick={() => onSelectDate(selected)} className="mt-5 text-xs font-bold text-indigo-600" data-testid="button-calendar-view-day">View tasks on this day <ArrowRight size={14} className="ml-1 inline" /></button>}</section></div></div>;
}

function Analytics({ tasks, loading }: { tasks: Task[]; loading: boolean }) {
  const stats = getTaskStatistics(tasks);
  const categoriesStats = categories.map((category) => ({ category, total: tasks.filter((t) => t.category === category).length, completed: tasks.filter((t) => t.category === category && t.status === 'Completed').length })).filter((x) => x.total);
  const daily = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const date = localDateKey(d); return { date, label: d.toLocaleDateString('en-US', { weekday: 'short' }), completed: tasks.filter((t) => t.status === 'Completed' && t.updated_at?.slice(0, 10) === date).length }; });
  const maxDaily = Math.max(1, ...daily.map((d) => d.completed));
  return <div className="page-enter space-y-7"><div><div className="mb-2 text-xs font-bold uppercase tracking-[.15em] text-indigo-500">Your progress, in perspective</div><h1 className="font-[Manrope] text-3xl font-extrabold tracking-[-.05em]">A look back</h1><p className="mt-2 text-sm text-slate-500">The small things add up. Here’s how your week is taking shape.</p></div>
    <div className="grid gap-4 sm:grid-cols-3"><StatCard label="Tasks completed" value={stats.completed} note="all time" icon={<CheckCircle2 />} tone="teal" /><StatCard label="Still in progress" value={stats.pending} note="ready when you are" icon={<ListTodo />} tone="indigo" /><div className="rounded-[21px] border border-indigo-100/70 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">Completion rate</span><Target className="text-[#946bc1]" size={19} /></div><div className="mt-5 flex items-baseline gap-2"><span className="font-[Manrope] text-3xl font-extrabold">{stats.completion}%</span><span className="text-[11px] text-slate-400">of all tasks</span></div><div className="mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full rounded-full bg-[#9b7bd1] transition-all" style={{ width: `${stats.completion}%` }} /></div></div></div>
    <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]"><section className="rounded-[24px] border border-indigo-100/70 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900"><div className="mb-6"><div className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">Last seven days</div><h2 className="mt-1 font-[Manrope] text-xl font-extrabold">A week of follow-through</h2></div>{loading ? <SkeletonRows /> : <div className="flex h-52 items-end justify-around gap-3 border-b border-slate-100 pb-2 dark:border-slate-800">{daily.map((d, i) => <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-bold text-slate-500">{d.completed || ''}</span><div className={`bar-fill w-full max-w-[42px] rounded-t-xl ${i === 6 ? 'bg-indigo-500' : 'bg-[#dbe2fb]'}`} style={{ height: `${Math.max(5, d.completed / maxDaily * 100)}%` }} /><span className="text-[10px] font-semibold text-slate-400">{d.label}</span></div>)}</div>}<p className="mt-4 text-xs text-slate-400">Counted by the day each task was marked complete.</p></section>
      <section className="rounded-[24px] border border-indigo-100/70 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900"><div className="mb-6"><div className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">Where it goes</div><h2 className="mt-1 font-[Manrope] text-xl font-extrabold">By category</h2></div>{categoriesStats.length ? <div className="space-y-5">{categoriesStats.map((item, i) => <div key={item.category} data-testid={`category-stat-${item.category.toLowerCase()}`}><div className="mb-2 flex items-center justify-between text-xs"><span className="font-bold">{item.category}</span><span className="text-slate-400">{item.completed} of {item.total} complete</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className={`h-full rounded-full ${['bg-indigo-500', 'bg-teal-400', 'bg-amber-400', 'bg-violet-400', 'bg-rose-400'][i % 5]}`} style={{ width: `${item.total ? item.completed / item.total * 100 : 0}%` }} /></div></div>)}</div> : <div className="rounded-2xl bg-[#f7f8ff] px-5 py-12 text-center dark:bg-slate-800"><div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-white text-indigo-500 dark:bg-slate-700"><Sparkles size={18} /></div><div className="text-sm font-bold">Your story is still unfolding.</div><p className="mx-auto mt-1 max-w-[230px] text-xs leading-5 text-slate-500">Add and complete a few tasks to see your rhythm by category.</p></div>}</section></div>
    <section className="rounded-[24px] border border-indigo-100/70 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900"><div className="mb-5"><div className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">Daily summary</div><h2 className="mt-1 font-[Manrope] text-xl font-extrabold">Your last seven days</h2></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">{daily.map((d) => <div key={d.date} className="rounded-xl bg-[#f6f7fc] px-3 py-3 dark:bg-slate-800" data-testid={`daily-summary-${d.date}`}><div className="text-[10px] font-bold uppercase text-slate-400">{new Date(`${d.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div><div className="mt-2 font-[Manrope] text-xl font-extrabold">{d.completed}</div><div className="text-[10px] text-slate-400">{d.completed === 1 ? 'task completed' : 'tasks completed'}</div></div>)}</div></section></div>;
}

function SettingsPage({ dark, setDark }: { dark: boolean; setDark: (value: boolean) => void }) {
  const auth = useAuth(); const [, setLocation] = useLocation(); const [message, setMessage] = useState('');
  return <div className="page-enter max-w-[900px] space-y-7"><div><div className="mb-2 text-xs font-bold uppercase tracking-[.15em] text-indigo-500">Make it yours</div><h1 className="font-[Manrope] text-3xl font-extrabold tracking-[-.05em]">Settings</h1><p className="mt-2 text-sm text-slate-500">A few preferences for your personal space.</p></div>
    <section className="rounded-[24px] border border-indigo-100/70 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900"><div className="mb-6"><div className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">Your account</div><h2 className="mt-1 font-[Manrope] text-xl font-extrabold">The details</h2></div><div className="flex items-center gap-4 rounded-2xl bg-[#f6f7fc] p-4 dark:bg-slate-800"><div className="grid h-12 w-12 place-items-center rounded-full bg-indigo-100 text-lg font-bold uppercase text-indigo-700">{(auth.fullName || auth.user?.email || 'Y').slice(0, 1)}</div><div><div className="font-bold" data-testid="text-profile-name">{auth.fullName || 'Add your name'}</div><div className="mt-1 text-xs text-slate-500" data-testid="text-profile-email">{auth.user?.email}</div></div><div className="ml-auto rounded-full bg-white px-3 py-1 text-[10px] font-bold text-teal-700 dark:bg-slate-700">Personal plan</div></div><p className="mt-3 text-xs text-slate-400">Your account details are managed securely with your sign-in provider.</p></section>
    <section className="rounded-[24px] border border-indigo-100/70 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900"><div className="mb-6"><div className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">Comfort</div><h2 className="mt-1 font-[Manrope] text-xl font-extrabold">How it feels</h2></div><div className="flex items-center justify-between gap-4"><div><div className="text-sm font-bold">Dark appearance</div><div className="mt-1 text-xs text-slate-500">Switch to a softer, low-light palette.</div></div><button role="switch" aria-checked={dark} onClick={() => setDark(!dark)} data-testid="switch-theme" className={`relative h-7 w-12 rounded-full transition-colors ${dark ? 'bg-indigo-600' : 'bg-slate-200'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-6' : 'translate-x-1'}`} /></button></div></section>
    <section className="rounded-[24px] border border-rose-100 bg-[#fffafa] p-5 sm:p-7 dark:border-rose-900/30 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="text-sm font-bold">Sign out</div><div className="mt-1 text-xs text-slate-500">Your tasks stay safely on your account.</div></div><button onClick={async () => { try { await auth.signOut(); setLocation('/login'); } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not sign out.'); } }} className="flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50" data-testid="button-settings-signout"><LogOut size={15} />Sign out</button></div>{message && <p role="alert" className="mt-3 text-xs text-rose-600">{message}</p>}</section></div>;
}

function AuthPage({ route }: { route: string }) {
  const auth = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const isSignup = route === '/register'; const isForgot = route === '/forgot-password'; const isReset = route === '/reset-password';
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!isReset && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
    if (isSignup && !name.trim()) { setError('Add your name so your space feels personal.'); return; }
    if (isForgot) { setLoading(true); try { await auth.sendReset(email.trim()); setSuccess('If an account exists for that email, a reset link is on its way.'); } catch (e) { setError(e instanceof Error ? e.message : 'Could not send reset email.'); } finally { setLoading(false); } return; }
    if (password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    if (isReset && password !== confirm) { setError('Those passwords do not match.'); return; }
    setLoading(true);
    try {
      if (isSignup) { await auth.signUp(name.trim(), email.trim(), password); setSuccess('Your account is ready. Check your inbox if email confirmation is enabled.'); }
      else if (isReset) { await auth.updatePassword(password); setSuccess('Password updated. You can sign in with your new password.'); setTimeout(() => setLocation('/login'), 1000); }
      else { await auth.signIn(email.trim(), password); setLocation('/'); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); } finally { setLoading(false); }
  };
  if (auth.user && !isForgot && !isReset) { setLocation('/'); return null; }
  return <div className="min-h-[100dvh] bg-[#f4f6fc] dark:bg-slate-950"><div className="grid min-h-[100dvh] lg:grid-cols-[.85fr_1.15fr]">
    <div className="relative hidden overflow-hidden bg-[#e7ebfb] p-12 dark:bg-slate-900 lg:flex lg:flex-col lg:justify-between"><div className="absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-indigo-200/50 blur-3xl" /><div className="absolute bottom-[-90px] right-[-70px] h-96 w-96 rounded-full bg-[#c9d7f9]/70 blur-3xl" /><div className="relative"><Brand /></div><div className="relative max-w-lg pb-12"><div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-white text-indigo-600 shadow-sm"><Sparkles size={21} /></div><h1 className="font-[Manrope] text-[46px] font-extrabold leading-[1.08] tracking-[-.06em]">A little more<br />space for <span className="text-indigo-600">you.</span></h1><p className="mt-5 max-w-sm text-sm leading-6 text-slate-500">A softer place to hold the things you want to do, at a pace that feels like yours.</p><div className="mt-10 flex items-center gap-3"><div className="flex -space-x-2"><span className="h-8 w-8 rounded-full border-2 border-[#e7ebfb] bg-[#d3e9df]" /><span className="h-8 w-8 rounded-full border-2 border-[#e7ebfb] bg-[#f4d9c9]" /><span className="h-8 w-8 rounded-full border-2 border-[#e7ebfb] bg-[#d8d1ef]" /></div><span className="text-xs font-medium text-slate-500">Your plans. Your pace. Your space.</span></div></div><div className="relative text-[10px] font-semibold uppercase tracking-[.18em] text-slate-400">DAYWELL · PERSONAL PLANNING</div></div>
    <div className="flex min-h-[100dvh] flex-col px-5 py-6 sm:px-10"><div className="lg:hidden"><Brand /></div><div className="mx-auto my-auto w-full max-w-[410px] py-10"><div className="mb-8 lg:hidden"><div className="mt-12 text-xs font-bold uppercase tracking-[.16em] text-indigo-500">A little more space for you</div></div><div className="mb-7"><div className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-indigo-500">{isSignup ? 'A space that’s yours' : isForgot ? 'A fresh start' : isReset ? 'Choose a new password' : 'Welcome back'}</div><h2 className="font-[Manrope] text-3xl font-extrabold tracking-[-.05em]">{isSignup ? 'Let’s make it personal.' : isForgot ? 'Find your way back.' : isReset ? 'Set a new password.' : 'Your day, your way.'}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{isSignup ? 'Create an account and start with a little breathing room.' : isForgot ? 'We’ll send you a link to reset your password.' : isReset ? 'Pick a password you haven’t used before.' : 'Sign in to pick up right where you left off.'}</p></div>
      {auth.configError && <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Supabase isn’t configured yet. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable sign-in.</div>}
      <form onSubmit={submit} className="space-y-4" noValidate>{isSignup && <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Your name</span><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="How should we call you?" data-testid="input-auth-name" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900" /></label>}
        {!isReset && <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Email address</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" data-testid="input-auth-email" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900" /></label>}
        {!isForgot && <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">{isReset ? 'New password' : 'Password'}</span><input type="password" autoComplete={isSignup || isReset ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" data-testid="input-auth-password" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900" /></label>}
        {isReset && <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Confirm password</span><input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type it once more" data-testid="input-auth-confirm-password" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900" /></label>}
        {!isSignup && !isForgot && !isReset && <div className="flex justify-end"><Link href="/forgot-password" data-testid="link-forgot-password" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Forgot password?</Link></div>}
        {error && <p role="alert" data-testid="status-auth-error" className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700">{error}</p>}{success && <p role="status" data-testid="status-auth-success" className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-700">{success}</p>}
        <button disabled={loading || auth.configError} type="submit" data-testid="button-auth-submit" className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200/70 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-55">{loading ? 'One moment…' : isSignup ? 'Create my space' : isForgot ? 'Send reset link' : isReset ? 'Update password' : 'Sign in'}{!loading && <ArrowRight size={16} />}</button>
      </form>
      <div className="mt-6 text-center text-xs text-slate-500">{isForgot || isReset ? <Link href="/login" data-testid="link-back-login" className="inline-flex items-center gap-1 font-bold text-indigo-600"><ArrowLeft size={14} />Back to sign in</Link> : isSignup ? <>Already have a space? <Link href="/login" data-testid="link-login" className="font-bold text-indigo-600">Sign in</Link></> : <>New to Daywell? <Link href="/register" data-testid="link-register" className="font-bold text-indigo-600">Make your space</Link></>}</div>
    </div><div className="mt-auto pt-5 text-center text-[10px] font-medium text-slate-400 lg:hidden">Your plans. Your pace. Your space.</div></div>
  </div></div>;
}
function NotFound() { return <div className="flex min-h-[55vh] flex-col items-center justify-center text-center"><div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-100 text-indigo-600"><Search /></div><h1 className="font-[Manrope] text-2xl font-extrabold">This page wandered off.</h1><p className="mt-2 text-sm text-slate-500">Let’s get you back to your plans.</p><Link href="/" className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white" data-testid="link-home">Back to overview</Link></div>; }

export default App;