#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Demo REALISTA VERTICAL 9:16 (1080x1920) para redes, con capturas reales."""
import os, numpy as np
from PIL import Image, ImageDraw, ImageFont
import imageio.v2 as imageio

W,H=1080,1920; FPS=24; FADE=int(0.5*FPS)
D="/home/user/gestion-pro-total-mantenimiento-e-instalaciones"; CAP=f"{D}/distribucion/COMERCIAL/capturas"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"; BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
NAVY_TOP=(16,40,71); NAVY_BOT=(8,20,38); BLUE=(46,130,214); CYAN=(96,178,235)
WHITE=(240,246,252); GREY=(170,188,208); GOLD=(240,190,78); SLATE=(15,23,42)
def f(s,b=True): return ImageFont.truetype(BOLD if b else FONT,s)
def ct(d,cx,y,t,fn,fill):
    w=d.textlength(t,font=fn); d.text((cx-w/2,y),t,font=fn,fill=fill)
def wrap(d,t,fn,mw):
    o,c=[],""
    for w in t.split():
        s=(c+" "+w).strip()
        if d.textlength(s,font=fn)<=mw:c=s
        else:o.append(c);c=w
    if c:o.append(c)
    return o
def base():
    top=np.array(NAVY_TOP,float);bot=np.array(NAVY_BOT,float);g=np.zeros((H,W,3),np.uint8)
    for y in range(H):g[y,:,:]=(top*(1-y/(H-1))+bot*(y/(H-1))).astype(np.uint8)
    im=Image.fromarray(g);d=ImageDraw.Draw(im,"RGBA")
    d.polygon([(0,H),(0,H-360),(W,H-560),(W,H)],fill=(46,130,214,26));return im
BASE=base()
LG=Image.open(f"{D}/public/logo-512.png").convert("RGBA");LG=LG.crop(LG.getbbox())
def logo(img,mw,cx,cy):
    l=LG.copy();r=mw/l.width;l=l.resize((int(l.width*r),int(l.height*r)),Image.LANCZOS)
    img.paste(l,(int(cx-l.width/2),int(cy-l.height/2)),l)

def s_intro():
    img=BASE.copy();d=ImageDraw.Draw(img,"RGBA")
    logo(img,560,W/2,620);ct(d,W/2,920,"GESTIÓN",f(92),WHITE);ct(d,W/2,1020,"PRO TOTAL",f(92),WHITE)
    ct(d,W/2,1200,"La app por dentro",f(46,False),CYAN);ct(d,W/2,1262,"demostración real",f(46,False),CYAN)
    return np.array(img)

def s_mobile(path,cap):
    img=Image.new("RGB",(W,H),SLATE);d=ImageDraw.Draw(img,"RGBA")
    s=Image.open(path).convert("RGB");crop=s.crop((0,0,s.width,min(s.height,1700)))
    r=(W-120)/crop.width;sw,sh=int(crop.width*r),int(crop.height*r);crop=crop.resize((sw,sh),Image.LANCZOS)
    x=(W-sw)//2;y=230;d.rounded_rectangle([x-10,y-10,x+sw+10,y+min(sh,1480)+10],22,fill=(0,0,0,80))
    img.paste(crop,(x,y));ct(d,W/2,95,cap,f(46),WHITE);return np.array(img)

def s_shot(path,cap):
    """Captura horizontal enmarcada en vertical con rotulo."""
    img=BASE.copy();d=ImageDraw.Draw(img,"RGBA")
    s=Image.open(path).convert("RGB");r=(W-100)/s.width;sw,sh=int(s.width*r),int(s.height*r);s=s.resize((sw,sh),Image.LANCZOS)
    x=(W-sw)//2;y=(H-sh)//2-60
    d.rounded_rectangle([x-10,y-10,x+sw+10,y+sh+10],18,fill=(0,0,0,120));img.paste(s,(x,y))
    # rotulo
    ty=y+sh+70
    for ln in wrap(d,cap,f(54),W-140): ct(d,W/2,ty,ln,f(54),WHITE);ty+=66
    return np.array(img)

