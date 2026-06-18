#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Video DEMO REALISTA (1920x1080): capturas reales de la app con zoom suave y rotulos."""
import os, numpy as np
from PIL import Image, ImageDraw, ImageFont
import imageio.v2 as imageio

W, H = 1920, 1080
FPS = 24; FADE = int(0.5*FPS)
D = "/home/user/gestion-pro-total-mantenimiento-e-instalaciones"
CAP = f"{D}/distribucion/COMERCIAL/capturas"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
NAVY_TOP=(16,40,71); NAVY_BOT=(8,20,38); BLUE=(46,130,214); CYAN=(96,178,235)
WHITE=(240,246,252); GREY=(170,188,208); GOLD=(240,190,78); SLATE=(15,23,42)
def f(s,b=True): return ImageFont.truetype(BOLD if b else FONT,s)
def ct(d,cx,y,t,fn,fill):
    w=d.textlength(t,font=fn); d.text((cx-w/2,y),t,font=fn,fill=fill)
def wrap(d,t,fn,mw):
    o,c=[],""
    for w in t.split():
        s=(c+" "+w).strip()
        if d.textlength(s,font=fn)<=mw: c=s
        else: o.append(c); c=w
    if c:o.append(c)
    return o
def base():
    top=np.array(NAVY_TOP,float); bot=np.array(NAVY_BOT,float)
    g=np.zeros((H,W,3),np.uint8)
    for y in range(H): g[y,:,:]=(top*(1-y/(H-1))+bot*(y/(H-1))).astype(np.uint8)
    im=Image.fromarray(g); d=ImageDraw.Draw(im,"RGBA")
    d.polygon([(0,H),(0,H-280),(W,H-470),(W,H)],fill=(46,130,214,26))
    return im
BASE=base()
LG=Image.open(f"{D}/public/logo-512.png").convert("RGBA"); LG=LG.crop(LG.getbbox())
def logo(img,mw,cx,cy):
    l=LG.copy(); r=mw/l.width; l=l.resize((int(l.width*r),int(l.height*r)),Image.LANCZOS)
    img.paste(l,(int(cx-l.width/2),int(cy-l.height/2)),l)

def shot_slide(path, caption):
    """Compone una captura real con barra de rotulo abajo."""
    img=Image.new("RGB",(W,H),SLATE); d=ImageDraw.Draw(img,"RGBA")
    s=Image.open(path).convert("RGB")
    area_h=H-150
    r=min((W-160)/s.width,(area_h-60)/s.height)
    sw,sh=int(s.width*r),int(s.height*r); s=s.resize((sw,sh),Image.LANCZOS)
    x=(W-sw)//2; y=40
    d.rounded_rectangle([x-10,y-10,x+sw+10,y+sh+10],18,fill=(0,0,0,110))
    img.paste(s,(x,y))
    # barra rotulo
    by=H-96
    d.rectangle([0,by,W,H],fill=(8,20,38,235))
    d.rounded_rectangle([80,by+34,96,by+74],6,fill=BLUE)
    d.text((120,by+28),caption,font=f(40),fill=WHITE)
    return np.array(img)

def title_card(big, sub):
    img=BASE.copy(); d=ImageDraw.Draw(img,"RGBA")
    y=400
    for ln in wrap(d,big,f(78),W-260): ct(d,W/2,y,ln,f(78),WHITE); y+=96
    d.rounded_rectangle([W/2-150,y+10,W/2+150,y+18],4,fill=BLUE); y+=70
    for ln in wrap(d,sub,f(42,False),W-360): ct(d,W/2,y,ln,f(42,False),GREY); y+=58
    return np.array(img)

def intro():
    img=BASE.copy(); d=ImageDraw.Draw(img,"RGBA")
    logo(img,520,W/2,400); ct(d,W/2,650,"GESTIÓN PRO TOTAL",f(80),WHITE)
    ct(d,W/2,760,"La app por dentro — demostración real",f(40,False),CYAN)
    return np.array(img)

