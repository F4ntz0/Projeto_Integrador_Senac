import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Circle,
  Clock3, Filter, LayoutDashboard, ListTodo, LogOut, Menu, Plus,
  Search, Settings, Tag, Trash2, UserRound, X, Pencil, Bell,
  AlertCircle, Check, Loader2
} from "lucide-react";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

async function api(path, options = {}) {
  const token = localStorage.getItem("taskflow_token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) throw new Error(body?.error || "Não foi possível concluir a operação.");
  return body;
}

const priorityLabel = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" };
const statusLabel = { PENDING: "Pendente", COMPLETED: "Concluída", CANCELLED: "Cancelada" };

function App() {
  const [token, setToken] = useState(localStorage.getItem("taskflow_token"));
  const [user, setUser] = useState(null);

  if (!token) {
    return <AuthScreen onLogin={(data) => {
      localStorage.setItem("taskflow_token", data.token);
      setToken(data.token);
      setUser(data.user);
    }} />;
  }

  return <Dashboard
    user={user}
    onLogout={() => {
      localStorage.removeItem("taskflow_token");
      setToken(null);
      setUser(null);
    }}
  />;
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api(`/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        body: JSON.stringify(form)
      });
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand brand-center">
          <div className="brand-icon"><CheckCircle2 size={23} /></div>
          <span>TaskFlow</span>
        </div>
        <p className="auth-kicker">GERENCIADOR DE TAREFAS PESSOAIS</p>
        <h1>{mode === "login" ? "Organize seu dia." : "Crie sua conta."}</h1>
        <p className="auth-subtitle">
          {mode === "login"
            ? "Centralize suas tarefas, compromissos e prazos em um só lugar."
            : "Comece a organizar sua rotina acadêmica, profissional e pessoal."}
        </p>

        <form onSubmit={submit} className="auth-form">
          {mode === "register" && (
            <label>
              Nome
              <input
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Seu nome"
              />
            </label>
          )}
          <label>
            E-mail
            <input
              required
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="voce@email.com"
            />
          </label>
          <label>
            Senha
            <input
              required
              minLength="6"
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo de 6 caracteres"
            />
          </label>

          {error && <div className="error-box"><AlertCircle size={17}/>{error}</div>}

          <button className="primary-button full" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18}/> : null}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button className="text-button" onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError("");
        }}>
          {mode === "login" ? "Ainda não tenho uma conta" : "Já tenho uma conta"}
        </button>
      </section>
    </main>
  );
}

function Dashboard({ user, onLogout }) {
  const [currentUser, setCurrentUser] = useState(user);
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({ search: "", status: "", priority: "", categoryId: "" });
  const [loading, setLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [me, cats, taskData] = await Promise.all([
        api("/auth/me"),
        api("/categories"),
        api("/tasks")
      ]);
      setCurrentUser(me);
      setCategories(cats);
      setTasks(taskData);
    } catch (err) {
      setToast(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredTasks = useMemo(() => tasks.filter(t => {
    const q = filters.search.trim().toLowerCase();
    return (!q || t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q))
      && (!filters.status || t.status === filters.status)
      && (!filters.priority || t.priority === filters.priority)
      && (!filters.categoryId || String(t.categoryId) === String(filters.categoryId));
  }), [tasks, filters]);

  async function saveTask(data) {
    try {
      const result = editing
        ? await api(`/tasks/${editing.id}`, { method: "PUT", body: JSON.stringify(data) })
        : await api("/tasks", { method: "POST", body: JSON.stringify(data) });

      setTasks(prev => editing
        ? prev.map(t => t.id === result.id ? result : t)
        : [result, ...prev]);
      setShowModal(false);
      setEditing(null);
      setToast(editing ? "Tarefa atualizada." : "Tarefa criada.");
    } catch (err) {
      setToast(err.message);
    }
  }

  async function completeTask(task) {
    try {
      const result = await api(`/tasks/${task.id}/complete`, { method: "PATCH" });
      setTasks(prev => prev.map(t => t.id === task.id ? result.task : t));
      setToast("Tarefa concluída.");
    } catch (err) { setToast(err.message); }
  }

  async function deleteTask(task) {
    if (!confirm(`Excluir "${task.title}"?`)) return;
    try {
      await api(`/tasks/${task.id}`, { method: "DELETE" });
      setTasks(prev => prev.filter(t => t.id !== task.id));
      setToast("Tarefa excluída.");
    } catch (err) { setToast(err.message); }
  }

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(task) {
    setEditing(task);
    setShowModal(true);
  }

  const pending = tasks.filter(t => t.status === "PENDING");
  const completed = tasks.filter(t => t.status === "COMPLETED");
  const high = pending.filter(t => t.priority === "HIGH");
  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter(t => t.dueDate === today && t.status === "PENDING");

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><CheckCircle2 size={22} /></div>
          <span>TaskFlow</span>
        </div>

        <div className="side-section-title">MENU</div>
        <nav>
          <NavItem active={page === "dashboard"} icon={<LayoutDashboard size={19}/>} text="Visão geral" onClick={() => {setPage("dashboard"); setMobileNav(false)}}/>
          <NavItem active={page === "tasks"} icon={<ListTodo size={19}/>} text="Minhas tarefas" onClick={() => {setPage("tasks"); setMobileNav(false)}} badge={pending.length}/>
          <NavItem active={page === "calendar"} icon={<CalendarDays size={19}/>} text="Calendário" onClick={() => {setPage("calendar"); setMobileNav(false)}}/>
          <NavItem active={page === "categories"} icon={<Tag size={19}/>} text="Categorias" onClick={() => {setPage("categories"); setMobileNav(false)}}/>
        </nav>

        <div className="sidebar-bottom">
          <div className="side-section-title">CONTA</div>
          <NavItem icon={<UserRound size={19}/>} text="Meu perfil" onClick={() => setPage("profile")}/>
          <NavItem icon={<Settings size={19}/>} text="Configurações" onClick={() => setToast("Configurações estarão disponíveis em uma próxima versão.")}/>
          <button className="logout-button" onClick={onLogout}><LogOut size={18}/> Sair</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}><Menu/></button>
          <div className="topbar-title">
            <span>Olá, {currentUser?.name?.split(" ")[0] || "usuário"} 👋</span>
            <small>Vamos deixar o dia mais organizado.</small>
          </div>
          <button className="user-avatar" title={currentUser?.email}>
            {(currentUser?.name || "U").charAt(0).toUpperCase()}
          </button>
        </header>

        <div className="content">
          {page === "dashboard" && (
            <DashboardHome
              pending={pending}
              completed={completed}
              high={high}
              todayTasks={todayTasks}
              onCreate={openCreate}
              onComplete={completeTask}
              onEdit={openEdit}
              onDelete={deleteTask}
              onTasks={() => setPage("tasks")}
            />
          )}

          {page === "tasks" && (
            <TasksPage
              tasks={filteredTasks}
              categories={categories}
              filters={filters}
              setFilters={setFilters}
              onCreate={openCreate}
              onComplete={completeTask}
              onEdit={openEdit}
              onDelete={deleteTask}
              loading={loading}
            />
          )}

          {page === "calendar" && (
            <CalendarPage tasks={tasks} onCreate={openCreate} onEdit={openEdit}/>
          )}

          {page === "categories" && (
            <CategoriesPage categories={categories} tasks={tasks} onRefresh={loadData} onToast={setToast}/>
          )}

          {page === "profile" && <ProfilePage user={currentUser}/>}
        </div>
      </main>

      {showModal && (
        <TaskModal
          task={editing}
          categories={categories}
          onClose={() => {setShowModal(false); setEditing(null)}}
          onSave={saveTask}
        />
      )}

      {toast && <div className="toast"><Check size={17}/>{toast}</div>}
    </div>
  );
}

function NavItem({ active, icon, text, badge, onClick }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      {icon}<span>{text}</span>{badge > 0 && <b>{badge}</b>}
    </button>
  );
}

function DashboardHome({ pending, completed, high, todayTasks, onCreate, onComplete, onEdit, onDelete, onTasks }) {
  const progress = pending.length + completed.length
    ? Math.round((completed.length / (pending.length + completed.length)) * 100)
    : 0;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">VISÃO GERAL</p>
          <h1>Seu dia em foco</h1>
          <p className="muted">Acompanhe o que precisa ser feito e mantenha seus prazos sob controle.</p>
        </div>
        <button className="primary-button" onClick={onCreate}><Plus size={18}/> Nova tarefa</button>
      </div>

      <section className="stats-grid">
        <StatCard icon={<ListTodo/>} label="Pendentes" value={pending.length} hint="tarefas em aberto"/>
        <StatCard icon={<CheckCircle2/>} label="Concluídas" value={completed.length} hint="tarefas finalizadas"/>
        <StatCard icon={<AlertCircle/>} label="Alta prioridade" value={high.length} hint="exigem atenção"/>
        <StatCard icon={<CalendarDays/>} label="Hoje" value={todayTasks.length} hint="para hoje"/>
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Próximas tarefas</h2>
              <span>{pending.length} pendentes</span>
            </div>
            <button className="link-button" onClick={onTasks}>Ver todas <ChevronRight size={16}/></button>
          </div>

          {pending.length === 0 ? <EmptyState title="Tudo em dia!" text="Você não possui tarefas pendentes."/> :
            <div className="task-list">
              {pending.slice(0, 6).map(task =>
                <TaskRow key={task.id} task={task} onComplete={onComplete} onEdit={onEdit} onDelete={onDelete}/>
              )}
            </div>
          }
        </section>

        <section className="panel progress-panel">
          <div className="panel-heading"><div><h2>Seu progresso</h2><span>Resumo geral</span></div></div>
          <div className="progress-circle" style={{"--progress": `${progress * 3.6}deg`}}>
            <div><strong>{progress}%</strong><span>concluído</span></div>
          </div>
          <div className="progress-detail">
            <div><span><i className="dot pending-dot"/>Pendentes</span><strong>{pending.length}</strong></div>
            <div><span><i className="dot done-dot"/>Concluídas</span><strong>{completed.length}</strong></div>
          </div>
        </section>
      </div>
    </>
  );
}

function StatCard({ icon, label, value, hint }) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{hint}</small></div></div>;
}

function TasksPage({ tasks, categories, filters, setFilters, onCreate, onComplete, onEdit, onDelete, loading }) {
  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">TAREFAS</p><h1>Minhas tarefas</h1><p className="muted">Gerencie suas atividades e acompanhe seus prazos.</p></div>
        <button className="primary-button" onClick={onCreate}><Plus size={18}/> Nova tarefa</button>
      </div>

      <section className="panel">
        <div className="filters">
          <div className="search-box"><Search size={18}/><input value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} placeholder="Buscar tarefa..."/></div>
          <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
            <option value="">Todos os status</option><option value="PENDING">Pendentes</option><option value="COMPLETED">Concluídas</option><option value="CANCELLED">Canceladas</option>
          </select>
          <select value={filters.priority} onChange={e => setFilters({...filters, priority: e.target.value})}>
            <option value="">Todas as prioridades</option><option value="HIGH">Alta</option><option value="MEDIUM">Média</option><option value="LOW">Baixa</option>
          </select>
          <select value={filters.categoryId} onChange={e => setFilters({...filters, categoryId: e.target.value})}>
            <option value="">Todas as categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="results-label"><Filter size={15}/> {tasks.length} tarefa(s) encontrada(s)</div>
        {loading ? <div className="loading"><Loader2 className="spin"/> Carregando...</div> :
          tasks.length === 0 ? <EmptyState title="Nenhuma tarefa encontrada" text="Tente alterar os filtros ou crie uma nova tarefa."/> :
          <div className="task-list">{tasks.map(task => <TaskRow key={task.id} task={task} onComplete={onComplete} onEdit={onEdit} onDelete={onDelete}/>)}</div>
        }
      </section>
    </>
  );
}

function TaskRow({ task, onComplete, onEdit, onDelete }) {
  const overdue = task.status === "PENDING" && task.dueDate && task.dueDate < new Date().toISOString().slice(0,10);
  return (
    <article className={`task-row ${task.status === "COMPLETED" ? "completed" : ""}`}>
      <button className="check-task" onClick={() => task.status !== "COMPLETED" && onComplete(task)} title="Concluir">
        {task.status === "COMPLETED" ? <CheckCircle2 size={21}/> : <Circle size={21}/>}
      </button>
      <div className="task-main">
        <h3>{task.title}</h3>
        {task.description && <p>{task.description}</p>}
        <div className="task-meta">
          {task.categoryName && <span className="category-chip" style={{"--chip": task.categoryColor || "var(--accent)"}}>{task.categoryName}</span>}
          {task.dueDate && <span className={overdue ? "overdue" : ""}><CalendarDays size={14}/>{formatDate(task.dueDate)} {task.dueTime ? `• ${task.dueTime}` : ""}</span>}
          {task.reminderMinutes != null && <span><Bell size={14}/> {task.reminderMinutes} min antes</span>}
        </div>
      </div>
      <span className={`priority ${task.priority.toLowerCase()}`}>{priorityLabel[task.priority]}</span>
      <div className="row-actions">
        <button onClick={() => onEdit(task)} title="Editar"><Pencil size={16}/></button>
        <button onClick={() => onDelete(task)} title="Excluir"><Trash2 size={16}/></button>
      </div>
    </article>
  );
}

function TaskModal({ task, categories, onClose, onSave }) {
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    dueDate: task?.dueDate || "",
    dueTime: task?.dueTime || "",
    priority: task?.priority || "MEDIUM",
    categoryId: task?.categoryId || "",
    reminderMinutes: task?.reminderMinutes ?? ""
  });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave({
      ...form,
      title: form.title.trim(),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      reminderMinutes: form.reminderMinutes === "" ? null : Number(form.reminderMinutes)
    });
    setSaving(false);
  }

  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="modal">
      <div className="modal-header"><div><p className="eyebrow">TAREFA</p><h2>{task ? "Editar tarefa" : "Nova tarefa"}</h2></div><button className="icon-button" onClick={onClose}><X/></button></div>
      <form onSubmit={submit}>
        <label>Título<input autoFocus required value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="Ex.: Entregar trabalho da faculdade"/></label>
        <label>Descrição<textarea value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Adicione detalhes importantes..."/></label>
        <div className="form-grid">
          <label>Data<input type="date" value={form.dueDate} onChange={e => setForm({...form,dueDate:e.target.value})}/></label>
          <label>Horário<input type="time" value={form.dueTime} onChange={e => setForm({...form,dueTime:e.target.value})}/></label>
        </div>
        <div className="form-grid">
          <label>Prioridade<select value={form.priority} onChange={e => setForm({...form,priority:e.target.value})}><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option></select></label>
          <label>Categoria<select value={form.categoryId} onChange={e => setForm({...form,categoryId:e.target.value})}><option value="">Sem categoria</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        </div>
        <label>Lembrete<select value={form.reminderMinutes} onChange={e => setForm({...form,reminderMinutes:e.target.value})}><option value="">Sem lembrete</option><option value="5">5 minutos antes</option><option value="15">15 minutos antes</option><option value="30">30 minutos antes</option><option value="60">1 hora antes</option><option value="1440">1 dia antes</option></select></label>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? <Loader2 className="spin" size={17}/> : <Check size={17}/>} {task ? "Salvar alterações" : "Criar tarefa"}</button></div>
      </form>
    </section>
  </div>;
}

function CalendarPage({ tasks, onCreate, onEdit }) {
  const [cursor, setCursor] = useState(new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const start = (first.getDay() + 6) % 7;
  const cells = [...Array(start).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)];
  const monthTasks = tasks.filter(t => t.dueDate?.startsWith(`${year}-${String(month+1).padStart(2,"0")}`));
  const dayTasks = d => monthTasks.filter(t => t.dueDate === `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);

  return <>
    <div className="page-heading"><div><p className="eyebrow">AGENDA</p><h1>Calendário</h1><p className="muted">Visualize seus compromissos por data.</p></div><button className="primary-button" onClick={onCreate}><Plus size={18}/> Nova tarefa</button></div>
    <section className="panel calendar-panel">
      <div className="calendar-head"><button className="icon-button" onClick={() => setCursor(new Date(year,month-1,1))}><ChevronLeft/></button><h2>{cursor.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</h2><button className="icon-button" onClick={() => setCursor(new Date(year,month+1,1))}><ChevronRight/></button></div>
      <div className="calendar-week">{["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(d=><span key={d}>{d}</span>)}</div>
      <div className="calendar-grid">{cells.map((d,i) => <div key={i} className={`calendar-day ${!d ? "blank" : ""} ${d && dayTasks(d).length ? "has-tasks" : ""}`}>
        {d && <><span className="day-number">{d}</span><div className="day-events">{dayTasks(d).slice(0,3).map(t=><button key={t.id} className={`calendar-event ${t.priority.toLowerCase()}`} onClick={()=>onEdit(t)}>{t.dueTime || "•"} {t.title}</button>)}</div></>}
      </div>)}</div>
    </section>
  </>;
}

function CategoriesPage({ categories, tasks, onRefresh, onToast }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6d5dfc");

  async function add(e) {
    e.preventDefault();
    try {
      await api("/categories", { method:"POST", body:JSON.stringify({name,color}) });
      setName(""); onRefresh(); onToast("Categoria criada.");
    } catch(err) { onToast(err.message); }
  }

  async function remove(cat) {
    if (!confirm(`Excluir a categoria "${cat.name}"?`)) return;
    try { await api(`/categories/${cat.id}`, {method:"DELETE"}); onRefresh(); onToast("Categoria excluída."); }
    catch(err) { onToast(err.message); }
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">ORGANIZAÇÃO</p><h1>Categorias</h1><p className="muted">Separe suas atividades por contexto.</p></div></div>
    <div className="category-layout">
      <section className="panel"><div className="panel-heading"><div><h2>Nova categoria</h2><span>Ex.: Faculdade, Trabalho, Pessoal</span></div></div>
        <form className="category-form" onSubmit={add}><label>Nome<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Nome da categoria"/></label><label>Cor<input className="color-input" type="color" value={color} onChange={e=>setColor(e.target.value)}/></label><button className="primary-button"><Plus size={17}/> Adicionar</button></form>
      </section>
      <section className="panel"><div className="panel-heading"><div><h2>Suas categorias</h2><span>{categories.length} cadastradas</span></div></div>
        {categories.length===0 ? <EmptyState title="Nenhuma categoria" text="Crie sua primeira categoria."/> :
          <div className="category-list">{categories.map(c=><div className="category-item" key={c.id}><span className="category-color" style={{background:c.color||"var(--accent)"}}/><div><strong>{c.name}</strong><small>{tasks.filter(t=>t.categoryId===c.id).length} tarefa(s)</small></div><button onClick={()=>remove(c)}><Trash2 size={16}/></button></div>)}</div>}
      </section>
    </div>
  </>;
}

function ProfilePage({ user }) {
  return <><div className="page-heading"><div><p className="eyebrow">CONTA</p><h1>Meu perfil</h1><p className="muted">Informações da sua conta.</p></div></div>
    <section className="panel profile-card"><div className="profile-big-avatar">{(user?.name||"U").charAt(0)}</div><div><h2>{user?.name}</h2><p>{user?.email}</p><span className="status-badge"><Check size={14}/> Conta ativa</span></div></section>
  </>;
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><div className="empty-icon"><ListTodo size={24}/></div><h3>{title}</h3><p>{text}</p></div>;
}

function formatDate(date) {
  if (!date) return "";
  const [y,m,d] = date.split("-");
  return `${d}/${m}/${y}`;
}

createRoot(document.getElementById("root")).render(<App />);
