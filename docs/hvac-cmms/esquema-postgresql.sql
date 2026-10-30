-- ════════════════════════════════════════════════════════════════════════════
-- Gestión Pro Total · Módulo CMMS HVAC · Esquema PostgreSQL (≥ 13)
--
-- Para la versión fuera de Base44 (Supabase o servidor propio). En Base44 el mismo
-- modelo está en base44/entities/ClientMachine.jsonc, HVACDiagnosis.jsonc y
-- LeakCheck.jsonc. Los cálculos (t CO₂e, periodicidad, recalentamiento…) se hacen en
-- src/lib/hvacCmms.js; aquí se guardan los resultados y se protegen con restricciones.
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Catálogo de refrigerantes ──────────────────────────────────────────────
CREATE TABLE refrigerante (
  id              text PRIMARY KEY,                 -- 'R-410A', 'R-454B'…
  familia         text NOT NULL CHECK (familia IN ('CFC','HCFC','HFC','HFO','Natural (HC)','Natural','Otro')),
  pca             numeric(8,3) NOT NULL CHECK (pca >= 0),   -- potencial de calentamiento atmosférico
  fraccion_hfo    numeric(5,4) NOT NULL DEFAULT 0 CHECK (fraccion_hfo BETWEEN 0 AND 1), -- parte del anexo II
  es_fluorado     boolean NOT NULL DEFAULT true,
  clase_seguridad text,                              -- A1, A2L, A3…
  aceite_recomendado text
);

-- ── Clientes ───────────────────────────────────────────────────────────────
CREATE TABLE cliente (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    text NOT NULL,
  nif       text,
  direccion text,
  creado_en timestamptz NOT NULL DEFAULT now()
);

-- ── Activo HVAC (ficha del equipo) ─────────────────────────────────────────
CREATE TYPE tipo_aceite      AS ENUM ('POE','PVE','Mineral','AB','PAG');
CREATE TYPE tipo_expansion   AS ENUM ('valvula','electronica','capilar');
CREATE TYPE estado_activo    AS ENUM ('operativo','en_reparacion','fuera_servicio','baja');
CREATE TYPE veredicto_carga  AS ENUM ('insuficiente','insuficiente_sensible','justo','adecuado','sobredimensionado');

