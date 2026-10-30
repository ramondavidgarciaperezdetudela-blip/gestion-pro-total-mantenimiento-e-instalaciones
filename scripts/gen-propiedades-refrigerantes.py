#!/usr/bin/env python3
"""
Genera src/lib/refrigerantProps.js con las propiedades de saturación de los
refrigerantes, calculadas con CoolProp (ecuaciones de estado de referencia).

FICHERO DE DATOS GENERADO: para cambiarlo, se edita ESTE script y se vuelve a
ejecutar. No se retoca a mano el .js.

    pip install CoolProp
    python3 scripts/gen-propiedades-refrigerantes.py

Por qué existe: las tablas escritas a mano que había en el programa se
desviaban hasta 5 bar en algunos gases (el propano a 50 °C, por ejemplo), y la
calculadora de capilares necesita densidades, entalpías y viscosidades
coherentes entre sí, que no se pueden teclear de memoria.

Convenciones
------------
- Cada fila corresponde a una temperatura de BURBUJA (líquido saturado) y a su
  presión. En esa misma presión se da el punto de ROCÍO (vapor saturado). En un
  gas puro o azeótropo coinciden; en un zeótropo (R-407C, R-448A…) la
  diferencia es el "glide".
- Presiones en bar absolutos. Entalpías en kJ/kg (estado de referencia IIR de
  CoolProp: 200 kJ/kg el líquido saturado a 0 °C en los puros). Viscosidades en
  µPa·s. Densidades en kg/m³.
- Viscosidad líquida de las mezclas: CoolProp la calcula mal con R-32/R-125
  (da 1000 µPa·s en R-454B cuando es ~200). Se sustituye por la regla
  logarítmica de Grunberg-Nissan sobre los componentes puros:
  ln µ = Σ xᵢ ln µᵢ (xᵢ = fracción molar).
"""
import json
import math
import os
import sys
import warnings

import numpy as np
from scipy.interpolate import PchipInterpolator

import CoolProp
import CoolProp.CoolProp as CP

warnings.filterwarnings("ignore")

DESTINO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "lib", "refrigerantProps.js")

PASO_T = 2.5          # °C entre filas
T_MIN = -60.0
T_MAX_GLOBAL = 80.0
MARGEN_CRITICO = 4.0  # K por debajo de la temperatura crítica


def fraccion_molar(masicas):
    mm = {f: CP.PropsSI("M", f) for f in masicas}
    n = {f: masicas[f] / mm[f] for f in masicas}
    s = sum(n.values())
    return {f: n[f] / s for f in n}


def cadena_mezcla(masicas):
    x = fraccion_molar(masicas)
    return "HEOS::" + "&".join(f"{f}[{x[f]:.10f}]" for f in masicas)


def nombre_comercial(masicas):
    return " · ".join(f"{f.replace('R', 'R-', 1) if f.startswith('R') else f} {v * 100:g} %" for f, v in masicas.items())


# id visible, cadena CoolProp, composición másica (None = puro / pseudopuro),
# clase ASHRAE 34, usos orientativos, ¿se permite en capilar/filtro?
FLUIDOS = [
    # ── Puros ────────────────────────────────────────────────────────────────
    ("R-134a", "HEOS::R134a", None, "A1", True),
    ("R-32", "HEOS::R32", None, "A2L", True),
    ("R-290", "HEOS::R290", None, "A3", True),
    ("R-600a", "HEOS::R600a", None, "A3", True),
    ("R-22", "HEOS::R22", None, "A1", True),
    ("R-1234yf", "HEOS::R1234yf", None, "A2L", True),
    ("R-1234ze(E)", "HEOS::R1234ze(E)", None, "A2L", True),
    ("R-12", "HEOS::R12", None, "A1", True),
    ("R-717", "HEOS::R717", None, "B2L", False),
    ("R-744", "HEOS::R744", None, "A1", False),
    # ── Mezclas casi azeotrópicas / pseudopuras ──────────────────────────────
    ("R-410A", "HEOS::R410A", None, "A1", True),
    # ── Zeótropos y mezclas (composición másica según ASHRAE 34) ─────────────
    ("R-404A", None, {"R125": .44, "R143a": .52, "R134a": .04}, "A1", True),
    ("R-507A", None, {"R125": .50, "R143a": .50}, "A1", True),
    ("R-407A", None, {"R32": .20, "R125": .40, "R134a": .40}, "A1", True),
    ("R-407C", None, {"R32": .23, "R125": .25, "R134a": .52}, "A1", True),
    ("R-407F", None, {"R32": .30, "R125": .30, "R134a": .40}, "A1", True),
    ("R-448A", None, {"R32": .26, "R125": .26, "R1234yf": .20, "R134a": .21, "R1234ze(E)": .07}, "A1", True),
    ("R-449A", None, {"R32": .243, "R125": .247, "R1234yf": .253, "R134a": .257}, "A1", True),
    ("R-449B", None, {"R32": .252, "R125": .243, "R1234yf": .232, "R134a": .273}, "A1", True),
    ("R-452A", None, {"R32": .11, "R125": .59, "R1234yf": .30}, "A1", True),
    ("R-454B", None, {"R32": .689, "R1234yf": .311}, "A2L", True),
    ("R-454C", None, {"R32": .215, "R1234yf": .785}, "A2L", True),
    ("R-455A", None, {"R744": .03, "R32": .215, "R1234yf": .755}, "A2L", True),
    ("R-513A", None, {"R1234yf": .56, "R134a": .44}, "A1", True),
    ("R-450A", None, {"R134a": .42, "R1234ze(E)": .58}, "A1", True),
    ("R-456A", None, {"R32": .06, "R134a": .45, "R1234ze(E)": .49}, "A1", True),
    ("R-422D", None, {"R125": .651, "R134a": .315, "R600a": .034}, "A1", True),
    ("R-417A", None, {"R125": .466, "R134a": .50, "R600": .034}, "A1", True),
    ("R-427A", None, {"R32": .15, "R125": .25, "R143a": .10, "R134a": .50}, "A1", True),
]


