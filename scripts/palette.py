import math, json, re, sys
css = open('src/styles/organic.css').read()  # run from the repo root
def hexv(name): return re.search(r'--color-%s:\s*(#[0-9a-f]{6})' % re.escape(name), css).group(1)

def s2l(c): return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4
def l2s(c): return 12.92*c if c <= 0.0031308 else 1.055*c**(1/2.4)-0.055
def hex2oklch(h):
    r,g,b=[s2l(int(h[i:i+2],16)/255) for i in (1,3,5)]
    l=0.4122214708*r+0.5363325363*g+0.0514459929*b; m=0.2119034982*r+0.6806995451*g+0.1073969566*b; s=0.0883024619*r+0.2817188376*g+0.6299787005*b
    l,m,s=[x**(1/3) for x in (l,m,s)]
    L=0.2104542553*l+0.7936177850*m-0.0040720468*s; a=1.9779984951*l-2.4285922050*m+0.4505937099*s; bb=0.0259040371*l+0.7827717662*m-0.8086757660*s
    return L, math.hypot(a,bb), math.degrees(math.atan2(bb,a))%360
def oklch2rgb(L,C,H):
    a=C*math.cos(math.radians(H)); b=C*math.sin(math.radians(H))
    l=(L+0.3963377774*a+0.2158037573*b)**3; m=(L-0.1055613458*a-0.0638541728*b)**3; s=(L-0.0894841775*a-1.2914855480*b)**3
    return (4.0767416621*l-3.3077115913*m+0.2309699292*s, -1.2684380046*l+2.6097574011*m-0.3413193965*s, -0.0041960863*l-0.7034186147*m+1.7076147010*s)
def oklch2hex(L,C,H):
    # pull chroma in until the colour fits sRGB, so every step is a real, printable colour
    while True:
        rgb=oklch2rgb(L,C,H)
        if all(-1e-4<=x<=1+1e-4 for x in rgb) or C<0.001: break
        C*=0.97
    return '#'+''.join('%02x'%round(min(1,max(0,l2s(x)))*255) for x in rgb)
def lum(h):
    r,g,b=[s2l(int(h[i:i+2],16)/255) for i in (1,3,5)]; return 0.2126*r+0.7152*g+0.0722*b
def cr(a,b): la,lb=sorted([lum(a),lum(b)],reverse=True); return (la+0.05)/(lb+0.05)

STEPS=[100,200,300,400,500,600,700,800,900]
Ls=[hex2oklch(hexv('accent-%d'%s))[0] for s in STEPS]   # the system's shared lightness scale
NL=[hex2oklch(hexv('neutral-%d'%s))[0] for s in STEPS]
bgL,_,_=hex2oklch(hexv('bg')); sfL,_,_=hex2oklch(hexv('surface')); inkL,_,_=hex2oklch(hexv('text'))

# Pastel: soft chroma on the light steps, enough on the deep ones for text to stay readable and the hue to stay recognisable.
CH=[0.035,0.055,0.075,0.09,0.095,0.09,0.08,0.065,0.05]
def ramp(H, k=1.0): return [oklch2hex(L, c*k, H) for L,c in zip(Ls,CH)]
def nramp(H): return [oklch2hex(L, 0.012, H) for L in NL]

THEMES = {  # name: (main hue, second hue, paper hue)
  'durazno': ('Durazno', 45, 165, 60),
  'rosa':    ('Rosa',     5, 300, 10),
  'lavanda': ('Lavanda', 300, 215, 300),
  'celeste': ('Celeste', 235, 170, 230),
  'menta':   ('Menta',   165, 45, 160),
  'limon':   ('Limón',   98, 300, 100),
}
out={}
for tid,(name,h1,h2,hp) in THEMES.items():
    a=ramp(h1, 1.25 if tid=='limon' else 1.0); a2=ramp(h2, 0.95); n=nramp(hp)
    v={'bg':oklch2hex(bgL,0.025,hp),'surface':oklch2hex(sfL,0.035,hp),'text':oklch2hex(inkL,0.02,hp),
       'accent':a[2] if tid=='limon' else a[3],'accent-2':a2[3]}
    for i,s in enumerate(STEPS): v['accent-%d'%s]=a[i]; v['accent-2-%d'%s]=a2[i]; v['neutral-%d'%s]=n[i]
    out[tid]={'name':name,'vars':v}

# Every pairing the app actually draws, with the WCAG minimum it needs.
checks=[('text','bg',4.5),('text','surface',4.5),('neutral-700','bg',4.5),('neutral-700','surface',4.5),('neutral-800','surface',4.5),
        ('accent-700','bg',4.5),('accent-700','surface',4.5),('accent-800','accent-200',4.5),('accent-2-700','bg',4.5),
        ('accent-2-700','accent-2-200',4.5),('accent-2-900','accent-2-200',4.5),('text','accent',4.5),('text','accent-500',4.5),
        ('bg','text',4.5),('bg','accent-700',4.5),('bg','accent-2-700',4.5),('neutral-300','text',4.5),('neutral-400','text',4.5),
        ('accent-400','text',3),('accent-2-300','text',3),('text','accent-2-300',4.5)]
bad=0
for tid,t in out.items():
    v=t['vars']; worst=min((cr(v[f],v[b])/need, f,b,cr(v[f],v[b])) for f,b,need in checks)
    fails=[(f,b,round(cr(v[f],v[b]),2)) for f,b,need in checks if cr(v[f],v[b])<need]
    bad+=len(fails)
    print(f"{tid:8} accent {v['accent']} accent2 {v['accent-2']} ink {v['text']} bg {v['bg']} | peor: {worst[1]} sobre {worst[2]} {worst[3]:.2f}:1", 'FALLA '+str(fails) if fails else 'ok')
json.dump(out, open(sys.argv[1],'w'), indent=1, ensure_ascii=False)  # usage: python3 scripts/palette.py out.json, then paste into src/theme.ts
print('fallas totales:', bad)
