#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera el MAPA DE DISTRIBUCION (diagrama PNG) de Gestion Pro Total."""
import numpy as np
from PIL import Image, ImageDraw, ImageFont
W,H=1920,1280
NAVY_TOP=(16,40,71);NAVY_BOT=(8,20,38);BLUE=(46,130,214);CYAN=(96,178,235)
WHITE=(240,246,252);GREY=(170,188,208);GOLD=(240,190,78);GREEN=(34,197,94);SLATE=(15,23,42)
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def f(s,b=True): return ImageFont.truetype(BOLD if b else FONT,s)
# fondo
g=np.zeros((H,W,3),np.uint8)
for y in range(H): g[y,:,:]=(np.array(NAVY_TOP)*(1-y/(H-1))+np.array(NAVY_BOT)*(y/(H-1))).astype(np.uint8)
img=Image.fromarray(g); d=ImageDraw.Draw(img,"RGBA")
def ct(cx,y,t,fn,fill):
    w=d.textlength(t,font=fn); d.text((cx-w/2,y),t,font=fn,fill=fill)
def box(x,y,w,h,title,lines,col=BLUE,tcol=WHITE):
    d.rounded_rectangle([x,y,x+w,y+h],16,fill=(255,255,255,10),outline=col,width=3)
    d.rounded_rectangle([x,y,x+w,y+44],16,fill=col)
    d.rectangle([x,y+28,x+w,y+44],fill=col)
    ct(x+w/2,y+10,title,f(24),tcol)
    yy=y+58
    for ln in lines:
        d.text((x+18,yy),ln,font=f(18,False),fill=GREY); yy+=30
def arrow(x1,y1,x2,y2,col=CYAN):
    d.line([(x1,y1),(x2,y2)],fill=col,width=3)
    import math; ang=math.atan2(y2-y1,x2-x1); L=14
    d.polygon([(x2,y2),(x2-L*math.cos(ang-0.4),y2-L*math.sin(ang-0.4)),(x2-L*math.cos(ang+0.4),y2-L*math.sin(ang+0.4))],fill=col)

# Logo
try:
    lg=Image.open("/home/user/gestion-pro-total-mantenimiento-e-instalaciones/public/logo-512.png").convert("RGBA"); lg=lg.crop(lg.getbbox())
    r=110/lg.height; lg=lg.resize((int(lg.width*r),110),Image.LANCZOS); img.paste(lg,(70,40),lg)
except: pass
d.text((200,55),"GESTIÓN PRO TOTAL",font=f(48),fill=WHITE)
d.text((202,112),"Mapa de distribución del programa",font=f(26,False),fill=CYAN)

# Columna 1: REPOSITORIOS
box(70,210,520,250,"1 · REPOSITORIOS (GitHub)",[
 "PRIVADO  gestion-pro-...-instalaciones",
 "  · Código fuente, workflows CI",
 "  · Solo la clave PÚBLICA (segura)",
 "",
 "PÚBLICO  gestion-pro-total-releases",
 "  · Solo descargas (instaladores)",
], col=BLUE)

# Columna 1b: TU PC (privado)
box(70,500,520,250,"2 · SOLO PARA TI (privado)",[
 "SOLO-PARA-MI/",
 "  · CLAVE-PRIVADA-MAESTRA.json  🔑",
 "GESTOR-LICENCIAS/ (panel)",
 "  · Generas/firmas claves de licencia",
 "  · Buscas clientes (nombre/email)",
 "  · Guardas/Restauras la clave (config)",
], col=GOLD, tcol=(20,20,20))

# Columna 2: COMPILACION / PUBLICACION
box(700,210,520,250,"3 · COMPILACIÓN (GitHub Actions)",[
 "Genera automáticamente:",
 "  · Windows  .exe (instalador + portable)",
 "  · macOS    .dmg",
 "  · Linux    .AppImage / .deb",
 "  · Android  .apk",
 "Publica en  →  releases/latest",
], col=BLUE)

# Columna 2b: CANALES
box(700,500,520,250,"4 · CÓMO LO RECIBE EL CLIENTE",[
 "Página de descargas (releases/latest)",
 "Menú INSTALAR (cliente):",
 "  [1] Instalar en el PC (app normal)",
 "  [2] Servidor local (red)",
 "  [3] Nube / app web (PWA)",
 "Android: APK · Chromebook: APK/PWA",
], col=BLUE)

# Columna 3: CLIENTE / APP
box(1330,210,520,250,"5 · EL CLIENTE USA LA APP",[
 "Windows · macOS · Linux",
 "Android · Web (PWA)",
 "Online y sin conexión (offline)",
 "Auto-actualización (escritorio)",
 "Verifica licencia con la clave PÚBLICA",
], col=GREEN)

# Columna 3b: LICENCIAS FLUJO
box(1330,500,520,250,"6 · LICENCIAS (planes)",[
 "Demo 7 días gratis → luego elige plan",
 "Estudiantes: gratis (matrícula) 1 año",
 "Mensual/Trim./Sem./Anual · Perpetuo",
 "Empresa (packs)",
 "Solicitud → tu correo / Apps Script",
], col=GREEN)

# Flujo inferior (cadena de licencia)
box(70,820,1780,150,"FLUJO DE LA LICENCIA (de extremo a extremo)",[
 "1) Cliente abre la app → 'Solicitar licencia' (manda su ID de equipo a tu correo / Google Sheet)      2) TÚ en el panel: firmas la clave con tu CLAVE PRIVADA",
 "3) Le envías la clave  →  4) El cliente la pega en 'Ya tengo mi clave'  →  5) La app la valida con la CLAVE PÚBLICA  →  ✅ Activada",
], col=CYAN)

# flechas entre columnas
arrow(590,330,700,330); arrow(1220,330,1330,330)
arrow(590,620,700,620); arrow(1220,620,1330,620)

# pie
ct(W/2,1010,"La clave PRIVADA nunca sale de tu poder · La app y las descargas solo llevan la clave PÚBLICA (segura)",f(22,False),GOLD)
ct(W/2,1210,"Gestión Pro Total · kairigarcia.gestionprototal@gmail.com",f(20,False),GREY)

img.save("/home/user/gestion-pro-total-mantenimiento-e-instalaciones/distribucion/MAPA-DISTRIBUCION.png")
print("MAPA OK")
