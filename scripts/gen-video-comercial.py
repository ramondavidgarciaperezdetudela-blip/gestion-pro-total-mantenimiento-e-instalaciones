#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Video de presentacion comercial de Gestion Pro Total (MP4 1080p).
Abre con una recreacion fiel de la PANTALLA DE INICIO del programa (con su logo)."""
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import imageio.v2 as imageio

W, H = 1920, 1080
FPS = 24
FADE = int(0.6 * FPS)

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

NAVY_TOP = (16, 40, 71); NAVY_BOT = (8, 20, 38)
BLUE = (46, 130, 214); CYAN = (96, 178, 235)
WHITE = (240, 246, 252); GREY = (170, 188, 208); GOLD = (240, 190, 78)
# colores UI de la app (tailwind)
SLATE900 = (15, 23, 42); BLUE700 = (29, 78, 216); BLUE100 = (219, 234, 254)
SLATE600 = (71, 85, 105); SLATE400 = (148, 163, 184); SLATE300 = (203, 213, 225)
SLATE200 = (226, 232, 240); SLATE50 = (248, 250, 252)
GREEN = (22, 163, 74); SKY300 = (125, 211, 252); BLUE50 = (239, 246, 255)
BLUE600 = (37, 99, 235); INK = (30, 41, 59)

def font(sz, bold=True): return ImageFont.truetype(BOLD if bold else FONT, sz)
def mono(sz): return ImageFont.truetype(MONO, sz)

def make_base():
    top = np.array(NAVY_TOP, float); bot = np.array(NAVY_BOT, float)
    grad = np.zeros((H, W, 3), np.uint8)
    for y in range(H):
        t = y/(H-1); grad[y,:,:] = (top*(1-t)+bot*t).astype(np.uint8)
    base = Image.fromarray(grad); d = ImageDraw.Draw(base, "RGBA")
    d.polygon([(0,H),(0,H-280),(W,H-470),(W,H)], fill=(46,130,214,26))
    d.polygon([(0,H),(0,H-150),(W,H-300),(W,H)], fill=(96,178,235,18))
    for r,a in [(520,10),(360,12),(220,14)]:
        d.ellipse([W-260-r,-r-120,W-260+r,-120+r], outline=(96,178,235,a), width=3)
    return base
BASE = make_base()

def load_logo():
    lg = Image.open("/home/user/gestion-pro-total-mantenimiento-e-instalaciones/public/logo-512.png").convert("RGBA")
    b = lg.getbbox()
    return lg.crop(b) if b else lg
LOGO = load_logo()

def paste_logo(img, max_w, cx, cy):
    lg = LOGO.copy(); r = max_w/lg.width
    lg = lg.resize((int(lg.width*r), int(lg.height*r)), Image.LANCZOS)
    img.paste(lg, (int(cx-lg.width/2), int(cy-lg.height/2)), lg); return lg.height

def ctext(d, cx, y, t, f, fill):
    w = d.textlength(t, font=f); d.text((cx-w/2, y), t, font=f, fill=fill)

def wrap(d, text, f, mw):
    out, cur = [], ""
    for w in text.split():
        t = (cur+" "+w).strip()
        if d.textlength(t, font=f) <= mw: cur = t
        else:
            if cur: out.append(cur)
            cur = w
    if cur: out.append(cur)
    return out

# ============== PANTALLA DE INICIO DEL PROGRAMA (recreacion fiel) ==============
def slide_startscreen():
    img = Image.new("RGB", (W, H), SLATE900); d = ImageDraw.Draw(img, "RGBA")
    # leve vinheta
    d.rectangle([0,0,W,H], fill=None)
    cw, ch = 980, 812
    cx0 = (W-cw)//2; cy0 = (H-ch)//2 - 6
    # sombra
    d.rounded_rectangle([cx0+14, cy0+18, cx0+cw+14, cy0+ch+18], 28, fill=(0,0,0,90))
    # tarjeta
    d.rounded_rectangle([cx0, cy0, cx0+cw, cy0+ch], 26, fill=WHITE)
    # cabecera azul
    hh = 132
    d.rounded_rectangle([cx0, cy0, cx0+cw, cy0+hh+26], 26, fill=BLUE700)
    d.rectangle([cx0, cy0+hh-6, cx0+cw, cy0+hh+20], fill=WHITE)  # recorta esquinas inferiores
    d.rectangle([cx0, cy0+26, cx0+cw, cy0+hh], fill=BLUE700)
    # logo en cabecera
    lg = LOGO.copy(); lr = 92/lg.height; lg = lg.resize((int(lg.width*lr), 92), Image.LANCZOS)
    img.paste(lg, (cx0+34, cy0+22), lg)
    tx = cx0+34+lg.width+24
    d.text((tx, cy0+34), "Gestión Pro Total", font=font(40), fill=WHITE)
    d.text((tx, cy0+86), "Activa tu licencia o suscríbete para empezar.", font=font(23, False), fill=BLUE100)
    # pestañas
    ty = cy0+hh+20; tw = cw//2
    d.text((cx0+tw//2-78, ty+14), "Suscribirme", font=font(24), fill=BLUE700)
    d.line([(cx0+40, ty+56),(cx0+tw-40, ty+56)], fill=BLUE700, width=4)
    d.text((cx0+tw+tw//2-110, ty+14), "Ya tengo mi clave", font=font(24, False), fill=SLATE400)
    d.line([(cx0, ty+58),(cx0+cw, ty+58)], fill=SLATE200, width=2)
    # cuerpo
    px = cx0+44; pw = cw-88; y = ty+86
    d.text((px, y), "Tu identificador de equipo", font=font(18), fill=SLATE600); y += 30
    d.rounded_rectangle([px, y, px+pw, y+52], 10, fill=SLATE900)
    ctext(d, px+pw/2, y+13, "PC-3F9A-77C2-10E4", mono(26), SKY300); y += 52+10
    d.text((px, y), "Tu licencia funcionará en este equipo. Envíanos este código.", font=font(15, False), fill=SLATE400); y += 40
    # inputs
    colw = (pw-24)//2
    for i,(lab,ph) in enumerate([("Nombre / Empresa","Mantenimientos García S.L."),("Email","tucorreo@empresa.com")]):
        ix = px + i*(colw+24)
        d.text((ix, y), lab, font=font(16), fill=SLATE600)
        d.rounded_rectangle([ix, y+26, ix+colw, y+26+46], 10, outline=SLATE300, width=2)
        d.text((ix+14, y+38), ph, font=font(18, False), fill=SLATE400)
    y += 26+46+30
    # planes
    d.text((px, y), "Elige tu plan", font=font(16), fill=SLATE600); y += 30
    planes = [("Mensual","19 €",False),("Anual","149 €",True),("Perpetuo","599 €",False),("Demo","Gratis",False)]
    gap = 16; pcw = (pw-gap*3)//4; pch = 104
    for i,(nm,pr,pop) in enumerate(planes):
        ix = px + i*(pcw+gap)
        if pop:
            d.rounded_rectangle([ix, y, ix+pcw, y+pch], 14, fill=BLUE50, outline=BLUE600, width=3)
            d.rounded_rectangle([ix+12, y+12, ix+12+86, y+12+24], 6, fill=BLUE600)
            d.text((ix+20, y+15), "POPULAR", font=font(13), fill=WHITE)
            ny = y+44
        else:
            d.rounded_rectangle([ix, y, ix+pcw, y+pch], 14, outline=SLATE200, width=2)
            ny = y+26
        d.text((ix+16, ny), nm, font=font(22), fill=INK)
        d.text((ix+16, ny+30), pr, font=font(22), fill=BLUE700)
    y += pch+26
    # boton verde
    d.rounded_rectangle([px, y, px+pw, y+58], 12, fill=GREEN)
    ctext(d, px+pw/2, y+16, "Solicitar demo gratis", font(24), WHITE); y += 58+22
    ctext(d, cx0+cw/2, y, "Soporte: kairigarcia.gestionprototal@gmail.com", font(16, False), SLATE400)
    # subtitulo flotante (contexto)
    d.text((cx0, cy0-58), "Así se abre tu programa: pantalla de inicio", font=font(30, False), fill=GREY)
    return np.array(img)

# ============== Diapositivas de contenido ==============
def slide_cover():
    img = BASE.copy(); d = ImageDraw.Draw(img, "RGBA")
    paste_logo(img, 560, W/2, 360)
    ctext(d, W/2, 600, "GESTIÓN PRO TOTAL", font(86), WHITE)
    ctext(d, W/2, 720, "Software de gestión integral para", font(40, False), GREY)
    ctext(d, W/2, 772, "mantenimiento e instalaciones", font(40, False), GREY)
    d.rounded_rectangle([W/2-180, 850, W/2+180, 858], 4, fill=BLUE)
    ctext(d, W/2, 900, "Web   ·   Windows   ·   macOS   ·   Linux   ·   Android", font(34), CYAN)
    return np.array(img)

def slide_title_big(title, subtitle):
    img = BASE.copy(); d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([160, 360, 174, 470], 6, fill=BLUE)
    d.text((210, 360), title, font=font(72), fill=WHITE)
    y = 500
    for ln in wrap(d, subtitle, font(44, False), W-440):
        d.text((210, y), ln, font=font(44, False), fill=GREY); y += 64
    return np.array(img)

def header(d, title):
    d.rounded_rectangle([160, 150, 174, 250], 6, fill=BLUE)
    d.text((210, 158), title, font=font(64), fill=WHITE)
    d.line([(210, 270),(W-160, 270)], fill=(96,178,235,90), width=2)

def slide_bullets(title, bullets, marker="check"):
    img = BASE.copy(); d = ImageDraw.Draw(img, "RGBA")
    header(d, title); y = 360
    step = (H-460)/max(len(bullets),1)
    for b in bullets:
        cx, cy = 230, y+22
        if marker == "check":
            d.ellipse([cx-22,cy-22,cx+22,cy+22], fill=(46,130,214,255))
            d.line([(cx-9,cy+1),(cx-2,cy+9)], fill=WHITE, width=5)
            d.line([(cx-2,cy+9),(cx+11,cy-9)], fill=WHITE, width=5)
        else:
            d.polygon([(cx,cy-18),(cx+18,cy),(cx,cy+18),(cx-18,cy)], fill=CYAN)
        d.text((cx+50, y), b, font=font(42, False), fill=WHITE); y += step
    return np.array(img)

def slide_plans():
    img = BASE.copy(); d = ImageDraw.Draw(img, "RGBA")
    header(d, "Planes y licencias")
    plans = [("DEMO","Gratis","7 días de prueba",False),("MENSUAL","19 €","al mes",False),
             ("ANUAL","149 €","2 meses gratis",True),("PERPETUO","599 €","pago único",False),
             ("ESTUDIANTES","Gratis","con matrícula",False),("EMPRESA","desde 49 €","varios equipos",False)]
    cols=3; gw,gh=480,270; gx=(W-cols*gw)/(cols+1); gy=50; y0=340
    for i,(name,price,note,star) in enumerate(plans):
        r,c = divmod(i,cols); x=gx+c*(gw+gx); y=y0+r*(gh+gy)
        border = GOLD if star else (96,178,235,120)
        fill = (46,130,214,40) if star else (255,255,255,12)
        d.rounded_rectangle([x,y,x+gw,y+gh],22,fill=fill,outline=border,width=4 if star else 2)
        if star: ctext(d, x+gw/2, y+18, "★  EL MÁS ELEGIDO", font(24), GOLD)
        ctext(d, x+gw/2, y+70, name, font(40), WHITE)
        ctext(d, x+gw/2, y+130, price, font(58), GOLD if star else CYAN)
        ctext(d, x+gw/2, y+205, note, font(28, False), GREY)
    return np.array(img)

def slide_close():
    img = BASE.copy(); d = ImageDraw.Draw(img, "RGBA")
    ctext(d, W/2, 250, "Prueba 7 días gratis", font(80), WHITE)
    ctext(d, W/2, 380, "Si no te ahorra tiempo, no pagas nada.", font(44, False), GREY)
    d.rounded_rectangle([W/2-220, 470, W/2+220, 478], 4, fill=BLUE)
    paste_logo(img, 360, W/2, 660)
    ctext(d, W/2, 830, "kairigarcia.gestionprototal@gmail.com", font(40), CYAN)
    ctext(d, W/2, 900, "Gestión Pro Total · Empieza hoy", font(32, False), GREY)
    return np.array(img)

# Apertura: CAPTURA REAL de la pantalla de inicio (si existe), si no, la recreacion
import os
_real = "/home/user/gestion-pro-total-mantenimiento-e-instalaciones/distribucion/COMERCIAL/capturas/portada-inicio-real.png"
opening = np.array(Image.open(_real).convert("RGB")) if os.path.exists(_real) else slide_startscreen()

slides = [
    (opening, 5.5),
    (slide_cover(), 3.8),
    (slide_title_big("Todo tu negocio en una sola app",
        "Clientes, presupuestos, facturas y agenda. Funciona incluso sin internet."), 4.5),
    (slide_bullets("Problemas que resuelve", [
        "Papeles y hojas de Excel desordenadas",
        "Presupuestos lentos de hacer y de cobrar",
        "Mantenimientos que se olvidan",
        "No saber qué clientes son rentables"], marker="diamond"), 5.0),
    (slide_bullets("Todo en uno", [
        "Clientes, proyectos y agenda",
        "Presupuestos y facturas en un clic",
        "Mantenimientos y SAT (partes y portal del cliente)",
        "Inventario, repuestos y proveedores",
        "Técnicos en campo: jornada, rutas y partes"]), 5.5),
    (slide_bullets("Calculadoras técnicas", [
        "Eléctrica y esquemas de cableado",
        "Climatización y análisis de potencia",
        "Térmica y cámaras frigoríficas",
        "Solar fotovoltaica con datos PVGIS"]), 5.0),
    (slide_title_big("Inteligencia Artificial integrada",
        "Genera presupuestos, informes y planificación. Búsqueda inteligente en lenguaje natural."), 4.5),
    (slide_bullets("Funciona en todas partes", [
        "Windows, macOS, Linux, Android y web",
        "Online y sin conexión (offline)",
        "Actualización automática",
        "PDFs y portal del cliente con tu logo"]), 5.0),
    (slide_bullets("Lo que ganas", [
        "Ahorras tiempo: de presupuesto a factura al instante",
        "Cobras antes: control de pendientes y avisos",
        "No pierdes mantenimientos: agenda recurrente",
        "Imagen profesional ante tus clientes"]), 5.0),
    (slide_plans(), 6.0),
    (slide_close(), 5.0),
]

out = "/home/user/gestion-pro-total-mantenimiento-e-instalaciones/distribucion/COMERCIAL/Video-Presentacion-Gestion-Pro-Total.mp4"
writer = imageio.get_writer(out, fps=FPS, codec="libx264", quality=8,
                            macro_block_size=None, ffmpeg_params=["-pix_fmt","yuv420p"])
for i,(img,hold) in enumerate(slides):
    for _ in range(int(hold*FPS)): writer.append_data(img)
    if i < len(slides)-1:
        a = img.astype(np.float32); b = slides[i+1][0].astype(np.float32)
        for f in range(FADE):
            t=(f+1)/FADE; writer.append_data((a*(1-t)+b*t).astype(np.uint8))
writer.close()
print("VIDEO OK:", out)
