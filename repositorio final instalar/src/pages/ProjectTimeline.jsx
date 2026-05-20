import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Calendar, CheckCircle2, Circle, Trash2, Edit } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ProjectTimeline() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [workDays, setWorkDays] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDay, setEditingDay] = useState(null);
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), description: '', hours: 8, status: 'en_curso' });

  useEffect(() => {
    base44.entities.Project.list('-created_date', 100).then(setProjects);
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      setWorkDays([]);
      return;
    }
    // Simulamos la carga de días de trabajo - en producción sería una entidad separada
    const stored = localStorage.getItem(`project_workdays_${selectedProject.id}`);
    setWorkDays(stored ? JSON.parse(stored) : []);
  }, [selectedProject]);

  const handleSaveDay = () => {
    let updated;
    if (editingDay) {
      updated = workDays.map((d, i) => i === editingDay ? form : d);
    } else {
      updated = [...workDays, { ...form, id: Date.now() }];
    }
    setWorkDays(updated);
    localStorage.setItem(`project_workdays_${selectedProject.id}`, JSON.stringify(updated));
    setDialogOpen(false);
    setForm({ date: format(new Date(), 'yyyy-MM-dd'), description: '', hours: 8, status: 'en_curso' });
    setEditingDay(null);
  };

  const deleteDay = (idx) => {
    const updated = workDays.filter((_, i) => i !== idx);
    setWorkDays(updated);
    localStorage.setItem(`project_workdays_${selectedProject.id}`, JSON.stringify(updated));
  };

  const totalHours = workDays.reduce((s, d) => s + (d.hours || 0), 0);
  const completedDays = workDays.filter(d => d.status === 'completada').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" /> Timeline de Trabajo por Días
        </h1>
        <Button onClick={() => { setEditingDay(null); setForm({ date: format(new Date(), 'yyyy-MM-dd'), description: '', hours: 8, status: 'en_curso' }); setDialogOpen(true); }}
          disabled={!selectedProject} className="bg-blue-600">
          <Plus className="w-4 h-4 mr-1" /> Registrar día de trabajo
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <label className="text-sm font-medium text-gray-700 block mb-2">Selecciona proyecto</label>
          <Select value={selectedProject?.id || ''} onValueChange={id => setSelectedProject(projects.find(p => p.id === id))}>
            <SelectTrigger><SelectValue placeholder="Selecciona un proyecto..." /></SelectTrigger>
            <SelectContent>
              {projects.filter(p => p.status !== 'completado').map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name} — {p.contact_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProject && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{workDays.length}</p>
                <p className="text-xs text-gray-500">Días registrados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{totalHours}h</p>
                <p className="text-xs text-gray-500">Total horas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{completedDays}</p>
                <p className="text-xs text-gray-500">Completados</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Progreso de trabajo - {selectedProject.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {workDays.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Sin días de trabajo registrados</p>
              ) : (
                <div className="space-y-2">
                  {workDays.sort((a, b) => new Date(b.date) - new Date(a.date)).map((day, idx) => {
                    const dayDate = parseISO(day.date);
                    const daysAgo = differenceInDays(new Date(), dayDate);
                    return (
                      <div key={day.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border">
                        <button onClick={() => {
                          const updated = workDays.map((d, i) => i === idx ? { ...d, status: d.status === 'completada' ? 'en_curso' : 'completada' } : d);
                          setWorkDays(updated);
                          localStorage.setItem(`project_workdays_${selectedProject.id}`, JSON.stringify(updated));
                        }}>
                          {day.status === 'completada'
                            ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                            : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{format(dayDate, 'EEEE, d MMM yyyy', { locale: es })}</p>
                            <Badge variant="outline" className="text-xs">{day.hours}h</Badge>
                            {daysAgo === 0 && <Badge className="bg-blue-100 text-blue-700 text-xs">Hoy</Badge>}
                            {daysAgo === 1 && <Badge className="bg-gray-100 text-gray-700 text-xs">Ayer</Badge>}
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{day.description}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => { setEditingDay(idx); setForm(day); setDialogOpen(true); }} className="p-1.5 text-blue-400 hover:text-blue-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteDay(idx)} className="p-1.5 text-red-300 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setEditingDay(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingDay !== null ? 'Editar' : 'Registrar'} día de trabajo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">Fecha *</label>
              <Input type="date" className="mt-1" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Descripción del trabajo</label>
              <Input className="mt-1" placeholder="Ej: Instalación climatización, cableado..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Horas trabajadas</label>
                <Input type="number" min={0} max={24} step={0.5} className="mt-1" value={form.hours} onChange={e => setForm({ ...form, hours: parseFloat(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Estado</label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_curso">En curso</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSaveDay} className="w-full bg-blue-600">
              {editingDay !== null ? 'Actualizar día' : 'Registrar día'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}