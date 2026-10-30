# Módulo CMMS HVAC — guía técnica

Módulo de gestión técnica de activos de climatización de **Gestión Pro Total** (versión 1.78.0). Une el control operativo (fichas, avisos, registros) con el cálculo de ingeniería frigorífica.

## 1. Arquitectura

```
┌───────────────────────── Interfaz (React) ─────────────────────────┐
│ src/pages/ActivosHVAC.jsx                                          │
│  Alertas · Ficha · Carga térmica · Diagnóstico · Control de fugas  │
└───────────────┬────────────────────────────────────────┬───────────┘
                │ funciones puras                         │ base44.entities
┌───────────────▼──────────────────┐   ┌──────────────────▼──────────────────┐
│ src/lib/hvacCmms.js              │   │ Base44 (o PostgreSQL / Supabase)     │
│  situacionFGas()                 │   │  ClientMachine  (ficha ampliada)     │
│  calcularCargaTermica()          │   │  HVACDiagnosis  (mediciones + result)│
│  calcularCiclo() / diagnosticar()│   │  LeakCheck      (registro de fugas)  │
│  planPreventivo() / alertas…()   │   └──────────────────────────────────────┘
└───────────────┬──────────────────┘
                │
┌───────────────▼──────────────────┐
│ src/lib/saturacion.js            │  Propiedades P–T de CoolProp, PCHIP en ln P
│ src/lib/refrigerantes.js         │  Catálogo de gases (PCA, familia, aceite)
└──────────────────────────────────┘
```

Toda la física vive en funciones puras sin dependencias de pantalla: se prueban con `npm run test:hvac` (38 pruebas) y se pueden reutilizar en las funciones del servidor de Base44, en la app móvil y en la versión fuera de Base44.

## 2. Modelo de datos

| Entidad Base44 | Tabla PostgreSQL | Contenido |
|---|---|---|
| `ClientMachine` (ampliada, campos opcionales) | `activo_hvac` | Ficha del equipo: refrigerante, carga kg, t CO₂e, aceite, expansión, compresor, presiones nominales, PS, consignas, potencias, condiciones del local, periodicidades y fechas |
| `HVACDiagnosis` (nueva) | `diagnostico_hvac` | Mediciones obligatorias de campo y resultados calculados (SH, SC, ΔT, aproximación, relación de compresión, veredicto, hipótesis) |
| `LeakCheck` (nueva) | `control_fugas` | Registro del control de fugas exigido por el art. 5: técnico, certificado, método, resultado, kg añadidos/recuperados, verificación tras reparación |

Se ha ampliado `ClientMachine` en vez de crear otra entidad de equipos porque es la ficha que ya usan el portal de cliente, el historial de intervenciones y la función diaria `generatePreventiveMaintenance`. Los campos nuevos son todos opcionales: los equipos existentes siguen funcionando igual.

El esquema SQL equivalente, con restricciones `CHECK`, columnas generadas, disparadores y la vista `alertas_preventivo`, está en `esquema-postgresql.sql` y se ha probado en PostgreSQL 16.

## 3. Gases fluorados — Reglamento (UE) 2024/573

```
t CO₂e = carga (kg) × PCA / 1000
kg HFO = carga (kg) × fracción HFO de la mezcla
```

| Anexo I (t CO₂e) | Anexo II sec. 1 (kg) | Sin detección | Con detección |
|---|---|---|---|
| ≥ 5 y < 50 | ≥ 1 y < 10 | 12 meses | 24 meses |
| ≥ 50 y < 500 | ≥ 10 y < 100 | 6 meses | 12 meses |
| ≥ 500 | ≥ 100 | 3 meses | 6 meses |

- En mezclas HFC/HFO se evalúan las dos partes y manda la periodicidad más corta (p. ej. 33 kg de R-454B → 10,3 kg de HFO → cada 6 meses, aunque por t CO₂e saldrían 12).
- Aparatos herméticamente sellados: exentos por debajo de 10 t CO₂e o de 2 kg de HFO (3 kg en edificios residenciales).
- Detección de fugas obligatoria (art. 6) desde 500 t CO₂e o 100 kg de HFO; se revisa cada 12 meses.
- R-290, R-600a, R-717 y R-744 no son gases fluorados: no se generan controles de fugas F-Gas (sí aplica la seguridad de EN 378).
- El PCA sale del catálogo de la aplicación; si el del reglamento difiere, se escribe en «PCA manual» de la ficha y prevalece.

## 4. Carga térmica y verificación del equipo

