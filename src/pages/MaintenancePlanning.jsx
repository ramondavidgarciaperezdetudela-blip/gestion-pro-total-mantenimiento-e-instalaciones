import React, { useState, useEffect } from 'react';
import BuscadorCliente from '@/components/BuscadorCliente';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/ui/number-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Wrench, AlertCircle, Plus, Edit2, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const MAINTENANCE_TYPES = [
  { value: 'mensual', label: '📅 Mensual', days: 30 },
  { value: 'trimestral', label: '📅 Trimestral', days: 90 },
  { value: 'semestral', label: '📅 Semestral', days: 180 },
  { value: 'anual', label: '📅 Anual', days: 365 },
  { value: 'personalizado', label: '⚙️ Personalizado', days: null },
];

export default function MaintenancePlanning() {
  const [contacts, setContacts] = useState([]);
  const [machines, setMachines] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState('');
  const [company, setCompany] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  
  const [editingMachine, setEditingMachine] = useState(null);
  const [machineForm, setMachineForm] = useState({
    maintenance_type: 'mensual',
    maintenance_days: 30,
    last_maintenance_date: format(new Date(), 'yyyy-MM-dd'),
    technician_assigned: '',
  });
  
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contactsList, machinesList, appointmentsList, companyData] = await Promise.all([
        base44.entities.Contact.list('-created_date', 500),
        base44.entities.ClientMachine?.list?.('-created_date', 300) || Promise.resolve([]),
        base44.entities.Appointment?.list?.('-date', 500) || Promise.resolve([]),
        base44.entities.CompanySettings.list(),
      ]);
      
      setContacts(contactsList);
      setMachines(machinesList);
      setAppointments(appointmentsList);
      if (companyData.length > 0) {
        setCompany(companyData[0]);
        if (companyData[0].technicians) setTechnicians(companyData[0].technicians);
      }
    } catch (e) {
      console.error('Error loading data:', e);
    }
    setLoading(false);
  };

  const getNextMaintenanceDate = (lastDate, days) => {
    if (!lastDate || !days) return null;
    const last = new Date(lastDate);
    return addDays(last, days);
  };

  const getDaysUntilMaintenance = (nextDate) => {
    if (!nextDate) return null;
    const today = new Date();
    const next = new Date(nextDate);
    return differenceInDays(next, today);
  };

  const getStatusBadge = (daysUntil) => {
    if (daysUntil === null) return { label: 'No configurado', color: 'bg-gray-100 text-gray-700' };
    if (daysUntil < 0) return { label: '🔴 VENCIDO', color: 'bg-red-100 text-red-800' };
    if (daysUntil <= 7) return { label: '🟠 PRÓXIMO', color: 'bg-orange-100 text-orange-800' };
    if (daysUntil <= 30) return { label: '🟡 ATENCIÓN', color: 'bg-yellow-100 text-yellow-800' };
    return { label: '✅ OK', color: 'bg-green-100 text-green-800' };
  };

  const handleEditMachine = (machine) => {
    setEditingMachine(machine.id);
    setMachineForm({
      maintenance_type: machine.maintenance_type || 'mensual',
      maintenance_days: machine.maintenance_days || 30,
      last_maintenance_date: machine.last_maintenance_date || format(new Date(), 'yyyy-MM-dd'),
      technician_assigned: machine.technician_assigned || '',
    });
  };

  const handleSaveMachine = async () => {
    if (!editingMachine) return;
    try {
      await base44.entities.ClientMachine.update(editingMachine, machineForm);
      toast.success('Configuración de mantenimiento actualizada');
      setEditingMachine(null);
      await loadData();
    } catch (e) {
      toast.error('Error al guardar');
    }
  };

  const handleGenerateWorkOrder = async (machine) => {
    setGenerating(true);
    try {
      const nextDate = getNextMaintenanceDate(machine.last_maintenance_date, machine.maintenance_days);
      const contact = contacts.find(c => c.id === machine.contact_id);
      
      if (!nextDate) {
        toast.error('Configura primero la periodicidad del equipo');
        setGenerating(false);
        return;
      }

      // Crear cita/orden de trabajo
      await base44.entities.Appointment.create({
        title: `Mantenimiento preventivo - ${machine.name}`,
        description: `Mantenimiento preventivo programado para ${machine.brand} ${machine.model}`,
        contact_id: machine.contact_id,
        contact_name: contact ? `${contact.name} ${contact.surname || ''}` : '',
        date: format(nextDate, 'yyyy-MM-dd'),
        time_start: '09:00',
        type: 'mantenimiento',
        status: 'confirmada',
        priority: machine.maintenance_days <= 30 ? 'alta' : 'media',
        address: contact?.address || '',
      });

      // Enviar notificación al cliente
      if (contact?.email) {
        await base44.integrations.Core.SendEmail({
          to: contact.email,
          subject: `Mantenimiento preventivo programado - ${machine.name}`,
          body: `Hola ${contact.name},\n\nHemos programado el mantenimiento preventivo de tu equipo "${machine.name}" (${machine.brand} ${machine.model}).\n\n📅 Fecha: ${format(nextDate, 'dd/MM/yyyy', { locale: es })}\n🔧 Tipo: Mantenimiento preventivo\n\nNos pondremos en contacto para confirmar la hora exacta.\n\nSaludos`,
        });
      }

      toast.success('Orden de trabajo generada y notificación enviada al cliente');
      await loadData();
    } catch (e) {
      console.error('Error:', e);
      toast.error('Error al generar orden de trabajo');
    }
    setGenerating(false);
  };

  const handleGenerateAllPending = async () => {
    setGenerating(true);
    try {
      let created = 0;
      const today = new Date();

      for (const machine of machines) {
        if (!machine.maintenance_days || !machine.last_maintenance_date) continue;
        
        const nextDate = getNextMaintenanceDate(machine.last_maintenance_date, machine.maintenance_days);
        const daysUntil = getDaysUntilMaintenance(nextDate);
        
        // Generar orden si está vencido o próximo (7 días)
        if (daysUntil !== null && daysUntil <= 7) {
          const existingAppointment = appointments.find(a => 
            a.contact_id === machine.contact_id &&
            a.title?.includes(machine.name) &&
            a.date === format(nextDate, 'yyyy-MM-dd')
          );

          if (!existingAppointment) {
            const contact = contacts.find(c => c.id === machine.contact_id);
            
            await base44.entities.Appointment.create({
              title: `Mantenimiento preventivo - ${machine.name}`,
              description: `Mantenimiento preventivo programado para ${machine.brand} ${machine.model}`,
              contact_id: machine.contact_id,
              contact_name: contact ? `${contact.name} ${contact.surname || ''}` : '',
              date: format(nextDate, 'yyyy-MM-dd'),
              time_start: '09:00',
              type: 'mantenimiento',
              status: 'confirmada',
              priority: machine.maintenance_days <= 30 ? 'alta' : 'media',
              address: contact?.address || '',
            });

            if (contact?.email) {
              await base44.integrations.Core.SendEmail({
                to: contact.email,
                subject: `⚠️ Mantenimiento preventivo próximo - ${machine.name}`,
                body: `Hola ${contact.name},\n\n⚠️ El mantenimiento preventivo de tu equipo "${machine.name}" está próximo.\n\n📅 Fecha sugerida: ${format(nextDate, 'dd/MM/yyyy', { locale: es })}\n🔧 Equipo: ${machine.brand} ${machine.model}\n\nNos pondremos en contacto para programar la visita.\n\nSaludos`,
              });
            }
            created++;
          }
        }
      }

      toast.success(`${created} orden(es) de mantenimiento generada(s) y notificaciones enviadas`);
      await loadData();
    } catch (e) {
      console.error('Error:', e);
      toast.error('Error al generar órdenes');
    }
    setGenerating(false);
  };

  const filteredMachines = selectedContact 
    ? machines.filter(m => m.contact_id === selectedContact)
    : machines;

  const machinesNeedingMaintenance = filteredMachines.filter(m => {
    const daysUntil = getDaysUntilMaintenance(getNextMaintenanceDate(m.last_maintenance_date, m.maintenance_days));
    return daysUntil !== null && daysUntil <= 7;
  });

  if (loading) return <div className="p-4 text-center">Cargando...</div>;

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Planificación de Mantenimientos Preventivos</h1>
          <p className="text-sm text-gray-500">Programa y genera automáticamente órdenes de trabajo para mantenimiento preventivo</p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{filteredMachines.length}</p>
              <p className="text-xs text-gray-600">Equipos configurados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {filteredMachines.filter(m => getDaysUntilMaintenance(getNextMaintenanceDate(m.last_maintenance_date, m.maintenance_days)) !== null && getDaysUntilMaintenance(getNextMaintenanceDate(m.last_maintenance_date, m.maintenance_days)) < 0).length}
              </p>
              <p className="text-xs text-gray-600">Vencidos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{machinesNeedingMaintenance.length}</p>
              <p className="text-xs text-gray-600">Próximos 7 días</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4 flex flex-col justify-center">
            <Button 
              onClick={handleGenerateAllPending} 
              disabled={generating || machinesNeedingMaintenance.length === 0}
              className="bg-green-600 hover:bg-green-700 w-full text-xs"
            >
              {generating ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generando...</>
              ) : (
                <><CheckCircle2 className="w-3 h-3 mr-1" /> Generar todas</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 min-w-48">
              <label className="text-xs text-gray-600 font-semibold mb-1 block">Filtrar por cliente</label>
              <BuscadorCliente
                contacts={contacts}
                value={selectedContact}
                onValueChange={setSelectedContact}
                placeholder="Todos los clientes"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de equipos */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Wrench className="w-4 h-4" /> Equipos ({filteredMachines.length})
        </h2>
        
        {filteredMachines.length === 0 ? (
          <Card className="bg-gray-50">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400">Sin equipos registrados</p>
            </CardContent>
          </Card>
        ) : (
          filteredMachines.map(machine => {
            const nextDate = getNextMaintenanceDate(machine.last_maintenance_date, machine.maintenance_days);
            const daysUntil = getDaysUntilMaintenance(nextDate);
            const statusBadge = getStatusBadge(daysUntil);
            const contact = contacts.find(c => c.id === machine.contact_id);
            const maintenanceTypeObj = MAINTENANCE_TYPES.find(m => m.value === machine.maintenance_type);

            return (
              <Card key={machine.id} className="border hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {editingMachine === machine.id ? (
                    // Formulario de edición
                    <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-700 mb-1 block">Periodicidad</label>
                          <Select value={machineForm.maintenance_type} onValueChange={v => {
                            const type = MAINTENANCE_TYPES.find(m => m.value === v);
                            setMachineForm({...machineForm, maintenance_type: v, maintenance_days: type?.days || machineForm.maintenance_days});
                          }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {MAINTENANCE_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {machineForm.maintenance_type === 'personalizado' && (
                          <div>
                            <label className="text-xs font-semibold text-gray-700 mb-1 block">Días</label>
                            <NumberField
                              decimals={false}
                              value={machineForm.maintenance_days}
                              onChange={v => setMachineForm({...machineForm, maintenance_days: v})}
                            />
                          </div>
                        )}
                        <div>
                          <label className="text-xs font-semibold text-gray-700 mb-1 block">Último mantenimiento</label>
                          <Input 
                            type="date" 
                            value={machineForm.last_maintenance_date}
                            onChange={e => setMachineForm({...machineForm, last_maintenance_date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700 mb-1 block">Técnico asignado</label>
                          <Select value={machineForm.technician_assigned} onValueChange={v => setMachineForm({...machineForm, technician_assigned: v})}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>Sin asignar</SelectItem>
                              {technicians.map(t => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setEditingMachine(null)}>Cancelar</Button>
                        <Button size="sm" onClick={handleSaveMachine} className="bg-green-600 hover:bg-green-700">
                          <Save className="w-3 h-3 mr-1" /> Guardar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Vista normal
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900">{machine.name}</h3>
                          <p className="text-sm text-gray-600">{machine.brand} {machine.model} • Nº Serie: {machine.serial_number || '-'}</p>
                          <p className="text-xs text-gray-500 mt-1">Cliente: {contact?.name} {contact?.surname || ''}</p>
                        </div>
                        <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg text-sm">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold">Periodicidad</p>
                          <p className="text-gray-900">{maintenanceTypeObj?.label || 'No configurado'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold">Último mantenimiento</p>
                          <p className="text-gray-900">{machine.last_maintenance_date ? format(new Date(machine.last_maintenance_date), 'dd/MM/yyyy', { locale: es }) : 'Sin registrar'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold">Próximo mantenimiento</p>
                          <p className="text-gray-900 font-semibold">{nextDate ? format(nextDate, 'dd/MM/yyyy', { locale: es }) : '-'}</p>
                          {daysUntil !== null && (
                            <p className={`text-xs mt-0.5 ${daysUntil < 0 ? 'text-red-600' : daysUntil <= 7 ? 'text-orange-600' : 'text-green-600'}`}>
                              {daysUntil < 0 ? `Vencido hace ${Math.abs(daysUntil)} días` : daysUntil === 0 ? 'HOY' : `En ${daysUntil} días`}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold">Técnico</p>
                          <p className="text-gray-900">{machine.technician_assigned || 'Sin asignar'}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleGenerateWorkOrder(machine)} disabled={generating} className="bg-blue-600 hover:bg-blue-700">
                          {generating ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generando...</>
                          ) : (
                            <><Plus className="w-3 h-3 mr-1" /> Generar orden</>
                          )}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEditMachine(machine)}>
                          <Edit2 className="w-3 h-3 mr-1" /> Configurar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}