CREATE TABLE activo_hvac (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id             uuid NOT NULL REFERENCES cliente(id) ON DELETE RESTRICT,
  nombre                 text NOT NULL,
  tipo                   text NOT NULL DEFAULT 'aire_acondicionado',
  marca                  text,
  modelo                 text,
  numero_serie           text,
  ubicacion              text,
  fecha_instalacion      date,
  estado                 estado_activo NOT NULL DEFAULT 'operativo',

  -- Refrigerante y Reglamento (UE) 2024/573
  refrigerante_id        text REFERENCES refrigerante(id),
  carga_kg               numeric(8,3) CHECK (carga_kg > 0),
  pca_manual             numeric(8,3) CHECK (pca_manual >= 0),
  hermetico              boolean NOT NULL DEFAULT false,
  deteccion_fugas        boolean NOT NULL DEFAULT false,
  residencial            boolean NOT NULL DEFAULT false,
  t_co2e                 numeric(10,3),       -- calculado por la aplicación
  periodicidad_fugas_meses smallint CHECK (periodicidad_fugas_meses IN (3,6,12,24)),
  ultimo_control_fugas   date,
  proximo_control_fugas  date,
  ultima_revision_detector date,

  -- Circuito frigorífico
  tipo_aceite            tipo_aceite,
  carga_aceite_l         numeric(6,2) CHECK (carga_aceite_l > 0),
  expansion              tipo_expansion NOT NULL DEFAULT 'valvula',
  tipo_compresor         text CHECK (tipo_compresor IN ('rotativo','scroll','piston','tornillo','centrifugo','otro')),
  p_nominal_baja_bar     numeric(6,2),        -- manométrica
  p_nominal_alta_bar     numeric(6,2),
  ps_placa_bar           numeric(6,2),
  CHECK (p_nominal_alta_bar IS NULL OR p_nominal_baja_bar IS NULL OR p_nominal_alta_bar > p_nominal_baja_bar),

  -- Consignas
  consigna_frio_c        numeric(4,1) CHECK (consigna_frio_c BETWEEN -40 AND 35),
  consigna_calor_c       numeric(4,1) CHECK (consigna_calor_c BETWEEN 5 AND 60),
  consigna_hr_pct        numeric(4,1) CHECK (consigna_hr_pct BETWEEN 0 AND 100),

  -- Capacidades y verificación de carga térmica
  potencia_frigorifica_kw numeric(8,2) CHECK (potencia_frigorifica_kw > 0),
  potencia_sensible_kw    numeric(8,2) CHECK (potencia_sensible_kw > 0),
  potencia_calorifica_kw  numeric(8,2) CHECK (potencia_calorifica_kw > 0),
  local_area_m2           numeric(8,2) CHECK (local_area_m2 > 0),
  local_carga_sensible_w  numeric(10,1) CHECK (local_carga_sensible_w >= 0),
  local_carga_latente_w   numeric(10,1) CHECK (local_carga_latente_w >= 0),
  factor_seguridad        numeric(4,3) NOT NULL DEFAULT 0.10 CHECK (factor_seguridad BETWEEN 0 AND 1),
  cobertura_carga         numeric(5,2),
  veredicto_carga         veredicto_carga,
  CHECK (potencia_sensible_kw IS NULL OR potencia_frigorifica_kw IS NULL OR potencia_sensible_kw <= potencia_frigorifica_kw),

  -- Preventivo general
  intervalo_preventivo_meses smallint NOT NULL DEFAULT 6 CHECK (intervalo_preventivo_meses BETWEEN 1 AND 60),
  ultimo_preventivo      date,
  proximo_preventivo     date,

  creado_en              timestamptz NOT NULL DEFAULT now(),
  actualizado_en         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activo_hvac_cliente_idx ON activo_hvac (cliente_id);
CREATE INDEX activo_hvac_fugas_idx   ON activo_hvac (proximo_control_fugas) WHERE estado <> 'baja';

-- t CO₂e calculado también en la base de datos, como salvaguarda (la parte HFO pura no cuenta).
CREATE OR REPLACE FUNCTION activo_hvac_calcular() RETURNS trigger AS $$
DECLARE r refrigerante%ROWTYPE;
BEGIN
  SELECT * INTO r FROM refrigerante WHERE id = NEW.refrigerante_id;
  IF NEW.carga_kg IS NOT NULL AND r.id IS NOT NULL AND r.es_fluorado AND r.fraccion_hfo < 1 THEN
    NEW.t_co2e := round(NEW.carga_kg * COALESCE(NEW.pca_manual, r.pca) / 1000, 3);
  ELSIF r.id IS NOT NULL AND (NOT r.es_fluorado OR r.fraccion_hfo >= 1) THEN
    NEW.t_co2e := 0;
  END IF;
  IF NEW.periodicidad_fugas_meses IS NOT NULL THEN
    NEW.proximo_control_fugas := (COALESCE(NEW.ultimo_control_fugas, NEW.fecha_instalacion)
                                  + make_interval(months => NEW.periodicidad_fugas_meses))::date;
  END IF;
  NEW.actualizado_en := now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER activo_hvac_calcular_trg
  BEFORE INSERT OR UPDATE ON activo_hvac
  FOR EACH ROW EXECUTE FUNCTION activo_hvac_calcular();

-- ── Diagnóstico de campo (avería con mediciones obligatorias) ─────────────
CREATE TABLE diagnostico_hvac (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id           uuid NOT NULL REFERENCES activo_hvac(id) ON DELETE CASCADE,
  fecha               timestamptz NOT NULL DEFAULT now(),
  tecnico             text NOT NULL,
  refrigerante_id     text NOT NULL REFERENCES refrigerante(id),
  modo                text NOT NULL DEFAULT 'frio' CHECK (modo IN ('frio','calor')),
  expansion           tipo_expansion NOT NULL,
  unidad_presion      text NOT NULL DEFAULT 'bar' CHECK (unidad_presion IN ('bar','psi')),
  referencia_presion  text NOT NULL DEFAULT 'manometrica' CHECK (referencia_presion IN ('manometrica','absoluta')),

  -- Mediciones físicas OBLIGATORIAS (NOT NULL: no se admite texto libre sin datos)
  p_succion           numeric(7,2) NOT NULL,
  p_descarga          numeric(7,2) NOT NULL,
  t_linea_aspiracion  numeric(5,1) NOT NULL,
  t_linea_liquido     numeric(5,1) NOT NULL,
  t_aire_evap_entrada numeric(5,1) NOT NULL,
  t_aire_evap_salida  numeric(5,1) NOT NULL,
  t_aire_cond_entrada numeric(5,1) NOT NULL,
  t_aire_cond_salida  numeric(5,1) NOT NULL,
  CHECK (p_descarga > p_succion),
  -- Opcionales
  t_linea_descarga    numeric(5,1),
  caudal_evap_m3h     numeric(8,1) CHECK (caudal_evap_m3h > 0),
  consumo_compresor_a numeric(6,2) CHECK (consumo_compresor_a >= 0),

  -- Resultados calculados (src/lib/hvacCmms.js → diagnosticar)
  t_evaporacion_c     numeric(5,1),
  t_condensacion_c    numeric(5,1),
  recalentamiento_k   numeric(5,1),
  subenfriamiento_k   numeric(5,1),
  dt_evaporador_k     numeric(5,1) GENERATED ALWAYS AS (t_aire_evap_entrada - t_aire_evap_salida) STORED,
  dt_condensador_k    numeric(5,1) GENERATED ALWAYS AS (t_aire_cond_salida - t_aire_cond_entrada) STORED,
  aproximacion_cond_k numeric(5,1),
  relacion_compresion numeric(5,2),
  veredicto           text,
  hipotesis           jsonb NOT NULL DEFAULT '[]'::jsonb,
  avisos              jsonb NOT NULL DEFAULT '[]'::jsonb,
  observaciones       text
);
CREATE INDEX diagnostico_activo_idx    ON diagnostico_hvac (activo_id, fecha DESC);
CREATE INDEX diagnostico_veredicto_idx ON diagnostico_hvac (veredicto);

-- ── Registro de controles de fugas (art. 5: registro obligatorio) ─────────
CREATE TABLE control_fugas (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id             uuid NOT NULL REFERENCES activo_hvac(id) ON DELETE CASCADE,
  fecha                 date NOT NULL,
  tecnico               text NOT NULL,
  certificado_tecnico   text,
  refrigerante_id       text REFERENCES refrigerante(id),
  carga_kg              numeric(8,3),
  t_co2e                numeric(10,3),
  metodo                text NOT NULL CHECK (metodo IN ('directo_detector','directo_espuma','directo_uv','indirecto_parametros','nitrogeno')),
  resultado             text NOT NULL CHECK (resultado IN ('sin_fugas','fuga_detectada','fuga_reparada')),
  ubicacion_fuga        text,
  refrigerante_anadido_kg   numeric(8,3) CHECK (refrigerante_anadido_kg >= 0),
  refrigerante_recuperado_kg numeric(8,3) CHECK (refrigerante_recuperado_kg >= 0),
  fecha_verificacion    date,               -- control tras reparar la fuga
  proximo_control       date,
  observaciones         text,
  CHECK (resultado = 'sin_fugas' OR ubicacion_fuga IS NOT NULL)
);
CREATE INDEX control_fugas_activo_idx ON control_fugas (activo_id, fecha DESC);

-- Al registrar un control, la ficha del activo se actualiza sola.
CREATE OR REPLACE FUNCTION control_fugas_actualiza_activo() RETURNS trigger AS $$
BEGIN
  UPDATE activo_hvac SET ultimo_control_fugas = NEW.fecha
   WHERE id = NEW.activo_id AND (ultimo_control_fugas IS NULL OR ultimo_control_fugas < NEW.fecha);
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER control_fugas_actualiza_activo_trg
  AFTER INSERT ON control_fugas
  FOR EACH ROW EXECUTE FUNCTION control_fugas_actualiza_activo();

-- ── Vista de alertas del plan preventivo ──────────────────────────────────
CREATE OR REPLACE VIEW alertas_preventivo AS
SELECT a.id AS activo_id, a.nombre AS activo, c.nombre AS cliente,
       'CONTROL_FUGAS'::text AS tarea, true AS normativa,
       a.proximo_control_fugas AS vence,
       (a.proximo_control_fugas - current_date) AS dias,
       CASE WHEN a.proximo_control_fugas < current_date THEN 'vencida'
            WHEN a.proximo_control_fugas <= current_date + 30 THEN 'proxima'
            ELSE 'en_plazo' END AS estado
  FROM activo_hvac a JOIN cliente c ON c.id = a.cliente_id
 WHERE a.estado <> 'baja' AND a.proximo_control_fugas IS NOT NULL
UNION ALL
SELECT a.id, a.nombre, c.nombre, 'PREVENTIVO_GENERAL', false,
       COALESCE(a.proximo_preventivo,
                (a.ultimo_preventivo + make_interval(months => a.intervalo_preventivo_meses))::date),
       COALESCE(a.proximo_preventivo,
                (a.ultimo_preventivo + make_interval(months => a.intervalo_preventivo_meses))::date) - current_date,
       CASE WHEN COALESCE(a.proximo_preventivo, (a.ultimo_preventivo + make_interval(months => a.intervalo_preventivo_meses))::date) < current_date THEN 'vencida'
            WHEN COALESCE(a.proximo_preventivo, (a.ultimo_preventivo + make_interval(months => a.intervalo_preventivo_meses))::date) <= current_date + 15 THEN 'proxima'
            ELSE 'en_plazo' END
  FROM activo_hvac a JOIN cliente c ON c.id = a.cliente_id
 WHERE a.estado <> 'baja' AND (a.proximo_preventivo IS NOT NULL OR a.ultimo_preventivo IS NOT NULL);

-- ── Datos iniciales de refrigerantes habituales ───────────────────────────
-- PCA tomados del catálogo de la aplicación (src/lib/refrigerantes.js); revisar contra
-- los anexos I, II y VI del Reglamento (UE) 2024/573 antes de usarlos en producción.
INSERT INTO refrigerante (id, familia, pca, fraccion_hfo, es_fluorado, clase_seguridad, aceite_recomendado) VALUES
  ('R-410A','HFC',2088,0,true,'A1','POE'),
  ('R-32','HFC',675,0,true,'A2L','POE'),
  ('R-407C','HFC',1774,0,true,'A1','POE'),
  ('R-134a','HFC',1430,0,true,'A1','POE'),
  ('R-404A','HFC',3922,0,true,'A1','POE'),
  ('R-454B','HFO',466,0.311,true,'A2L','POE'),
  ('R-452B','HFO',698,0.26,true,'A2L','POE'),
  ('R-513A','HFO',631,0.56,true,'A1','POE'),
  ('R-448A','HFO',1387,0.27,true,'A1','POE'),
  ('R-449A','HFO',1397,0.253,true,'A1','POE'),
  ('R-1234yf','HFO',4,1,true,'A2L','POE'),
  ('R-1234ze(E)','HFO',7,1,true,'A2L','POE'),
  ('R-290','Natural (HC)',3,0,false,'A3','Mineral / POE'),
  ('R-744','Natural',1,0,false,'A1','POE')
ON CONFLICT (id) DO NOTHING;
