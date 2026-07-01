#!/usr/bin/env python3
"""
generate_route_images.py
========================
从 KML 文件 + AI 地形背景图生成行程图片组（总览图 + 每日图）。

用法:
  uv run --with pillow --with numpy generate_route_images.py \
    --kml /path/to/trail.kml \
    --bg /path/to/terrain_bg.png \
    --out /path/to/output/ \
    [--name "格聂牧场+V"] \
    [--days 4] \
    [--total-km 61.5] [--total-asc 2468] [--max-elev 4845]

输出:
  {out}/总览图.png
  {out}/D1.png ... {out}/D4.png
"""

import argparse, json, math, re, os, sys
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw, ImageFont

# ── 常量 ─────────────────────────────────────────────────────────────
W, H = 1080, 1440
DAY_COLORS = [(0xE8,0x53,0x1A),(0x1A,0x7B,0xC4),(0x3A,0x9B,0x47),(0xB8,0x6F,0xCC),(0xC4,0x9B,0x1A),(0x1A,0xAB,0xA3)]
FONT_CJK_B = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
FONT_CJK_R = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
GREEN_DARK  = (17,52,32)
BROWN_DARK  = (80,38,10)

def mkfont(path, size):
    try: return ImageFont.truetype(path, size)
    except: return ImageFont.load_default()

# ── KML 解析 ──────────────────────────────────────────────────────────
def parse_kml(kml_path):
    GX  = 'http://www.google.com/kml/ext/2.2'
    KML = 'http://www.opengis.net/kml/2.2'
    tree = ET.parse(kml_path)
    root = tree.getroot()
    track = []
    for el in root.iter(f'{{{GX}}}coord'):
        p = el.text.strip().split()
        if len(p) >= 3:
            track.append({'lat':float(p[1]),'lng':float(p[0]),'alt':float(p[2]),'time':''})
    for el in root.iter(f'{{{KML}}}coordinates'):
        for seg in el.text.strip().split():
            p = seg.split(',')
            if len(p) >= 3:
                try: track.append({'lat':float(p[1]),'lng':float(p[0]),'alt':float(p[2]),'time':''})
                except: pass
    waypoints = []
    for pm in root.iter(f'{{{KML}}}Placemark'):
        pt = pm.find(f'.//{{{KML}}}Point')
        if pt is not None:
            c = pt.find(f'{{{KML}}}coordinates')
            nm = pm.find(f'{{{KML}}}name')
            if c is not None and nm is not None:
                p = c.text.strip().split(',')
                try: waypoints.append({'name':nm.text.strip(),'lat':float(p[1]),'lng':float(p[0]),'alt':float(p[2]) if len(p)>2 else 0})
                except: pass
    return track, waypoints

# ── 几何 ──────────────────────────────────────────────────────────────
def haversine(p1, p2):
    R=6371; dLat=math.radians(p2['lat']-p1['lat']); dLon=math.radians(p2['lng']-p1['lng'])
    a=math.sin(dLat/2)**2+math.cos(math.radians(p1['lat']))*math.cos(math.radians(p2['lat']))*math.sin(dLon/2)**2
    return R*2*math.atan2(math.sqrt(a),math.sqrt(1-a))

def acc_ascent(pts):
    asc=0; prev=pts[0]['alt']
    for p in pts:
        d=p['alt']-prev
        if d>10: asc+=d
        prev=p['alt']
    return round(asc)

def day_stats(pts):
    km=round(sum(haversine(pts[i-1],pts[i]) for i in range(1,len(pts))),1)
    alts=[p['alt'] for p in pts]
    return km, acc_ascent(pts), round(max(alts)), round(min(alts))

def bounds(pts, pad=0.10):
    lats=[p['lat'] for p in pts]; lngs=[p['lng'] for p in pts]
    lr=max(lats)-min(lats) or 0.01; gr=max(lngs)-min(lngs) or 0.01
    return min(lats)-lr*pad, max(lats)+lr*pad, min(lngs)-gr*pad, max(lngs)+gr*pad

def short_name(name, maxlen=7):
    s = re.sub(r'[（(][^）)]*[）)]','',name).strip()
    s = re.sub(r'^D\d\s*','',s).strip()
    return s[:maxlen]