def visc_liquida_mezcla(masicas, T_K):
    """Grunberg-Nissan sobre puros; si el puro está por encima de su Tc se usa Tc-5 K."""
    x = fraccion_molar(masicas)
    ln_mu = 0.0
    for f, xi in x.items():
        Tc = CP.PropsSI("Tcrit", f)
        T = min(T_K, Tc - 5.0)
        ln_mu += xi * math.log(CP.PropsSI("V", "T", T, "Q", 0, "HEOS::" + f))
    return math.exp(ln_mu)


def redondear(v, nd):
    return round(float(v), nd) + 0.0   # "+ 0.0" convierte -0.0 en 0.0


def estado(idv, cadena, masicas):
    """AbstractState del gas (más robusto y rápido que PropsSI con cadenas de mezcla)."""
    if masicas is None:
        AS = CoolProp.AbstractState("HEOS", cadena.replace("HEOS::", ""))
    else:
        AS = CoolProp.AbstractState("HEOS", "&".join(masicas))
        AS.set_mass_fractions(list(masicas.values()))
    return AS


def presion_burbuja(AS, T_K, P_guess):
    """Presión de burbuja a una temperatura. El solver por (T,Q) de CoolProp se pierde
    de forma esporádica con algunas mezclas: se reintenta con pequeñas variaciones de T
    (sobre las que se corrige por la pendiente de la curva) antes de rendirse."""
    for dT in (0.0, 0.03, -0.03, 0.08, -0.08, 0.2, -0.2):
        try:
            AS.update(CoolProp.QT_INPUTS, 0, T_K + dT)
            P1 = AS.p()
            if dT == 0.0:
                return P1
            # Clausius-Clapeyron local para volver a T_K: dlnP/dT ≈ L/(R T²) ≈ 0.05 /K a ~300 K
            AS.update(CoolProp.QT_INPUTS, 0, T_K + dT + (0.5 if dT <= 0 else -0.5))
            P2 = AS.p()
            dlnP_dT = (math.log(P2) - math.log(P1)) / (0.5 if dT <= 0 else -0.5)
            return math.exp(math.log(P1) - dlnP_dT * dT)
        except Exception:
            continue
    raise RuntimeError("sin solución por (T,Q)")


