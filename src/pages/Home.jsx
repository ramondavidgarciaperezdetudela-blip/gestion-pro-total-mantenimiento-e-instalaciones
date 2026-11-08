import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Shield, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { createPageUrl } from '../utils';
import CuadroGeneralHome from '../components/CuadroGeneralHome';

// Pantalla principal: solo el cuadro general con todas las áreas del programa.
// Los paneles de datos (SAT, agenda, cifras, compras…) están en el menú «Paneles del negocio».
export default function Home() {
  const [company, setCompany] = useState(null);

  useEffect(() => {
    let vivo = true;
    base44.entities.CompanySettings.list()
      .then((l) => { if (vivo && l?.length) setCompany(l[0]); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  // Aviso de copia de seguridad pendiente
  const config = (() => { try { return JSON.parse(localStorage.getItem('backupConfig')) || {}; } catch { return {}; } })();
  const ultima = config.last_backup;
  const dias = ultima ? Math.floor((new Date() - new Date(ultima)) / 86400000) : null;
  const avisarCopia = dias === null || dias >= (config.reminder_days || 7);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        {company?.logo_url &&
        <img src={company.logo_url} alt="Logo" className="h-12 w-12 rounded-xl object-cover" style={{ border: '1px solid #1e1e30' }} />
        }
        <div>
          <h1 className="text-3xl font-extrabold" style={{ color: 'inherit' }}>
            {company?.company_name || 'Panel de Control'}
          </h1>
          <p className="text-sm font-medium capitalize" style={{ color: 'var(--gpt-grafito, #474A50)' }}>{format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</p>
        </div>
      </div>

      <CuadroGeneralHome />

      {avisarCopia && (
        <Link to={createPageUrl('BackupCenter')}>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-opacity hover:opacity-80" style={{ background: '#1a1200', border: '1px solid #F59E0B55' }}>
            <Shield className="w-5 h-5 flex-shrink-0" style={{ color: '#F59E0B' }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: '#FCD34D' }}>
                {dias === null ? '⚠ Aún no tienes ninguna copia de seguridad guardada' : `⚠ Último backup hace ${dias} días — recomendamos hacer uno`}
              </p>
              <p className="text-xs" style={{ color: '#F59E0B99' }}>Haz clic para ir al Centro de Copias de Seguridad</p>
            </div>
            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
          </div>
        </Link>
      )}
    </div>
  );
}
