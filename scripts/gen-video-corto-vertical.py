#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Version CORTA y VERTICAL (9:16, 1080x1920) para redes sociales."""
import os, numpy as np
from PIL import Image, ImageDraw, ImageFont
import imageio.v2 as imageio

W, H = 1080, 1920
FPS = 24; FADE = int(0.5*FPS)
BASEDIR = "/home/user/gestion-pro-total-mantenimiento-e-instalaciones"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

NAVY_TOP=(16,40,71); NAVY_BOT=(8,20,38); BLUE=(46,130,214); CYAN=(96,178,235)
WHITE=(240,246,252); GREY=(170,188,208); GOLD=(240,190,78); SLATE=(15,23,42)

def f(s,b=True): return ImageFont.truetype(BOLD if b else FONT, s)
def base():
    top=np.array(NAVY_TOP,float); bot=np.array(NAVY_BOT,float)
    g=np.zeros((H,W,3),np.uint8)
    for y in range(H):
        t=y/(H-1); g[y,:,:]=(top*(1-t)+bot*t).astype(np.uint8)
    im=Image.fromarray(g); d=ImageDraw.Draw(im,"RGBA")
    d.polygon([(0,H),(0,H-360),(W,H-560),(W,H)],fill=(46,130,214,26))
    return im
BASE=base()
LG=Image.open(f"{BASEDIR}/public/logo-512.png").convert("RGBA"); LG=LG.crop(LG.getbbox())
def logo(img,mw,cx,cy):
    l=LG.copy(); r=mw/l.width; l=l.resize((int(l.width*r),int(l.height*r)),Image.LANCZOS)
    img.paste(l,(int(cx-l.width/2),int(cy-l.height/2)),l)
def ct(d,cx,y,t,fn,fill):
    w=d.textlength(t,font=fn); d.text((cx-w/2,y),t,font=fn,fill=fill)
def wrapc(d,t,fn,mw):
    out,cur=[],""
    for w in t.split():
        s=(cur+" "+w).strip()
        if d.textlength(s,font=fn)<=mw: cur=s
        else: out.append(cur); cur=w
    if cur: out.append(cur)
    return out

def s_real():
    img=Image.new("RGB",(W,H),SLATE); d=ImageDraw.Draw(img,"RGBA")
    p=f"{BASEDIR}/distribucion/COMERCIAL/capturas/pantalla-inicio-movil.png"
    shot=Image.open(p).convert("RGB")
    # recorta parte superior (cabecera + planes) y escala al ancho
    crop=shot.crop((0,0,shot.width,min(shot.height,1760)))
    r=(W-120)/crop.width; sw,sh=int(crop.width*r),int(crop.height*r)
    crop=crop.resize((sw,sh),Image.LANCZOS)
    x=(W-sw)//2; y=200
    d.rounded_rectangle([x-10,y-10,x+sw+10,y+min(sh,1500)+10],24,fill=(0,0,0,80))
    img.paste(crop,(x,y))
    ct(d,W/2,90,"La app, también en tu móvil",f(46),WHITE)
    return np.array(img)

def s_title():
    img=BASE.copy(); d=ImageDraw.Draw(img,"RGBA")
    logo(img,560,W/2,640)
    ct(d,W/2,920,"GESTIÓN",f(96),WHITE); ct(d,W/2,1020,"PRO TOTAL",f(96),WHITE)
    d.rounded_rectangle([W/2-150,1160,W/2+150,1168],4,fill=BLUE)
    for i,ln in enumerate(["Gestión integral para","mantenimiento e instalaciones"]):
        ct(d,W/2,1210+i*60,ln,f(40,False),GREY)
    ct(d,W/2,1380,"Windows · Mac · Linux · Android · Web",f(34),CYAN)
    return np.array(img)