def filas_desde_envolvente(AS, masicas, T_max_global):
    """Tabla de una MEZCLA a partir de su envolvente de fases.

    El solver de saturación por temperatura de CoolProp se pierde de forma
    esporádica con las mezclas (sobre todo por encima de 45 °C). La envolvente
    de fases se traza entera de una vez, llega hasta el punto crítico y se
    interpola con PCHIP (monótono, sin oscilaciones):
      · presión de burbuja:  ln p frente a -1/T (casi lineal)
      · líquido de burbuja:  propiedades frente a T
      · vapor de rocío:      propiedades frente a ln p
    Ojo: en los datos de CoolProp los campos *_vap guardan SIEMPRE la fase de
    composición global (el líquido en la rama de burbuja, el vapor en la de
    rocío); los *_liq son la fase incipiente y no se usan.
    """
    AS.build_phase_envelope("")
    E = AS.get_phase_envelope_data()
    M = AS.molar_mass()
    T = np.array(E.T); p = np.array(E.p); Q = np.array(E.Q)
    rho = np.array(E.rhomolar_vap) * M
    h = np.array(E.hmolar_vap) / M

    def rama(q, clave):
        i = np.where(Q == q)[0]
        o = np.argsort(T[i] if clave == "T" else p[i])
        i = i[o]
        x = T[i] if clave == "T" else p[i]
        keep = np.concatenate(([True], np.diff(x) > (1e-9 if clave == "T" else 1e-3)))
        return i[keep]

    ib = rama(0, "T")      # burbuja, ordenada por T
    idw = rama(1, "p")     # rocío, ordenada por p
    Tb, pb = T[ib], p[ib]
    f_lnp = PchipInterpolator(-1.0 / Tb, np.log(pb))
    f_rl = PchipInterpolator(Tb, rho[ib])
    f_hl = PchipInterpolator(Tb, h[ib])
    pd_, Td_ = p[idw], T[idw]
    lp = np.log(pd_)
    f_Td = PchipInterpolator(lp, Td_)
    f_rv = PchipInterpolator(lp, rho[idw])
    f_hv = PchipInterpolator(lp, h[idw])

    T_crit_est = float(max(Tb.max(), Td_.max()))      # aprox. al punto crítico/cricondentérmico
    T_lim = min(T_max_global + 273.15, T_crit_est - 273.15 + 273.15 - 6.0)
    p_dew_min, p_dew_max = float(pd_.min()), float(pd_.max())
    filas = {k: [] for k in ("T", "P", "Td", "rl", "rv", "hl", "hv", "ml", "mv", "cpv")}
    T_ = T_MIN
    while T_ + 273.15 <= T_lim:
        Tk = T_ + 273.15
        if Tk < Tb.min() or Tk > Tb.max():
            T_ += PASO_T
            continue
        P = float(np.exp(f_lnp(-1.0 / Tk)))
        if not (p_dew_min <= P <= p_dew_max):
            T_ += PASO_T
            continue
        lp_ = math.log(P)
        ml = visc_liquida_mezcla(masicas, Tk)
        filas["T"].append(redondear(T_, 1))
        filas["P"].append(redondear(P / 1e5, 4))
        filas["Td"].append(redondear(float(f_Td(lp_)) - 273.15, 2))
        filas["rl"].append(redondear(float(f_rl(Tk)), 2))
        filas["rv"].append(redondear(float(f_rv(lp_)), 3))
        filas["hl"].append(redondear(float(f_hl(Tk)) / 1000, 2))
        filas["hv"].append(redondear(float(f_hv(lp_)) / 1000, 2))
        filas["ml"].append(redondear(ml * 1e6, 2))
        filas["cpv"].append(None)  # se rellenan más abajo (cp y viscosidad del vapor)
        filas["mv"].append(None)
        T_ += PASO_T

    # cp y viscosidad del vapor: la envolvente no las trae. Se calculan con la ecuación de
    # estado en el punto de rocío (P, Td) FIJANDO la fase gas: así no se llama al solver de
    # saturación, que es el que falla de forma esporádica en las mezclas. Es el cp isobárico
    # real, el mismo que se da en los gases puros. Las filas pegadas al punto crítico, donde
    # la ecuación de estado ya no responde, se CORTAN de la tabla (no se rellenan con ajustes).
    AS2 = CoolProp.AbstractState("HEOS", "&".join(masicas))
    AS2.set_mass_fractions(list(masicas.values()))
    AS2.specify_phase(CoolProp.iphase_gas)
    for i, P_bar in enumerate(filas["P"]):
        try:
            AS2.update(CoolProp.PT_INPUTS, P_bar * 1e5, filas["Td"][i] + 273.15)
            cp = AS2.cpmass() / 1000.0
            mu = AS2.viscosity() * 1e6
            if 0.3 < cp < 40.0 and 4.0 < mu < 30.0:
                filas["cpv"][i] = redondear(cp, 4)
                filas["mv"][i] = redondear(mu, 3)
        except Exception:
            pass
    validas = [filas["cpv"][i] is not None and filas["mv"][i] is not None for i in range(len(filas["P"]))]
    # La tabla se corta en la PRIMERA fila sin resultado fiable: lo que viene después está aún
    # más cerca del punto crítico y no se puede dar por bueno aunque el solver devuelva un número.
    n_ok = validas.index(False) if False in validas else len(validas)
    if n_ok < 0.75 * len(validas):
        raise RuntimeError(f"cp/viscosidad: la tabla se corta en la fila {n_ok} de {len(validas)}")
    if n_ok < len(validas):
        print(f"  · {len(validas) - n_ok} fila(s) finales cortadas (junto al punto crítico)", file=sys.stderr)
        for k in filas:
            del filas[k][n_ok:]
    return filas, T_crit_est - 273.15


