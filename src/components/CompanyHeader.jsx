import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function CompanyHeader({ className = "" }) {
  const [company, setCompany] = useState(null);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(data => {
      if (data.length > 0) setCompany(data[0]);
    }).catch(() => {/* CompanySettings puede no estar disponible (404): cabecera queda oculta */});
  }, []);

  if (!company) return null;

  return (
    <div className={`flex items-start gap-3 border-b border-gray-200 pb-3 mb-2 ${className}`}>
      {/* Logo: máximo 3,5cm × 2cm */}
      {company.logo_url && (
        <img
          src={company.logo_url}
          alt="Logo"
          style={{ maxWidth: '132px', maxHeight: '75px', width: 'auto', height: 'auto', objectFit: 'contain', flexShrink: 0 }}
        />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-base leading-tight">{company.company_name}</h3>
        {company.nif && <p className="text-xs text-gray-500">NIF: {company.nif}</p>}
        {(company.address || company.city) && (
          <p className="text-xs text-gray-500">{[company.address, company.city, company.postal_code, company.province].filter(Boolean).join(', ')}</p>
        )}
        {(company.phone || company.email) && (
          <p className="text-xs text-gray-500">{[company.phone && `Tel: ${company.phone}`, company.email].filter(Boolean).join(' | ')}</p>
        )}
      </div>
    </div>
  );
}