def s_bul(title,bullets):
    img=BASE.copy(); d=ImageDraw.Draw(img,"RGBA")
    d.rounded_rectangle([90,300,104,430],7,fill=BLUE)
    y=300
    for ln in wrapc(d,title,f(70),W-220): d.text((140,y),ln,font=f(70),fill=WHITE); y+=84
    y+=60
    for b in bullets:
        cx,cy=150,y+26
        d.ellipse([cx-26,cy-26,cx+26,cy+26],fill=BLUE)
        d.line([(cx-11,cy+1),(cx-3,cy+11)],fill=WHITE,width=6)
        d.line([(cx-3,cy+11),(cx+13,cy-11)],fill=WHITE,width=6)
        ty=y
        for ln in wrapc(d,b,f(46,False),W-260):
            d.text((cx+55,ty),ln,font=f(46,False),fill=WHITE); ty+=58
        y=ty+46
    return np.array(img)

def s_big(a,b):
    img=BASE.copy(); d=ImageDraw.Draw(img,"RGBA")
    y=620
    for ln in wrapc(d,a,f(82),W-160): ct(d,W/2,y,ln,f(82),WHITE); y+=98
    y+=40
    for ln in wrapc(d,b,f(46,False),W-200): ct(d,W/2,y,ln,f(46,False),CYAN); y+=64
    return np.array(img)

def s_planes():
    img=BASE.copy(); d=ImageDraw.Draw(img,"RGBA")
    ct(d,W/2,250,"Planes y licencias",f(70),WHITE)
    rows=[("Demo","Gratis · 7 días",False),("Mensual","19 € /mes",False),
          ("Anual","149 € · 2 meses gratis",True),("Perpetuo","599 € pago único",False),
          ("Estudiantes","Gratis · matrícula",False),("Empresa","desde 49 € /mes",False)]
    y=400; rh=200; gap=24
    for nm,pr,top in rows:
        x0,x1=90,W-90
        if top:
            d.rounded_rectangle([x0,y,x1,y+rh],22,fill=(46,130,214,46),outline=GOLD,width=4)
            d.text((x0+40,y+24),"★ EL MÁS ELEGIDO",font=f(26),fill=GOLD)
            d.text((x0+40,y+70),nm,font=f(56),fill=WHITE)
            d.text((x0+40,y+136),pr,font=f(40,False),fill=GOLD)
        else:
            d.rounded_rectangle([x0,y,x1,y+rh],22,fill=(255,255,255,12),outline=(96,178,235,110),width=2)
            d.text((x0+40,y+50),nm,font=f(56),fill=WHITE)
            d.text((x0+40,y+118),pr,font=f(40,False),fill=CYAN)
        y+=rh+gap
    return np.array(img)

def s_close():
    img=BASE.copy(); d=ImageDraw.Draw(img,"RGBA")
    ct(d,W/2,560,"Prueba 7 días",f(90),WHITE); ct(d,W/2,665,"GRATIS",f(110),GOLD)
    ct(d,W/2,840,"Si no te ahorra tiempo,",f(44,False),GREY)
    ct(d,W/2,900,"no pagas nada.",f(44,False),GREY)
    logo(img,360,W/2,1180)
    ct(d,W/2,1400,"kairigarcia.gestionprototal@gmail.com",f(34),CYAN)
    ct(d,W/2,1470,"Gestión Pro Total · Empieza hoy",f(34,False),GREY)
    return np.array(img)

slides=[(s_real(),3.8),(s_title(),3.2),
        (s_bul("Todo en una app",["Clientes, agenda y proyectos","Presupuestos y facturas","Mantenimientos y SAT","Calculadoras e IA"]),5.2),
        (s_big("Presupuesto a factura","en un solo clic"),3.2),
        (s_close(),4.0)]

out=f"{BASEDIR}/distribucion/COMERCIAL/Video-Corto-Vertical-Redes.mp4"
w=imageio.get_writer(out,fps=FPS,codec="libx264",quality=8,macro_block_size=None,ffmpeg_params=["-pix_fmt","yuv420p"])
for i,(im,hold) in enumerate(slides):
    for _ in range(int(hold*FPS)): w.append_data(im)
    if i<len(slides)-1:
        a=im.astype(np.float32); b=slides[i+1][0].astype(np.float32)
        for fr in range(FADE):
            t=(fr+1)/FADE; w.append_data((a*(1-t)+b*t).astype(np.uint8))
w.close(); print("CORTO OK:",out)