def generar_fluido(idv, cadena, masicas, clase, calc_ok):
    s = cadena if cadena else cadena_mezcla(masicas)
    es_mezcla = masicas is not None
    AS = estado(idv, cadena, masicas)
    M = AS.molar_mass() * 1000.0
    try:
        Tcrit = AS.T_critical() - 273.15
        Pcrit = AS.p_critical() / 1e5
    except Exception:
        # Algunas mezclas (R-507A…) dan dos puntos críticos: se estima por la regla de Kay.
        x = fraccion_molar(masicas)
        Tcrit = sum(x[f] * CP.PropsSI("Tcrit", f) for f in x) - 273.15
        Pcrit = sum(x[f] * CP.PropsSI("pcrit", f) for f in x) / 1e5
    T_max = min(T_MAX_GLOBAL, Tcrit - MARGEN_CRITICO)
    n = int((T_max - T_MIN) / PASO_T)
    temps = [T_MIN + i * PASO_T for i in range(n + 1)]

    if es_mezcla:
        filas, Tcrit_env = filas_desde_envolvente(AS, masicas, T_MAX_GLOBAL)
        Tcrit = max(Tcrit, Tcrit_env) if Tcrit_env > 0 else Tcrit
        temps = []   # el bucle directo no se usa en mezclas
    else:
        filas = {k: [] for k in ("T", "P", "Td", "rl", "rv", "hl", "hv", "ml", "mv", "cpv")}
    P_prev = None
    fallos_seguidos = 0
    for T in temps:
        Tk = T + 273.15
        try:
            P = presion_burbuja(AS, Tk, P_prev * 1.12) if P_prev is not None else (AS.update(CoolProp.QT_INPUTS, 0, Tk), AS.p())[1]
            AS.update(CoolProp.PQ_INPUTS, P, 0)
            Tb = AS.T()
            rl, hl = AS.rhomass(), AS.hmass()
            ml_cp = AS.viscosity()
            AS.update(CoolProp.PQ_INPUTS, P, 1)
            Td, rv, hv = AS.T(), AS.rhomass(), AS.hmass()
            cpv, mv = AS.cpmass(), AS.viscosity()
            ml = visc_liquida_mezcla(masicas, Tb) if es_mezcla else ml_cp
            if abs(Tb - Tk) > 0.5:
                raise RuntimeError(f"temperatura de burbuja incoherente ({Tb-273.15:.2f} °C)")
        except Exception as e:
            fallos_seguidos += 1
            print(f"  · {idv}: fila {T:g} °C omitida ({str(e)[:60]})", file=sys.stderr)
            if fallos_seguidos >= 3:
                break  # cerca del punto crítico: se corta la tabla
            continue
        fallos_seguidos = 0
        P_prev = P
        filas["T"].append(redondear(T, 1))
        filas["P"].append(redondear(P / 1e5, 4))
        filas["Td"].append(redondear(Td - 273.15, 2))
        filas["rl"].append(redondear(rl, 2))
        filas["rv"].append(redondear(rv, 3))
        filas["hl"].append(redondear(hl / 1000, 2))
        filas["hv"].append(redondear(hv / 1000, 2))
        filas["ml"].append(redondear(ml * 1e6, 2))
        filas["mv"].append(redondear(mv * 1e6, 3))
        filas["cpv"].append(redondear(cpv / 1000, 4))

    if len(filas["T"]) < 20:
        raise RuntimeError(f"{idv}: tabla demasiado corta ({len(filas['T'])} filas)")

    glide_0 = None
    if 0.0 in filas["T"]:
        i0 = filas["T"].index(0.0)
        glide_0 = redondear(filas["Td"][i0] - filas["T"][i0], 2)

    ficha = {
        "id": idv,
        "mezcla": es_mezcla,
        "composicion": nombre_comercial(masicas) if es_mezcla else None,
        "clase": clase,
        "capilar": bool(calc_ok),
        "M": redondear(M, 2),
        "Tcrit": redondear(Tcrit, 1),
        "Pcrit": redondear(Pcrit, 2),
        "glide0": glide_0,
        "Tmin": filas["T"][0],
        "Tmax": filas["T"][-1],
    }
    ficha.update(filas)
    comprobar(ficha)
    return ficha