# ── 绘图工具 ──────────────────────────────────────────────────────────
def draw_track(canvas, pts, color, MAP_L,MAP_T,MAP_R,MAP_B, lX,lY):
    cr,cg,cb = color
    xy = [(lX(p['lng']),lY(p['lat'])) for p in pts]
    if len(xy)<2: return canvas
    for wid,al in [(11,70),(7,160),(4,255)]:
        lyr=Image.new('RGBA',(W,H),(0,0,0,0))
        ld=ImageDraw.Draw(lyr)
        ld.line(xy, fill=(cr,cg,cb,al), width=wid)
        canvas=Image.alpha_composite(canvas,lyr)
    return canvas

def draw_arrow(draw, pts, color, lX, lY):
    cr,cg,cb=color
    if len(pts)<6: return
    mid=len(pts)//2
    p0,p1=pts[mid-3],pts[min(mid+3,len(pts)-1)]
    x0,y0=lX(p0['lng']),lY(p0['lat']); x1,y1=lX(p1['lng']),lY(p1['lat'])
    ang=math.atan2(y1-y0,x1-x0); mx,my=(x0+x1)/2,(y0+y1)/2; L=16
    ap=[(mx+L*math.cos(ang),my+L*math.sin(ang)),
        (mx+L*.55*math.cos(ang+2.5),my+L*.55*math.sin(ang+2.5)),
        (mx+L*.55*math.cos(ang-2.5),my+L*.55*math.sin(ang-2.5))]
    draw.polygon(ap, fill=(cr,cg,cb,255))

def draw_waypoint(canvas, draw, x, y, wp, f_small):
    isCamp = any(k in wp['name'] for k in ['营地','宿营','木屋','措娘'])
    bg_c = (*GREEN_DARK,220) if isCamp else (*BROWN_DARK,220)
    lyr=Image.new('RGBA',(W,H),(0,0,0,0)); ld=ImageDraw.Draw(lyr)
    ld.ellipse([x-13,y-13,x+13,y+13], fill=bg_c, outline=(255,255,255,220), width=2)
    if isCamp: ld.polygon([(x,y-7),(x-6,y+4),(x+6,y+4)], fill=(150,230,170,255))
    else: ld.polygon([(x,y-8),(x-6,y+5),(x+6,y+5)], fill=(240,190,100,255))
    canvas=Image.alpha_composite(canvas,lyr); draw=ImageDraw.Draw(canvas)
    lbl=f"{short_name(wp['name'])}\n{wp['alt']:.0f}m"
    lines=lbl.split('\n')
    max_w=max(draw.textlength(l,font=f_small) for l in lines)
    tx=min(max(x+16,42),W-42-max_w); ty=y-18
    draw.rounded_rectangle([tx-4,ty-2,tx+max_w+8,ty+len(lines)*17+4],radius=5,fill=(255,255,255,225),outline=(200,200,200,150))
    col=(*GREEN_DARK,255) if isCamp else (*BROWN_DARK,255)
    for li,ln in enumerate(lines): draw.text((tx+2,ty+li*17),ln,font=f_small,fill=col)
    return canvas