```
Q_sensible = QS × (1 + factor de seguridad)
Q_latente  = QL × (1 + factor de seguridad)
Q_total    = Q_sensible + Q_latente           [kW] → × 3412,14 = Btu/h → ÷ 3,517 = TR
FCS (SHR)  = Q_sensible / Q_total
Cobertura  = capacidad del equipo × corrección / Q_total
```

| Cobertura | Veredicto |
|---|---|
| < 0,95 | insuficiente |
| 0,95 – 1,00 | justo |
| 1,00 – 1,30 | adecuado |
| > 1,30 | sobredimensionado (ciclos cortos, mala deshumectación) |

Si la capacidad sensible del equipo no cubre la carga sensible, el veredicto pasa a `insuficiente_sensible` aunque el total cuadre. Sin dato del fabricante se supone FCS del equipo = 0,75. En campo, `capacidadSensibleAire(caudal, ΔT)` contrasta la capacidad real: Q = 1,2 · 1,006 · V · ΔT.

## 5. Diagnóstico de campo

Mediciones **obligatorias** (el formulario no guarda sin ellas y la tabla SQL las declara `NOT NULL`): presión de succión, presión de descarga, T de línea de aspiración, T de línea de líquido y T de bulbo seco del aire a la entrada y salida de evaporador y condensador.

```
T_evap  = T_sat,rocío(P_succión)        Recalentamiento = T_aspiración − T_evap
T_cond  = T_sat,burbuja(P_descarga)     Subenfriamiento = T_cond − T_líquido
ΔT_evap = T_aire,entrada − T_aire,salida    ΔT_cond = T_aire,salida − T_aire,entrada
Aproximación = T_cond,rocío − T_aire,entrada condensador
TD evap      = T_aire,entrada evaporador − T_evap
```

Rangos de referencia (confort, frío, ajustables en `RANGOS_DIAGNOSTICO`):

| Variable | Válvula | Capilar | Electrónica |
|---|---|---|---|
| Recalentamiento (K) | 4 – 8 | 5 – 12 | 3 – 7 |
| Subenfriamiento (K) | 4 – 8 | 2 – 8 | 3 – 8 |
| ΔT evaporador | 8 – 14 K | | |
| ΔT condensador | 6 – 14 K | | |
| Aproximación condensador | 8 – 18 K | | |
| TD evaporador | 12 – 22 K | | |

Matriz de reglas (códigos estables para estadísticas de averías):

| Código | SH | SC | Succión | Descarga | Otros |
|---|---|---|---|---|---|
| `FALTA_CARGA` | alto | bajo | baja | — | ΔT evap bajo |
| `RESTRICCION_LIQUIDO` | alto | alto | baja | — | |
| `EXCESO_CARGA` | bajo | alto | alta | alta | |
| `CONDENSADOR_SUCIO` | — | no alto | — | alta | |
| `NO_CONDENSABLES` | no bajo | alto | — | alta | ΔT cond normal |
| `BAJO_CAUDAL_EVAP` | bajo | — | baja | — | ΔT evap alto |
| `EXPANSION_ABIERTA` | bajo | no alto | alta | — | |
| `COMPRESOR_INEFICIENTE` | — | — | alta | baja | relación < 2,2 |

Además avisa de: desviación > 15 % respecto a las presiones nominales de la ficha, temperatura de descarga ≥ 105 °C (aviso) o ≥ 120 °C (alarma), relación de compresión > 8 y deslizamiento de mezclas zeótropas.

## 6. Plan preventivo y alertas

`planPreventivo(activo)` genera tres tipos de tarea:

1. `CONTROL_FUGAS` — normativa, periodicidad del apartado 3, desde el último control (o la instalación). Aviso a 30 días.
2. `REVISION_DETECTOR` — normativa, cada 12 meses cuando la detección es obligatoria.
3. `PREVENTIVO_GENERAL` — buena práctica, periodicidad editable en la ficha para ajustarla al manual del fabricante y al programa RITE de la empresa mantenedora. Aviso a 15 días.

`alertasCartera(equipos)` devuelve solo lo vencido o próximo, ordenado por urgencia. Al registrar un control de fugas, la ficha recalcula sola la fecha del siguiente y, si hubo fuga, propone la verificación de la reparación a un mes.

## 7. Uso

```bash
npm run test:hvac        # 38 pruebas del motor técnico
npm run dev              # pantalla en Menú → Clima → Activos HVAC
```

Para la versión con PostgreSQL / Supabase: `psql -f docs/hvac-cmms/esquema-postgresql.sql`.
