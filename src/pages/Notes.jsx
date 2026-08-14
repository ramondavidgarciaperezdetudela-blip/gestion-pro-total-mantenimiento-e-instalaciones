import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Trash2, Edit, Image, X, Printer, Mail, StickyNote } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { uploadImage } from '@/lib/uploadImage';
import { uploadPhotosSequential } from '@/lib/uploadPhotosSequential';

const EMPTY = { title: '', content: '', contact_name: '', contact_id: '', tags: '', date: format(new Date(), 'yyyy-MM-dd'), photos: [] };

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [photoProgress, setPhotoProgress] = useState({ actual: 0, total: 0 });
  const [failedPhotos, setFailedPhotos] = useState([]);
  const [photoError, setPhotoError] = useState('');
  const [previewNote, setPreviewNote] = useState(null);
  const fileRef = useRef(null);
  const printRef = useRef(null);

  useEffect(() => {
    base44.entities.Note.list('-created_date', 200).then(setNotes);
    base44.entities.Contact.list('name', 200).then(setContacts);
  }, []);

  const load = () => base44.entities.Note.list('-created_date', 200).then(setNotes);

  const handleSave = async () => {
    if (editing) {
      await base44.entities.Note.update(editing.id, form);
    } else {
      await base44.entities.Note.create(form);
    }
    setDialogOpen(false);
    setEditing(null);
    setForm(EMPTY);
    load();
  };

  const handleEdit = (n) => {
    setEditing(n);
    setForm({ title: n.title || '', content: n.content || '', contact_name: n.contact_name || '', contact_id: n.contact_id || '', tags: n.tags || '', date: n.date || format(new Date(), 'yyyy-MM-dd'), photos: n.photos || [] });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar nota?')) return;
    await base44.entities.Note.delete(id);
    load();
  };

  const runPhotoUpload = async (files) => {
    if (!files.length) return;
    const remaining = 30 - (form.photos?.length || 0);
    const toUpload = files.slice(0, remaining);
    if (!toUpload.length) return;
    setUploading(true);
    setPhotoError('');
    setFailedPhotos([]);
    setPhotoProgress({ actual: 0, total: toUpload.length });
    const acc = [...(form.photos || [])];
    const { failed } = await uploadPhotosSequential(toUpload, {
      onPhoto: async (url) => {
        acc.push(url);
        setForm(prev => ({ ...prev, photos: [...acc] })); // incremental
      },
      onProgress: (actual, total) => setPhotoProgress({ actual, total }),
    });
    setUploading(false);
    setPhotoProgress({ actual: 0, total: 0 });
    if (failed.length) {
      setFailedPhotos(failed);
      setPhotoError(`${failed.length} foto(s) no se pudieron subir.`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handlePhotoUpload = (e) => runPhotoUpload(Array.from(e.target.files || []));
  const handleRetryPhotos = () => runPhotoUpload(failedPhotos);

  const removePhoto = (idx) => {
    setForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));
  };

  const handlePrint = (note) => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${note.title}</title><style>body{font-family:Arial,sans-serif;padding:20px;max-width:800px;margin:0 auto} h1{font-size:22px} .photos{display:flex;flex-wrap:wrap;gap:8px} img{max-width:200px;max-height:150px;border-radius:6px} .meta{color:#666;font-size:12px;margin-bottom:12px}</style></head><body>
      <h1>${note.title}</h1>
      <div class="meta">${note.date || ''} ${note.contact_name ? '· ' + note.contact_name : ''} ${note.tags ? '· ' + note.tags : ''}</div>
      <p style="white-space:pre-wrap">${note.content || ''}</p>
      ${note.photos?.length ? `<div class="photos">${note.photos.map(u => `<img src="${u}" />`).join('')}</div>` : ''}
      </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };

  const handleEmail = (note) => {
    const body = encodeURIComponent(`${note.title}\n\n${note.content || ''}\n\n${note.date || ''}`);
    const subject = encodeURIComponent(note.title);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const filtered = notes.filter(n =>
    n.title?.toLowerCase().includes(search.toLowerCase()) ||
    n.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    n.content?.toLowerCase().includes(search.toLowerCase()) ||
    n.tags?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><StickyNote className="w-6 h-6 text-yellow-500" />Notas</h1>
        <Button onClick={() => { setEditing(null); setForm(EMPTY); setDialogOpen(true); }} className="bg-yellow-500 hover:bg-yellow-600">
          <Plus className="w-4 h-4 mr-2" />Nueva nota
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input className="pl-9" placeholder="Buscar notas..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(note => (
          <Card key={note.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setPreviewNote(note)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 flex-1 truncate">{note.title}</h3>
                <div className="flex gap-1 ml-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleEdit(note)} className="p-1 text-gray-400 hover:text-gray-600"><Edit className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(note.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {note.contact_name && <p className="text-xs text-blue-600 mb-1">👤 {note.contact_name}</p>}
              {note.date && <p className="text-xs text-gray-400 mb-2">{format(new Date(note.date + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}</p>}
              <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">{note.content}</p>
              {note.photos?.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {note.photos.slice(0, 4).map((u, i) => (
                    <img key={i} src={u} alt="" className="w-14 h-14 object-cover rounded-md border" />
                  ))}
                  {note.photos.length > 4 && <div className="w-14 h-14 bg-gray-100 rounded-md flex items-center justify-center text-xs text-gray-500">+{note.photos.length - 4}</div>}
                </div>
              )}
              {note.tags && <div className="mt-2 flex flex-wrap gap-1">{note.tags.split(',').map((t, i) => <Badge key={i} variant="outline" className="text-[10px]">{t.trim()}</Badge>)}</div>}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-gray-400 py-12 col-span-3">No hay notas</p>}
      </div>

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setEditing(null); setForm(EMPTY); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar nota' : 'Nueva nota'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            <div>
              <label className="text-xs text-gray-500">Vincular a cliente (opcional)</label>
              <select className="w-full mt-1 border rounded-md px-3 py-2 text-sm" value={form.contact_id} onChange={e => {
                const c = contacts.find(c => c.id === e.target.value);
                setForm({...form, contact_id: e.target.value, contact_name: c ? (c.company_name || c.name) : ''});
              }}>
                <option value="">Sin cliente</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.company_name || c.name}</option>)}
              </select>
            </div>
            <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            <Textarea placeholder="Contenido de la nota..." value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={6} />
            <Input placeholder="Etiquetas (separadas por comas)" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} />

            {/* Photos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Fotos adjuntas ({form.photos?.length || 0}/30)</label>
                {(form.photos?.length || 0) < 30 && (
                  <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Image className="w-3.5 h-3.5 mr-1" />{uploading ? `Subiendo ${photoProgress.actual}/${photoProgress.total}…` : 'Añadir fotos'}
                  </Button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
              {uploading && (
                <div className="text-xs text-blue-600 mb-1">Subiendo foto {photoProgress.actual} de {photoProgress.total}…</div>
              )}
              {photoError && !uploading && (
                <div className="flex items-center justify-between gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 mb-1">
                  <span>{photoError}</span>
                  <button type="button" onClick={handleRetryPhotos} className="text-red-700 bg-white border border-red-300 rounded px-2 py-0.5 hover:bg-red-100 font-medium">Reintentar</button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {(form.photos || []).map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border" />
                    <button onClick={() => removePhoto(i)} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} className="w-full bg-yellow-500 hover:bg-yellow-600">{editing ? 'Actualizar' : 'Guardar nota'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      {previewNote && (
        <Dialog open={!!previewNote} onOpenChange={() => setPreviewNote(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between pr-8">
                <span>{previewNote.title}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handlePrint(previewNote)}><Printer className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => handleEmail(previewNote)}><Mail className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => { setPreviewNote(null); handleEdit(previewNote); }}><Edit className="w-4 h-4" /></Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                {previewNote.date && <span>📅 {previewNote.date}</span>}
                {previewNote.contact_name && <span>👤 {previewNote.contact_name}</span>}
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">{previewNote.content}</p>
              {previewNote.tags && <div className="flex flex-wrap gap-1">{previewNote.tags.split(',').map((t, i) => <Badge key={i} variant="outline" className="text-xs">{t.trim()}</Badge>)}</div>}
              {previewNote.photos?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {previewNote.photos.map((u, i) => <img key={i} src={u} alt="" className="w-32 h-24 object-cover rounded-lg border" />)}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}