def draw_elev_profile(canvas, draw, pts, color, alts_full, PROF_T,PROF_H,PROF_L,PROF_R, f_small, shown_wps=None):
    cr,cg,cb=color
    PROF_B=PROF_T+PROF_H
    alts_d=[p['alt'] for p in pts]
    mnAlt,eR=min(alts_d),max(alts_d)-min(alts_d) or 1
    def pX(i): return PROF_L+i/(max(len(pts)-1,1))*(PROF_R-PROF_L)
    def pY(a): return PROF_T+PROF_H*(1-(a-mnAlt)/eR)
    pp=[(pX(i),pY(p['alt'])) for i,p in enumerate(pts)]
    poly=[(PROF_L,PROF_B)]+pp+[(PROF_R,PROF_B)]
    lyr=Image.new('RGBA',(W,H),(0,0,0,0)); ld=ImageDraw.Draw(lyr)
    ld.polygon(poly,fill=(cr,cg,cb,80)); canvas=Image.alpha_composite(canvas,lyr)
    draw=ImageDraw.Draw(canvas); draw.line(pp,fill=(cr,cg,cb,240),width=3)
    # 营地/垭口横线
    if shown_wps:
        for _,_,wp in shown_wps:
            if not (mnAlt<=wp['alt']<=mnAlt+eR): continue
            py2=pY(wp['alt'])
            draw.line([(PROF_L,py2),(PROF_R,py2)],fill=(100,100,100,100),width=1)
            draw.text((PROF_R-4,py2-14),f"{short_name(wp['name'])} {wp['alt']:.0f}m",font=f_small,fill=(60,60,60,230),anchor='ra')
    # Y轴刻度
    for fr in [0,0.5,1.0]:
        e=mnAlt+fr*eR; py3=PROF_B-fr*PROF_H
        draw.line([(PROF_L-5,py3),(PROF_L,py3)],fill=(150,140,120,200))
        draw.text((PROF_L-7,py3),f'{e:.0f}m',font=f_small,fill=(100,90,80,255),anchor='rm')
    # 峰值
    peak_i=alts_d.index(max(alts_d))
    draw.text((pX(peak_i),PROF_T-8),f'▲{max(alts_d):.0f}m',font=f_small,fill=(*BROWN_DARK,230),anchor='mb')
    draw.text((PROF_L,PROF_B+4),f'起 {pts[0]["alt"]:.0f}m',font=f_small,fill=(40,40,40,220))
    draw.text((PROF_R,PROF_B+4),f'宿 {pts[-1]["alt"]:.0f}m',font=f_small,fill=(*GREEN_DARK,220),anchor='ra')
    return canvas

