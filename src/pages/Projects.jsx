import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Plus, FolderOpen, Trash2, Edit, ChevronDown, ChevronUp,
  Users, Calendar, CheckCircle2, Circle, Clock, AlertTriangle,
  BarChart3, Target, Zap, ListTodo
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

const TYPES = ['clima', 'refrigeracion', 'electrico', 'solar', 'mixto'];
const STATUSES = ['planificacion', 'en_curso', 'pausado', 'completado', 'cancelado'];
const STATUS_COLORS = {
  planificacion: 'bg-gray-100 text-gray-700 border-gray-300',
  en_curso: 'bg-blue-100 text-blue-700 border-blue-300',
  pausado: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  completado: 'bg-green-100 text-green-700 border-green-300',
  cancelado: 'bg-red-100 text-red-700 border-red-300',
};
const TYPE_COLORS = { clima: 'bg-sky-500', refrigeracion: 'bg-cyan-500', electrico: 'bg-yellow-500', solar: 'bg-amber-500', mixto: 'bg-purple-500' };

const EMPTY_FORM = {
  name: '', contact_id: '', contact_name: '', description: '', type: 'clima',
  status: 'planificacion', start_date: format(new Date(), 'yyyy-MM-dd'), end_date: '',
  budget: 0, progress: 0, tasks: [], notes: '', priority: 'media',
};

