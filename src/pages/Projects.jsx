import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, FolderOpen, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';

const TYPES = ['clima', 'refrigeracion', 'electrico', 'solar', 'mixto'];
const STATUSES = ['planificacion', 'en_curso', 'pausado', 'completado', 'cancelado'];
const statusColors = { planificacion: 'bg-gray-100 text-gray-700', en_curso: 'bg-blue-100 text-blue-700', pausado: 'bg-yellow-100 text-yellow-700', completado: 'bg-green-100 text-green-700', cancelado: 'bg-red-100 text-red-700' };

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', contact_id: '', contact_name: '', description: '', type: 'clima',
    status: 'planificacion', start_date: format(new Date(), 'yyyy-MM-dd'), end_date: '',
    budget: 0, progress: 0, tasks: [], notes: ''
  });
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    Promise.all([
      base44.entities.Project.list('-created_date', 200),
      base44.entities.Contact.list()
    ]).then(([p, c]) => { setProjects(p); setContacts(c); });
  }, []);

  const handleSave = async () => {
    if (editing) {
      await base44.entities.Project.update(editing.id, form);
    } else {
      await base44.entities.Project.create(form);
    }
    setDialogOpen(false);
    setEditing(null);
    const p = await base44.entities.Project.list('-created_date', 200);
    setProjects(p);
  };

  const handleEdit = (proj) => {
    setEditing(proj);
    setForm({
      name: proj.name || '', contact_id: proj.contact_id || '', contact_name: proj.contact_name || '',
      description: proj.description || '', type: proj.type || 'clima', status: proj.status || 'planificacion',
      start_date: proj.start_date || '', end_date: proj.end_date || '',
      budget: proj.budget || 0, progress: proj.progress || 0, tasks: proj.tasks || [], notes: proj.notes || ''
    });
    setDialogOpen(true);
  };

  const addTask = () => {
    if (!newTask) return;
    setForm({...form, tasks: [...form.tasks, { task: newTask, status: 'pendiente', assigned_to: '' }]});
    setNewTask('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proyectos</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-pink-600"><Plus className="w-4 h-4 mr-2" />Nuevo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nuevo'} proyecto</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nombre del proyecto *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <Select value={form.contact_id} onValueChange={v => {
                const c = contacts.find(co => co.id === v);
                setForm({...form, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}` : ''});
              }}>
                <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
                <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                <Input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
              </div>
              <Input type="number" placeholder="Presupuesto (€)" value={form.budget} onChange={e => setForm({...form, budget: parseFloat(e.target.value) || 0})} />
              <div>
                <label className="text-sm font-medium">Progreso: {form.progress}%</label>
                <Input type="range" min={0} max={100} value={form.progress} onChange={e => setForm({...form, progress: parseInt(e.target.value)})} />
              </div>
              <Textarea placeholder="Descripción" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              <div>
                <label className="text-sm font-medium">Tareas</label>
                <div className="flex gap-2 mt-1">
                  <Input placeholder="Nueva tarea" value={newTask} onChange={e => setNewTask(e.target.value)} />
                  <Button size="sm" onClick={addTask}>+</Button>
                </div>
                <div className="space-y-1 mt-2">
                  {form.tasks.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                      <Select value={t.status} onValueChange={v => {
                        const newTasks = [...form.tasks];
                        newTasks[i] = {...t, status: v};
                        setForm({...form, tasks: newTasks});
                      }}>
                        <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="en_curso">En curso</SelectItem>
                          <SelectItem value="completada">Completada</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="flex-1 truncate">{t.task}</span>
                      <button onClick={() => setForm({...form, tasks: form.tasks.filter((_, idx) => idx !== i)})} className="text-red-400">×</button>
                    </div>
                  ))}
                </div>
              </div>
              <Textarea placeholder="Notas" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              <Button onClick={handleSave} className="w-full bg-pink-600">{editing ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {projects.map(p => (
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-5 h-5 text-pink-500" />
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.contact_name} | {p.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[p.status]}>{p.status?.replace(/_/g, ' ')}</Badge>
                  <button onClick={() => handleEdit(p)} className="p-1 text-gray-400"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => base44.entities.Project.delete(p.id).then(() => setProjects(projects.filter(x => x.id !== p.id)))} className="p-1 text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <Progress value={p.progress || 0} className="h-2" />
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>{p.progress || 0}%</span>
                {p.budget > 0 && <span>{p.budget?.toFixed(2)} €</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}