def planes():
    img=BASE.copy(); d=ImageDraw.Draw(img,"RGBA")
    d.rounded_rectangle([160,140,174,240],6,fill=BLUE); d.text((210,150),"Planes y licencias",font=f(60),fill=WHITE)
    P=[("DEMO","Gratis","7 días",False),("MENSUAL","19 €","al mes",False),("ANUAL","149 €","2 meses gratis",True),
       ("PERPETUO","599 €","pago único",False),("ESTUDIANTES","Gratis","con matrícula",False),("EMPRESA","desde 49 €","varios equipos",False)]
    cols=3; gw,gh=480,250; gx=(W-cols*gw)/(cols+1); y0=320
    for i,(n,pr,nt,st) in enumerate(P):
        r,c=divmod(i,cols); x=gx+c*(gw+gx); y=y0+r*(gh+44)
        d.rounded_rectangle([x,y,x+gw,y+gh],20,fill=(46,130,214,40) if st else (255,255,255,12),
                            outline=GOLD if st else (96,178,235,120),width=4 if st else 2)
        if st: ct(d,x+gw/2,y+16,"★ EL MÁS ELEGIDO",f(22),GOLD)
        ct(d,x+gw/2,y+62,n,f(36),WHITE); ct(d,x+gw/2,y+115,pr,f(52),GOLD if st else CYAN)
        ct(d,x+gw/2,y+185,nt,f(26,False),GREY)
    return np.array(img)

def close():
    img=BASE.copy(); d=ImageDraw.Draw(img,"RGBA")
    ct(d,W/2,250,"Prueba 7 días gratis",f(78),WHITE)
    ct(d,W/2,370,"Si no te ahorra tiempo, no pagas nada.",f(42,False),GREY)
    logo(img,330,W/2,640); ct(d,W/2,820,"kairigarcia.gestionprototal@gmail.com",f(38),CYAN)
    ct(d,W/2,890,"Gestión Pro Total · Empieza hoy",f(30,False),GREY)
    return np.array(img)

# (imagen, segundos, ¿zoom Ken Burns?)
S=[
 (intro(),3.2,False),
 (shot_slide(f"{CAP}/pantalla-inicio-real.png","Pantalla de inicio: activa tu licencia y empieza"),4.5,True),
 (title_card("Calculadoras técnicas profesionales","Integradas en la app, listas para el día a día"),3.2,False),
 (shot_slide(f"{CAP}/calc-electrico.png","Cálculo eléctrico: sección, magnetotérmico, diferencial y materiales"),5.2,True),
 (shot_slide(f"{CAP}/calc-multiarea-aire.png","Climatización multi-área: cargas por zona y equipos recomendados"),5.0,True),
 (shot_slide(f"{CAP}/equivalencia-refrigerantes.png","Equivalencia de refrigerantes — funciona sin internet"),4.6,True),
 (title_card("Y mucho más en un solo lugar","Clientes · Agenda · SAT · Presupuestos y facturas · Inventario · IA"),4.2,False),
 (planes(),5.5,False),
 (close(),4.5,False),
]

def kb_frames(img, n, zoom):
    """Genera n fotogramas con (o sin) zoom suave."""
    base_im=Image.fromarray(img)
    for k in range(n):
        if not zoom:
            yield img; continue
        t=k/max(n-1,1); sc=1.0+0.045*t
        nw,nh=int(W*sc),int(H*sc)
        big=base_im.resize((nw,nh),Image.LANCZOS)
        x=(nw-W)//2; y=(nh-H)//2
        yield np.array(big.crop((x,y,x+W,y+H)))

out=f"{D}/distribucion/COMERCIAL/Video-Demo-Realista.mp4"
w=imageio.get_writer(out,fps=FPS,codec="libx264",quality=8,macro_block_size=None,ffmpeg_params=["-pix_fmt","yuv420p"])
prev_last=None
for i,(img,hold,zoom) in enumerate(S):
    frames=list(kb_frames(img,int(hold*FPS),zoom))
    for fr in frames: w.append_data(fr)
    if i<len(S)-1:
        a=frames[-1].astype(np.float32)
        nxt=S[i+1][0].astype(np.float32)
        for k in range(FADE):
            t=(k+1)/FADE; w.append_data((a*(1-t)+nxt*t).astype(np.uint8))
w.close(); print("DEMO REALISTA OK:",out)