# ── 总览图 ────────────────────────────────────────────────────────────
def build_overview(track, waypoints, day_slices, bg_full, name, total_km, total_asc, max_elev, out_path):
    f_title=mkfont(FONT_CJK_B,44); f_sub=mkfont(FONT_CJK_R,20)
    f_label=mkfont(FONT_CJK_R,16); f_small=mkfont(FONT_CJK_R,14)
    f_stat =mkfont(FONT_CJK_B,40)
    MAP_TOP,MAP_BOT,MAP_L,MAP_R = 160,880,40,W-40
    mnLat,mxLat,mnLng,mxLng = bounds(track)
    def lX(lng): return MAP_L+(lng-mnLng)/(mxLng-mnLng)*(MAP_R-MAP_L)
    def lY(lat): return MAP_TOP+(1-(lat-mnLat)/(mxLat-mnLat))*(MAP_BOT-MAP_TOP)

    canvas = bg_full.resize((W,H),Image.LANCZOS).convert('RGBA')
    ov=Image.new('RGBA',(W,H),(0,0,0,0)); od=ImageDraw.Draw(ov)
    od.rectangle([0,MAP_TOP,W,MAP_BOT],fill=(0,0,0,55))
    canvas=Image.alpha_composite(canvas,ov)

    for di,pts in enumerate(day_slices):
        canvas=draw_track(canvas,pts,DAY_COLORS[di],MAP_L,MAP_TOP,MAP_R,MAP_BOT,lX,lY)
    draw=ImageDraw.Draw(canvas)
    for di,pts in enumerate(day_slices): draw_arrow(draw,pts,DAY_COLORS[di],lX,lY)

    # 起终点
    sp,ep=track[0],track[-1]
    for p,lbl,fill in [(sp,'S',(0xE8,0x53,0x1A,255)),(ep,'E',(17,52,32,255))]:
        x,y=lX(p['lng']),lY(p['lat'])
        draw.ellipse([x-14,y-14,x+14,y+14],fill=fill,outline=(255,255,255,255),width=2)
        draw.text((x,y),lbl,font=f_label,fill=(255,255,255,255),anchor='mm')

    # 关键标注点
    CAMP_TAGS=['营地','宿营','木屋','措娘']; PASS_TAGS=['垭口','4840']
    key_wps=[w for w in waypoints if any(k in w['name'] for k in CAMP_TAGS+PASS_TAGS)]
    shown=[]
    for wp in sorted(key_wps,key=lambda w:-w['alt']):
        x,y=lX(wp['lng']),lY(wp['lat'])
        if x<MAP_L or x>MAP_R or y<MAP_TOP or y>MAP_BOT: continue
        if any(math.hypot(x-sx,y-sy)<65 for sx,sy,_ in shown): continue
        shown.append((x,y,wp))
        if len(shown)>=8: break
    for x,y,wp in shown: canvas=draw_waypoint(canvas,ImageDraw.Draw(canvas),x,y,wp,f_small)

    draw=ImageDraw.Draw(canvas)
    # 北向
    nx,ny=MAP_L+28,MAP_TOP+28
    draw.ellipse([nx-18,ny-18,nx+18,ny+18],fill=(255,255,255,200),outline=(100,100,100,180),width=1)
    draw.polygon([(nx,ny-12),(nx-5,ny+8),(nx+5,ny+8)],fill=(17,52,32,255))
    draw.text((nx,ny-18),'N',font=f_small,fill=(17,52,32,255),anchor='mb')

    # 图例
    LEG_W,LEG_H=170,118; LEG_X,LEG_Y=MAP_R-LEG_W-10,MAP_BOT-LEG_H-10
    lyr=Image.new('RGBA',(W,H),(0,0,0,0)); ld=ImageDraw.Draw(lyr)
    ld.rounded_rectangle([LEG_X,LEG_Y,LEG_X+LEG_W,LEG_Y+LEG_H],radius=8,fill=(245,240,220,215),outline=(17,52,32,200),width=2)
    canvas=Image.alpha_composite(canvas,lyr); draw=ImageDraw.Draw(canvas)
    draw.text((LEG_X+12,LEG_Y+10),'图例',font=f_small,fill=(17,52,32,255))
    for di,(col,lbl) in enumerate(zip(DAY_COLORS[:len(day_slices)],[f'D{i+1}' for i in range(len(day_slices))])):
        cr2,cg2,cb2=col; y_l=LEG_Y+30+di*20
        draw.rounded_rectangle([LEG_X+10,y_l+1,LEG_X+38,y_l+9],radius=3,fill=(cr2,cg2,cb2,255))
        draw.text((LEG_X+46,y_l-2),lbl,font=f_small,fill=(40,40,40,255))

    # 顶部
    for i in range(160): draw.rectangle([0,i,W,i+1],fill=(15,50,30,max(0,240-i)))
    draw.text((W//2,55),name,font=f_title,fill=(255,255,255,255),anchor='mm')
    draw.text((W//2,95),f'{name.split("+")[0]} · {len(day_slices)}天 · {total_km}km · 最高{max_elev}m',font=f_sub,fill=(190,230,200,255),anchor='mm')
    draw.text((W//2,122),'格聂牧场穿越线路  |  雪山 · 垭口 · 营地',font=f_small,fill=(150,200,160,255),anchor='mm')

    # 海拔剖面
    PROF_T=MAP_BOT+24; PROF_H=145; PROF_L,PROF_R=60,W-60
    lyr=Image.new('RGBA',(W,H),(0,0,0,0)); ld=ImageDraw.Draw(lyr)
    ld.rounded_rectangle([PROF_L-12,PROF_T-8,PROF_R+12,PROF_T+PROF_H+8],radius=8,fill=(248,244,230,225),outline=(190,185,170,180))
    canvas=Image.alpha_composite(canvas,lyr); draw=ImageDraw.Draw(canvas)
    draw.text((PROF_L,PROF_T-6),'全程海拔示意',font=f_small,fill=(17,52,32,255))
    alts=[p['alt'] for p in track]; mnE,mxE=min(alts),max(alts); eR2=mxE-mnE
    for di,pts in enumerate(day_slices):
        si=sum(len(day_slices[j]) for j in range(di)); ei=si+len(pts)
        cr2,cg2,cb2=DAY_COLORS[di]
        pp2=[(PROF_L+j/(len(track)-1)*(PROF_R-PROF_L), PROF_T+PROF_H*(1-(track[j]['alt']-mnE)/eR2)) for j in range(si,ei)]
        if len(pp2)<2: continue
        poly2=[(PROF_L+si/(len(track)-1)*(PROF_R-PROF_L),PROF_T+PROF_H)]+pp2+[(PROF_L+ei/(len(track)-1)*(PROF_R-PROF_L),PROF_T+PROF_H)]
        lyr2=Image.new('RGBA',(W,H),(0,0,0,0)); ld2=ImageDraw.Draw(lyr2)
        ld2.polygon(poly2,fill=(cr2,cg2,cb2,70)); canvas=Image.alpha_composite(canvas,lyr2)
        draw=ImageDraw.Draw(canvas); draw.line(pp2,fill=(cr2,cg2,cb2,240),width=2)
    peak_i=alts.index(mxE)
    px_pk=PROF_L+peak_i/(len(track)-1)*(PROF_R-PROF_L); py_pk=PROF_T
    draw.ellipse([px_pk-4,py_pk-4,px_pk+4,py_pk+4],fill=(*BROWN_DARK,255))
    draw.text((px_pk,py_pk-8),f'▲{mxE:.0f}m',font=f_small,fill=(*BROWN_DARK,255),anchor='mb')
    for fr in [0,0.5,1.0]:
        e=mnE+fr*(mxE-mnE); py3=PROF_T+PROF_H-fr*PROF_H
        draw.line([(PROF_L-5,py3),(PROF_L,py3)],fill=(150,140,120,200))
        draw.text((PROF_L-7,py3),f'{e:.0f}m',font=f_small,fill=(100,90,80,255),anchor='rm')

    # 统计卡
    STAT_T=PROF_T+PROF_H+22; STAT_H=100; STAT_W=(W-80-12)//2
    STATS=[('📍 全程里程',f'{total_km} km',GREEN_DARK),('↑ 累积爬升',f'{total_asc} m',GREEN_DARK),
           ('▲ 最高海拔',f'{max_elev} m',BROWN_DARK),(f'📅 行程天数',f'{len(day_slices)} 天',BROWN_DARK)]
    for i,(lbl,val,col) in enumerate(STATS):
        bx=40+(i%2)*(STAT_W+12); by=STAT_T+(i//2)*(STAT_H+10)
        lyr3=Image.new('RGBA',(W,H),(0,0,0,0)); ld3=ImageDraw.Draw(lyr3)
        ld3.rounded_rectangle([bx,by,bx+STAT_W,by+STAT_H],radius=10,fill=(*col,210))
        canvas=Image.alpha_composite(canvas,lyr3); draw=ImageDraw.Draw(canvas)
        draw.text((bx+16,by+16),lbl,font=f_small,fill=(180,220,190,255))
        draw.text((bx+16,by+44),val,font=f_stat,fill=(255,255,255,255))

    draw.text((W//2,H-14),'Hiking Trail Map · 仅供参考，请以实际轨迹为准',font=f_small,fill=(140,135,125,255),anchor='mm')
    canvas.convert('RGB').save(out_path,'PNG')
    print(f"✓ 总览图: {out_path}")

# ── 每日图 ────────────────────────────────────────────────────────────
def build_day_image(di, day_slices, waypoints, track, bg_full, out_path):
    f_big =mkfont(FONT_CJK_B,72); f_sub =mkfont(FONT_CJK_R,22)
    f_label=mkfont(FONT_CJK_R,16); f_small=mkfont(FONT_CJK_R,14)
    f_num =mkfont(FONT_CJK_B,44)
    dk=di+1; pts=day_slices[di]; cr,cg,cb=DAY_COLORS[di]
    km,asc,maxE,minE=day_stats(pts)
    MAP_TOP,MAP_BOT,MAP_L,MAP_R=200,860,40,W-40

    mnLat,mxLat,mnLng,mxLng=bounds(pts,0.18)
    gmnLat,gmxLat,gmnLng,gmxLng=bounds(track,0.08)
    def lX(lng): return MAP_L+(lng-mnLng)/(mxLng-mnLng)*(MAP_R-MAP_L)
    def lY(lat): return MAP_TOP+(1-(lat-mnLat)/(mxLat-mnLat))*(MAP_BOT-MAP_TOP)

    # 裁剪背景
    bg_w,bg_h=bg_full.size
    def gbx(lng,lat,mnLng2,mxLng2,mnLat2,mxLat2):
        return int((lng-mnLng2)/(mxLng2-mnLng2)*bg_w), int((1-(lat-mnLat2)/(mxLat2-mnLat2))*bg_h)
    x0,y0=gbx(mnLng,mxLat,gmnLng,gmxLng,gmnLat,gmxLat)
    x1,y1=gbx(mxLng,mnLat,gmnLng,gmxLng,gmnLat,gmxLat)
    x0=max(0,x0-30); y0=max(0,y0-30); x1=min(bg_w,x1+30); y1=min(bg_h,y1+30)
    if x1-x0<50 or y1-y0<50: x0,y0,x1,y1=0,0,bg_w,bg_h
    bg_crop=bg_full.crop((x0,y0,x1,y1)).resize((W,MAP_BOT-MAP_TOP+40),Image.LANCZOS)

    canvas=Image.new('RGBA',(W,H),(248,244,228,255))
    canvas.paste(bg_crop.convert('RGBA'),(0,MAP_TOP-20))
    ov=Image.new('RGBA',(W,H),(0,0,0,0)); od=ImageDraw.Draw(ov)
    od.rectangle([0,MAP_TOP,W,MAP_BOT],fill=(0,0,0,50))
    canvas=Image.alpha_composite(canvas,ov)

    # 其他天淡色
    for other_di,other_pts in enumerate(day_slices):
        if other_di==di: continue
        ocr,ocg,ocb=DAY_COLORS[other_di]
        xy=[(lX(p['lng']),lY(p['lat'])) for p in other_pts if mnLng-0.02<p['lng']<mxLng+0.02 and mnLat-0.02<p['lat']<mxLat+0.02]
        if len(xy)<2: continue
        lyr=Image.new('RGBA',(W,H),(0,0,0,0)); ld=ImageDraw.Draw(lyr)
        ld.line(xy,fill=(ocr,ocg,ocb,80),width=4); canvas=Image.alpha_composite(canvas,lyr)

    canvas=draw_track(canvas,pts,(cr,cg,cb),MAP_L,MAP_TOP,MAP_R,MAP_BOT,lX,lY)
    draw=ImageDraw.Draw(canvas); draw_arrow(draw,pts,(cr,cg,cb),lX,lY)

    sp,ep=pts[0],pts[-1]
    for p,lbl,fill in [(sp,'S',(cr,cg,cb,255)),(ep,'宿',(*GREEN_DARK,255))]:
        x,y=lX(p['lng']),lY(p['lat'])
        draw.ellipse([x-16,y-16,x+16,y+16],fill=fill,outline=(255,255,255,255),width=2)
        draw.text((x,y),lbl,font=f_label,fill=(255,255,255,255),anchor='mm')

    CAMP_TAGS=['营地','宿营','木屋','措娘']; PASS_TAGS=['垭口','4840']
    day_wps=[w for w in waypoints if any(k in w['name'] for k in CAMP_TAGS+PASS_TAGS)]
    shown=[]; 
    for wp in sorted(day_wps,key=lambda w:-w['alt']):
        x,y=lX(wp['lng']),lY(wp['lat'])
        if x<MAP_L or x>MAP_R or y<MAP_TOP or y>MAP_BOT: continue
        if any(math.hypot(x-sx,y-sy)<55 for sx,sy,_ in shown): continue
        shown.append((x,y,wp))
        if len(shown)>=6: break
    for x,y,wp in shown: canvas=draw_waypoint(canvas,ImageDraw.Draw(canvas),x,y,wp,f_small)

    draw=ImageDraw.Draw(canvas)
    # 顶部色带
    for i in range(185): draw.rectangle([0,i,W,i+1],fill=(cr,cg,cb,max(0,240-i)))
    draw.text((50,58),f'DAY {dk}',font=f_big,fill=(255,255,255,255))
    camp_wp=next((w for _,_,w in shown if any(k in w['name'] for k in CAMP_TAGS)),None) if shown else None
    if camp_wp:
        draw.text((W-50,42),f'→ {short_name(camp_wp["name"])}',font=f_sub,fill=(255,255,255,220),anchor='ra')
        draw.text((W-50,74),f'{camp_wp["alt"]:.0f}m',font=f_sub,fill=(255,255,255,180),anchor='ra')
    draw.text((W//2,145),f'第{dk}天行程',font=f_sub,fill=(255,255,255,200),anchor='mm')

    # 数据卡
    CARD_T=MAP_BOT+20; CARD_H=110; CARD_W=(W-80-12)//2
    cards=[('📍 当日里程',f'{km} km',GREEN_DARK),('↑ 当日爬升',f'{asc} m',GREEN_DARK),
           ('▲ 最高点',f'{maxE} m',BROWN_DARK)]
    if camp_wp: cards.append(('🏕 营地',f'{short_name(camp_wp["name"])} {camp_wp["alt"]:.0f}m',GREEN_DARK))
    else: cards.append(('📅 天数',f'D{dk}/4',(50,50,80)))
    for i,(lbl,val,col) in enumerate(cards):
        bx=40+(i%2)*(CARD_W+12); by=CARD_T+(i//2)*(CARD_H+10)
        lyr=Image.new('RGBA',(W,H),(0,0,0,0)); ld=ImageDraw.Draw(lyr)
        ld.rounded_rectangle([bx,by,bx+CARD_W,by+CARD_H],radius=10,fill=(*col,210))
        canvas=Image.alpha_composite(canvas,lyr); draw=ImageDraw.Draw(canvas)
        draw.text((bx+16,by+16),lbl,font=f_small,fill=(180,220,190,255))
        draw.text((bx+16,by+44),val,font=f_num,fill=(255,255,255,255))

    # 海拔剖面
    PROF_T=CARD_T+(CARD_H+10)*2+20; PROF_H=150; PROF_L,PROF_R=60,W-60
    lyr=Image.new('RGBA',(W,H),(0,0,0,0)); ld=ImageDraw.Draw(lyr)
    ld.rounded_rectangle([PROF_L-12,PROF_T-8,PROF_R+12,PROF_T+PROF_H+8],radius=8,fill=(248,244,230,230),outline=(190,185,170,180))
    canvas=Image.alpha_composite(canvas,lyr); draw=ImageDraw.Draw(canvas)
    draw.text((PROF_L,PROF_T-6),f'D{dk} 海拔剖面',font=f_small,fill=(cr,cg,cb,255))
    canvas=draw_elev_profile(canvas,ImageDraw.Draw(canvas),pts,(cr,cg,cb),[p['alt'] for p in track],PROF_T,PROF_H,PROF_L,PROF_R,f_small,shown)

    draw=ImageDraw.Draw(canvas)
    draw.text((W//2,H-14),'Hiking Trail Map · 仅供参考，请以实际轨迹为准',font=f_small,fill=(140,135,125,255),anchor='mm')
    canvas.convert('RGB').save(out_path,'PNG')
    print(f"✓ D{dk}: {out_path}  {km}km ↑{asc}m 最高{maxE}m")

# ── 主入口 ────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--kml',      required=True)
    ap.add_argument('--bg',       required=True)
    ap.add_argument('--out',      required=True)
    ap.add_argument('--name',     default='格聂牧场+V')
    ap.add_argument('--total-km', default='61.5')
    ap.add_argument('--total-asc',default='2468')
    ap.add_argument('--max-elev', default='4845')
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    track, waypoints = parse_kml(args.kml)
    bg_full = Image.open(args.bg).convert('RGBA')

    n = len(track)
    cuts = [0, n//4, n//2, 3*n//4, n]
    day_slices = [track[cuts[i]:cuts[i+1]] for i in range(4)]

    build_overview(track, waypoints, day_slices, bg_full,
                   args.name, args.total_km, args.total_asc, args.max_elev,
                   os.path.join(args.out, '总览图.png'))
    for di in range(len(day_slices)):
        build_day_image(di, day_slices, waypoints, track, bg_full,
                        os.path.join(args.out, f'D{di+1}.png'))

if __name__ == '__main__':
    main()