function TaskRow({ task, onChange, onDelete }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
      <button onClick={() => onChange({ ...task, status: task.status === 'completada' ? 'pendiente' : 'completada' })}>
        {task.status === 'completada'
          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
          : <Circle className="w-4 h-4 text-gray-300" />}
      </button>
      <Input className={`h-7 text-xs flex-1 ${task.status === 'completada' ? 'line-through text-gray-400' : ''}`}
        value={task.task} onChange={e => onChange({ ...task, task: e.target.value })} />
      <Select value={task.status} onValueChange={v => onChange({ ...task, status: v })}>
        <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="pendiente">Pendiente</SelectItem>
          <SelectItem value="en_curso">En curso</SelectItem>
          <SelectItem value="completada">Completada</SelectItem>
        </SelectContent>
      </Select>
      <Input className="h-7 text-xs w-28" placeholder="Asignado a" value={task.assigned_to || ''}
        onChange={e => onChange({ ...task, assigned_to: e.target.value })} />
      <button onClick={onDelete} className="text-red-300 hover:text-red-500 flex-shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ProjectCard({ project, onEdit, onDelete, onTaskToggle, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const daysLeft = project.end_date
    ? differenceInDays(parseISO(project.end_date), new Date())
    : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && project.status !== 'completado';
  const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && project.status === 'en_curso';
  const tasksDone = (project.tasks || []).filter(t => t.status === 'completada').length;
  const tasksTotal = (project.tasks || []).length;

  return (
    <Card className={`border-l-4 transition-shadow hover:shadow-md ${
      project.status === 'completado' ? 'border-l-green-400 opacity-80' :
      isOverdue ? 'border-l-red-500' :
      isUrgent ? 'border-l-orange-400' :
      project.status === 'en_curso' ? 'border-l-blue-500' :
      'border-l-gray-300'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${TYPE_COLORS[project.type] || 'bg-gray-400'}`} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{project.name}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {project.contact_name && <span className="text-xs text-gray-500">👤 {project.contact_name}</span>}
                {project.budget > 0 && <span className="text-xs font-medium text-green-700">💰 {project.budget?.toLocaleString('es-ES')} €</span>}
                {daysLeft !== null && !isOverdue && project.status !== 'completado' && (
                  <span className={`text-xs ${isUrgent ? 'text-orange-600 font-semibold' : 'text-gray-400'}`}>
                    📅 {daysLeft === 0 ? 'vence hoy' : `${daysLeft}d restantes`}
                  </span>
                )}
                {isOverdue && <span className="text-xs text-red-600 font-semibold">⚠ Vencido hace {Math.abs(daysLeft)}d</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Select value={project.status} onValueChange={v => onStatusChange(project.id, v)}>
              <SelectTrigger className={`h-7 w-32 text-xs border ${STATUS_COLORS[project.status]}`}><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>
            <button onClick={() => onEdit(project)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded hover:bg-blue-50"><Edit className="w-4 h-4" /></button>
            <button onClick={() => onDelete(project.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Progreso: {project.progress || 0}%</span>
            {tasksTotal > 0 && <span>{tasksDone}/{tasksTotal} tareas</span>}
          </div>
          <Progress value={project.progress || 0} className="h-2" />
        </div>

        {/* Tasks preview */}
        {tasksTotal > 0 && (
          <button className="mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            onClick={() => setExpanded(!expanded)}>
            <ListTodo className="w-3 h-3" />
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {tasksTotal} tareas
          </button>
        )}
        {expanded && (
          <div className="mt-2 space-y-1 border-t pt-2">
            {(project.tasks || []).map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <button onClick={() => onTaskToggle(project, i)}>
                  {t.status === 'completada'
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                </button>
                <span className={`flex-1 ${t.status === 'completada' ? 'line-through text-gray-400' : ''}`}>{t.task}</span>
                {t.assigned_to && <span className="text-gray-400">👤 {t.assigned_to}</span>}
                <Badge className={t.status === 'completada' ? 'bg-green-100 text-green-700' : t.status === 'en_curso' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'} variant="secondary">
                  {t.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newTask, setNewTask] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterType, setFilterType] = useState('todos');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = () => {
    Promise.all([
      base44.entities.Project.list('-created_date', 500),
      base44.entities.Contact.list('name', 500),
    ]).then(([p, c]) => { setProjects(p); setContacts(c); });
  };

  const handleSave = async () => {
    if (!form.name) return;
    if (editing) {
      await base44.entities.Project.update(editing.id, form);
    } else {
      await base44.entities.Project.create(form);
    }
    setDialogOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    loadAll();
  };

  const handleEdit = (proj) => {
    setEditing(proj);
    setForm({ ...EMPTY_FORM, ...proj, tasks: proj.tasks || [] });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar proyecto?')) return;
    await base44.entities.Project.delete(id);
    loadAll();
  };

  const handleStatusChange = async (id, status) => {
    await base44.entities.Project.update(id, { status });
    setProjects(p => p.map(x => x.id === id ? { ...x, status } : x));
  };

  const handleTaskToggle = async (project, taskIndex) => {
    const tasks = project.tasks.map((t, i) =>
      i === taskIndex ? { ...t, status: t.status === 'completada' ? 'pendiente' : 'completada' } : t
    );
    const done = tasks.filter(t => t.status === 'completada').length;
    const progress = tasks.length > 0 ? Math.round(done / tasks.length * 100) : project.progress;
    await base44.entities.Project.update(project.id, { tasks, progress });
    setProjects(p => p.map(x => x.id === project.id ? { ...x, tasks, progress } : x));
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    setForm({ ...form, tasks: [...form.tasks, { task: newTask.trim(), status: 'pendiente', assigned_to: '' }] });
    setNewTask('');
  };

  const updateFormTask = (i, updated) => {
    setForm({ ...form, tasks: form.tasks.map((t, idx) => idx === i ? updated : t) });
  };

  // Stats
  const total = projects.length;
  const enCurso = projects.filter(p => p.status === 'en_curso').length;
  const completados = projects.filter(p => p.status === 'completado').length;
  const vencidos = projects.filter(p => p.end_date && parseISO(p.end_date) < new Date() && p.status !== 'completado' && p.status !== 'cancelado').length;

  // Filter
  const filtered = projects.filter(p => {
    const matchStatus = filterStatus === 'todos' || p.status === filterStatus;
    const matchType = filterType === 'todos' || p.type === filterType;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.contact_name || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-pink-500" /> Gestión de Proyectos
        </h1>
        <Button className="bg-pink-600 hover:bg-pink-700" onClick={() => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo proyecto
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: total, color: 'text-gray-700', bg: 'bg-gray-50', icon: FolderOpen },
          { label: 'En curso', value: enCurso, color: 'text-blue-700', bg: 'bg-blue-50', icon: Zap },
          { label: 'Completados', value: completados, color: 'text-green-700', bg: 'bg-green-50', icon: CheckCircle2 },
          { label: 'Vencidos', value: vencidos, color: 'text-red-700', bg: 'bg-red-50', icon: AlertTriangle },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className={s.bg}>
              <CardContent className="p-3 flex items-center gap-3">
                <Icon className={`w-8 h-8 ${s.color} opacity-70`} />
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Buscar proyecto o cliente..." value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-2 pt-2">
          {filtered.length === 0 && <p className="text-center text-gray-400 py-10">No hay proyectos</p>}
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p}
              onEdit={handleEdit} onDelete={handleDelete}
              onTaskToggle={handleTaskToggle} onStatusChange={handleStatusChange} />
          ))}
        </TabsContent>

        <TabsContent value="kanban" className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {STATUSES.map(status => (
              <div key={status} className="space-y-2">
                <div className={`text-xs font-semibold px-2 py-1 rounded-full text-center ${STATUS_COLORS[status]}`}>
                  {status.replace(/_/g, ' ')} ({filtered.filter(p => p.status === status).length})
                </div>
                {filtered.filter(p => p.status === status).map(p => (
                  <Card key={p.id} className="hover:shadow-md cursor-pointer" onClick={() => handleEdit(p)}>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      {p.contact_name && <p className="text-xs text-gray-400 truncate">👤 {p.contact_name}</p>}
                      <Progress value={p.progress || 0} className="h-1.5 mt-2" />
                      <p className="text-xs text-gray-400 mt-1">{p.progress || 0}%</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog editar/crear */}
      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setEditing(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nuevo'} proyecto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nombre del proyecto *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

            <Select value={form.contact_id || ''} onValueChange={v => {
              const c = contacts.find(co => co.id === v);
              setForm({ ...form, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}`.trim() : '' });
            }}>
              <SelectTrigger><SelectValue placeholder="Cliente (opcional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Sin cliente</SelectItem>
                {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname} {c.company_name && `(${c.company_name})`}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-3 gap-2">
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.priority || 'media'} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">🔴 Alta</SelectItem>
                  <SelectItem value="media">🟡 Media</SelectItem>
                  <SelectItem value="baja">🟢 Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Fecha inicio</label>
                <Input type="date" className="mt-1" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Fecha fin</label>
                <Input type="date" className="mt-1" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>

            <Input type="number" placeholder="Presupuesto (€)" value={form.budget || ''} onChange={e => setForm({ ...form, budget: parseFloat(e.target.value) || 0 })} />

            <div>
              <label className="text-sm font-medium">Progreso: {form.progress}%</label>
              <input type="range" min={0} max={100} value={form.progress}
                onChange={e => setForm({ ...form, progress: parseInt(e.target.value) })}
                className="w-full mt-1 accent-pink-600" />
            </div>

            <Textarea placeholder="Descripción del proyecto" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Tareas ({form.tasks.length})</label>
                <span className="text-xs text-gray-400">{form.tasks.filter(t => t.status === 'completada').length} completadas</span>
              </div>
              <div className="flex gap-2 mb-2">
                <Input placeholder="Nueva tarea..." value={newTask} onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTask()} />
                <Button size="sm" onClick={addTask} className="shrink-0">+</Button>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {form.tasks.map((t, i) => (
                  <TaskRow key={i} task={t}
                    onChange={updated => updateFormTask(i, updated)}
                    onDelete={() => setForm({ ...form, tasks: form.tasks.filter((_, idx) => idx !== i) })} />
                ))}
              </div>
            </div>

            <Textarea placeholder="Notas del proyecto" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />

            <Button onClick={handleSave} disabled={!form.name} className="w-full bg-pink-600">
              {editing ? 'Actualizar proyecto' : 'Guardar proyecto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}