# Rangos físicos admisibles de cada magnitud (cualquier valor fuera de ellos es un fallo del cálculo)
RANGOS = {
    "P": (0.01, 120.0), "rl": (100.0, 1700.0), "rv": (0.05, 700.0), "hl": (-400.0, 900.0),
    "hv": (100.0, 2000.0), "ml": (20.0, 1500.0), "mv": (4.0, 30.0), "cpv": (0.3, 40.0),
}


def comprobar(f):
    """Falla en voz alta si la tabla de un gas tiene huecos, NaN o magnitudes incoherentes."""
    idv, n = f["id"], len(f["T"])
    for c in ("T", "P", "Td", "rl", "rv", "hl", "hv", "ml", "mv", "cpv"):
        v = f[c]
        if len(v) != n:
            raise RuntimeError(f"{idv}: la columna {c} tiene {len(v)} filas y T tiene {n}")
        for x in v:
            if x is None or not math.isfinite(x):
                raise RuntimeError(f"{idv}: valor no válido en {c}: {x}")
        if c in RANGOS and not (RANGOS[c][0] <= min(v) and max(v) <= RANGOS[c][1]):
            raise RuntimeError(f"{idv}: {c} fuera de rango físico ({min(v)} … {max(v)})")
    if any(b <= a for a, b in zip(f["T"], f["T"][1:])):
        raise RuntimeError(f"{idv}: T no crece")
    if any(b <= a for a, b in zip(f["P"], f["P"][1:])):
        raise RuntimeError(f"{idv}: P no crece con T")
    if any(b <= a for a, b in zip(f["Td"], f["Td"][1:])):
        raise RuntimeError(f"{idv}: Td no crece")
    if any(td < t - 0.011 for t, td in zip(f["T"], f["Td"])):
        raise RuntimeError(f"{idv}: Td por debajo de la temperatura de burbuja")
    if any(l <= v for l, v in zip(f["rl"], f["rv"])):
        raise RuntimeError(f"{idv}: densidad de líquido ≤ vapor")
    if any(b > a for a, b in zip(f["rl"], f["rl"][1:])):
        raise RuntimeError(f"{idv}: la densidad del líquido crece con T")
    lat = [v - l for l, v in zip(f["hl"], f["hv"])]
    if any(x <= 0 for x in lat) or any(b > a + 0.05 for a, b in zip(lat, lat[1:])):
        raise RuntimeError(f"{idv}: calor latente incoherente")


def main():
    datos = {}
    for idv, cadena, masicas, clase, calc_ok in FLUIDOS:
        print(f"→ {idv}", file=sys.stderr)
        datos[idv] = generar_fluido(idv, cadena, masicas, clase, calc_ok)

    cabecera = f"""/* eslint-disable */
/**
 * PROPIEDADES DE SATURACIÓN DE REFRIGERANTES — FICHERO GENERADO, NO EDITAR A MANO.
 *
 * Se rehace con:  python3 scripts/gen-propiedades-refrigerantes.py
 * Origen: CoolProp {CoolProp.__version__} (ecuaciones de estado de referencia, HEOS).
 *
 * Cada gas lleva filas cada {PASO_T:g} °C de temperatura de BURBUJA (T) con su presión (P, bar
 * absolutos). En esa misma presión: temperatura de rocío (Td), densidades de líquido (rl)
 * y vapor (rv) en kg/m³, entalpías (hl, hv) en kJ/kg, viscosidades (ml, mv) en µPa·s y
 * calor específico del vapor (cpv) en kJ/kg·K.
 *
 * Los valores de un fabricante concreto (su tabla comercial) pueden diferir unas décimas
 * de bar: los zeótropos y las mezclas dependen de la composición real del cilindro.
 */
"""
    cuerpo = "export const REFRIGERANT_PROPS = " + json.dumps(datos, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + ";\n"
    with open(DESTINO, "w", encoding="utf-8") as f:
        f.write(cabecera + cuerpo)
    tam = os.path.getsize(DESTINO)
    print(f"\nEscrito {os.path.normpath(DESTINO)}  ({tam/1024:.0f} KB, {len(datos)} gases)", file=sys.stderr)


if __name__ == "__main__":
    main()