def s_title(big,sub):
    img=BASE.copy();d=ImageDraw.Draw(img,"RGBA");y=720
    for ln in wrap(d,big,f(78),W-160):ct(d,W/2,y,ln,f(78),WHITE);y+=96
    y+=30
    for ln in wrap(d,sub,f(42,False),W-180):ct(d,W/2,y,ln,f(42,False),CYAN);y+=58
    return np.array(img)

def s_planes():
    img=BASE.copy();d=ImageDraw.Draw(img,"RGBA");ct(d,W/2,200,"Planes y licencias",f(66),WHITE)
    rows=[("Demo","Gratis · 7 días",False),("Mensual","19 € /mes",False),("Anual","149 € · 2 meses gratis",True),
          ("Perpetuo","599 € pago único",False),("Estudiantes","Gratis · matrícula",False),("Empresa","desde 49 € /mes",False)]
    y=340;rh=200;gap=24
    for nm,pr,top in rows:
        x0,x1=90,W-90
        if top:
            d.rounded_rectangle([x0,y,x1,y+rh],22,fill=(46,130,214,46),outline=GOLD,width=4)
            d.text((x0+40,y+24),"★ EL MÁS ELEGIDO",font=f(26),fill=GOLD);d.text((x0+40,y+70),nm,font=f(54),fill=WHITE);d.text((x0+40,y+136),pr,font=f(38,False),fill=GOLD)
        else:
            d.rounded_rectangle([x0,y,x1,y+rh],22,fill=(255,255,255,12),outline=(96,178,235,110),width=2)
            d.text((x0+40,y+50),nm,font=f(54),fill=WHITE);d.text((x0+40,y+118),pr,font=f(38,False),fill=CYAN)
        y+=rh+gap
    return np.array(img)

def s_close():
    img=BASE.copy();d=ImageDraw.Draw(img,"RGBA")
    ct(d,W/2,560,"Prueba 7 días",f(86),WHITE);ct(d,W/2,665,"GRATIS",f(108),GOLD)
    ct(d,W/2,840,"Si no te ahorra tiempo, no pagas.",f(40,False),GREY)
    logo(img,360,W/2,1180);ct(d,W/2,1400,"kairigarcia.gestionprototal@gmail.com",f(34),CYAN)
    ct(d,W/2,1470,"Gestión Pro Total · Empieza hoy",f(34,False),GREY);return np.array(img)

S=[(s_intro(),3.0,False),
   (s_mobile(f"{CAP}/pantalla-inicio-movil.png","La app, también en tu móvil"),3.6,True),
   (s_shot(f"{CAP}/calc-electrico.png","Cálculo eléctrico con resultados reales"),4.4,True),
   (s_shot(f"{CAP}/calc-multiarea-aire.png","Climatización multi-área de A/C"),4.2,True),
   (s_shot(f"{CAP}/equivalencia-refrigerantes.png","Refrigerantes — funciona sin internet"),3.8,True),
   (s_shot(f"{CAP}/herramientas-danfoss.png","Herramientas Danfoss integradas"),3.6,True),
   (s_title("Y mucho más","Clientes · Agenda · SAT · Facturas · Inventario · IA"),3.6,False),
   (s_planes(),5.0,False),(s_close(),4.0,False)]

def kb(img,n,zoom):
    im=Image.fromarray(img)
    for k in range(n):
        if not zoom: yield img; continue
        t=k/max(n-1,1);sc=1.0+0.05*t;nw,nh=int(W*sc),int(H*sc)
        big=im.resize((nw,nh),Image.LANCZOS);x=(nw-W)//2;y=(nh-H)//2
        yield np.array(big.crop((x,y,x+W,y+H)))

out=f"{D}/distribucion/COMERCIAL/Video-Demo-Realista-Vertical.mp4"
w=imageio.get_writer(out,fps=FPS,codec="libx264",quality=8,macro_block_size=None,ffmpeg_params=["-pix_fmt","yuv420p"])
for i,(img,hold,zoom) in enumerate(S):
    fr=list(kb(img,int(hold*FPS),zoom))
    for x in fr: w.append_data(x)
    if i<len(S)-1:
        a=fr[-1].astype(np.float32);nx=S[i+1][0].astype(np.float32)
        for k in range(FADE):
            t=(k+1)/FADE;w.append_data((a*(1-t)+nx*t).astype(np.uint8))
w.close();print("DEMO VERTICAL OK:",out)
