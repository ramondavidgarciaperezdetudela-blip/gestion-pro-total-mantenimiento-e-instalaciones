import React, { useMemo } from 'react';
import { AlertTriangle, AlertCircle, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function RefrigerantMaintenanceAlert({ refrigerantData, weight = null }) {
  const alert = useMemo(() => {
    if (!refrigerantData) {
      return null;
    }

    // Si no hay fecha de prohibición, retorna null (gas permitido indefinidamente)
    if (!refrigerantData.fgas_ban_date) {
      return null;
    }

    const banDate = new Date(refrigerantData.fgas_ban_date);
    const today = new Date('2026-03-04');
    const daysUntilBan = Math.floor((banDate - today) / (1000 * 60 * 60 * 24));
    const yearsUntilBan = (daysUntilBan / 365).toFixed(1);

    // Niveles de urgencia
    if (daysUntilBan < 0) {
      return { level: 'banned', daysUntilBan, yearsUntilBan, banDate };
    }
    if (daysUntilBan <= 365) {
      return { level: 'critical', daysUntilBan, yearsUntilBan, banDate };
    }
    if (daysUntilBan <= 730) {
      return { level: 'warning', daysUntilBan, yearsUntilBan, banDate };
    }
    if (daysUntilBan <= 1095) {
      return { level: 'info', daysUntilBan, yearsUntilBan, banDate };
    }

    return null;
  }, [refrigerantData]);

  if (!alert) {
    return null;
  }

  const getAlertConfig = () => {
    const configs = {
      banned: {
        icon: AlertTriangle,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300',
        textColor: 'text-red-700',
        badgeColor: 'bg-red-600 text-white',
        title: '🚫 GAS PROHIBIDO - ACCIÓN INMEDIATA REQUERIDA',
        description: 'Este gas refrigerante está prohibido. El equipo debe ser desmantelado o cambiado de gas inmediatamente.',
      },
      critical: {
        icon: AlertTriangle,
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300',
        textColor: 'text-orange-700',
        badgeColor: 'bg-orange-600 text-white',
        title: '⚠️ PROHIBICIÓN EN MENOS DE 1 AÑO',
        description: 'Riesgo crítico: este gas será prohibido muy pronto. Se debe planificar el retrofit o renovación urgentemente.',
      },
      warning: {
        icon: AlertCircle,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-300',
        textColor: 'text-yellow-700',
        badgeColor: 'bg-yellow-600 text-white',
        title: '⚠️ PROHIBICIÓN EN MENOS DE 2 AÑOS',
        description: 'Este gas será eliminado gradualmente. Planificar la renovación en el próximo ciclo de mantenimiento.',
      },
      info: {
        icon: Calendar,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        textColor: 'text-blue-700',
        badgeColor: 'bg-blue-600 text-white',
        title: '📋 PLANIFICACIÓN A LARGO PLAZO',
        description: 'Este gas tendrá restricciones en 2-3 años. Considerar roadmap de transición ahora.',
      },
    };

    return configs[alert.level] || configs.info;
  };

  const config = getAlertConfig();
  const Icon = config.icon;

  // Calcular equivalencia CO2 si tiene peso
  const co2Equivalent = weight && refrigerantData.gwp
    ? (weight * refrigerantData.gwp / 1000).toFixed(2)
    : null;

  // Sugerencias de acción
  const getActionPlan = () => {
    if (alert.level === 'banned') {
      return [
        `Cambio de gas por: ${refrigerantData.replacement}`,
        'Cambio completo de compresor y tuberías',
        'Extracción y disposición legal del gas antiguo',
        'Certificación y auditoría F-Gas tras la operación',
      ];
    }

    if (alert.level === 'critical') {
      return [
        `Presupuestar retrofit a: ${refrigerantData.replacement}`,
        'Planificar cambio para próximos 6-9 meses',
        'Preparar documentación y permisos F-Gas',
        'Entrenar personal en nuevo refrigerante',
      ];
    }

    if (alert.level === 'warning') {
      return [
        `Evaluar alternativas: ${refrigerantData.replacement}`,
        'Incluir plan de transición en próximo mantenimiento',
        'Obtener cotizaciones de retrofit',
        'Monitorear normativas actualizadas',
      ];
    }

    return [
      'Monitorear restricciones normativas',
      `Estudiar migración a: ${refrigerantData.replacement}`,
      'Planificar presupuesto futuro',
    ];
  };

  return (
    <Card className={`${config.bgColor} border-2 ${config.borderColor}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Icon className={`w-6 h-6 ${config.textColor} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <CardTitle className={`text-base ${config.textColor} mb-1`}>
                {config.title}
              </CardTitle>
              <p className={`text-sm ${config.textColor}`}>{config.description}</p>
            </div>
          </div>
          <Badge className={`${config.badgeColor} flex-shrink-0 ml-2`}>
            {alert.level === 'banned' ? 'PROHIBIDO' : `${alert.yearsUntilBan} años`}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Información del gas */}
        <div className="bg-white/60 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-700">Gas:</span>
              <p className="text-gray-600">{refrigerantData.name}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Tipo:</span>
              <p className="text-gray-600">{refrigerantData.type}</p>
            </div>
            {weight && (
              <>
                <div>
                  <span className="font-semibold text-gray-700">Carga:</span>
                  <p className="text-gray-600">{weight} kg</p>
                </div>
                {co2Equivalent && (
                  <div>
                    <span className="font-semibold text-gray-700">Equiv. CO₂:</span>
                    <p className="text-gray-600">{co2Equivalent} t CO₂-eq</p>
                  </div>
                )}
              </>
            )}
          </div>
          {alert.level !== 'banned' && (
            <div className={`pt-2 border-t border-white/40 ${config.textColor} font-semibold text-sm`}>
              📅 Prohibición: {alert.banDate.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          )}
        </div>

        {/* Plan de acción */}
        <div className="bg-white/60 rounded-lg p-3">
          <h4 className={`font-semibold ${config.textColor} mb-2 flex items-center gap-2`}>
            <TrendingUp className="w-4 h-4" />
            Plan de Acción Recomendado
          </h4>
          <ol className="space-y-1.5 text-sm">
            {getActionPlan().map((step, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <span className={`font-bold flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${config.badgeColor.split(' ')[0]} text-white text-xs`}>
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Recomendación de sustituto */}
        {refrigerantData.replacement && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-green-700 mb-2">
              <CheckCircle2 className="w-4 h-4" />
              Alternativa Recomendada
            </p>
            <p className="text-sm text-green-700">{refrigerantData.replacement}</p>
            {refrigerantData.retrofit_type && (
              <p className="text-xs text-green-600 mt-1">
                <strong>Retrofit:</strong> {refrigerantData.retrofit_type}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}