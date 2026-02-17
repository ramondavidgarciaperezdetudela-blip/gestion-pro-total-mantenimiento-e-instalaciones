import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function CompanyHeader({ className = "" }) {
  const [company, setCompany] = useState(null);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(data => {
      if (data.length > 0) setCompany(data[0]);
    });
  }, []);

  if (!company) return null;

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {company.logo_url && (
        <img src={company.logo_url} alt="Logo" className="h-12 w-auto object-contain" />
      )}
      <div>
        <h3 className="font-bold text-lg">{company.company_name}</h3>
        <p className="text-xs text-gray-500">
          NIF: {company.nif} | {company.address}, {company.city} {company.postal_code} {company.province}
        </p>
        <p className="text-xs text-gray-500">
          Tel: {company.phone} | {company.email}
        </p>
      </div>
    </div>
  );
}