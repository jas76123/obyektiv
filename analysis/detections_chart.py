import json, collections
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

d = json.load(open('/Users/jasminagababyan/Desktop/video_detections.json'))
FPS = 30  # предположение: кадры JSON 0..1445, видео 30 fps
RU = {'Excavator':'Экскаватор','Mixer':'Миксер','Tanker':'Цистерна','Forklift Giraffe':'Погрузчик «Жираф»',
      'Crane manipulator':'Кран-манипулятор','Motor grader':'Автогрейдер','Bucket loader Standart':'Ковш. погрузчик станд.',
      'Bucket loader Big':'Ковш. погрузчик большой','Dump truck':'Самосвал'}
order = [c for c,_ in collections.Counter(x['class'] for x in d).most_common()]
# fixed categorical palette slots (light mode), assigned in fixed order
PAL = ['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4','#008300','#4a3aa7','#e34948']
top = order[:7]; 
color = {c: PAL[i] for i,c in enumerate(top)}; color['Прочее'] = '#9a9892'
def lab(c): return RU.get(c,c)
# per-second: max detections of a class in any frame of that second (объектов, не детекций)
secs = collections.defaultdict(lambda: collections.defaultdict(int))
byframe = collections.defaultdict(collections.Counter)
for x in d: byframe[x['frame']][x['class']] += 1
for f, cnt in byframe.items():
    s = f // FPS
    for c, n in cnt.items():
        secs[s][c] = max(secs[s][c], n)
maxs = max(byframe) // FPS + 1
xs = list(range(maxs))
series = {c: [secs[s].get(c,0) for s in xs] for c in top}
series['Прочее'] = [sum(v for k,v in secs[s].items() if k not in top) for s in xs]

plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.edgecolor':'#c3c2b7','axes.labelcolor':'#52514e',
                     'xtick.color':'#52514e','ytick.color':'#52514e','axes.spines.top':False,'axes.spines.right':False})
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(11, 8.5), gridspec_kw={'height_ratios':[3,2]}, facecolor='white')
fig.subplots_adjust(hspace=0.45, left=0.17, right=0.98, top=0.86, bottom=0.08)

# 1. stacked bars per second with 2px-ish gap
bottom = [0]*maxs
keys = top + ['Прочее']
for c in keys:
    vals = series[c]
    ax1.bar(xs, vals, bottom=bottom, width=0.82, color=color[c], label=lab(c), linewidth=0)
    bottom = [b+v for b,v in zip(bottom, vals)]
ax1.set_title('Что модель видит на тестовом видео: единиц техники по секундам (максимум в кадре за секунду)', loc='left', fontsize=12, color='#0b0b0b', pad=44)
ax1.set_xlabel('Секунда видео (при 30 кадр/с)'); ax1.set_ylabel('Единиц техники')
ax1.grid(axis='y', color='#e7e6e1', linewidth=0.8); ax1.set_axisbelow(True)
ax1.legend(ncol=4, frameon=False, loc='lower left', bbox_to_anchor=(0, 1.0), fontsize=9); ax1.set_ylim(0, 9)
ax1.set_xlim(-0.6, maxs-0.4)
# annotate the empty gap
ax1.annotate('нет детекций', xy=(35, 0.3), fontsize=9, color='#52514e', ha='center')

# 2. confidence: horizontal box-like summary per class (dot = mean, line = min..max)
conf = collections.defaultdict(list)
for x in d: conf[x['class']].append(x['confidence'])
ys = list(range(len(order)))[::-1]
for y, c in zip(ys, order):
    v = conf[c]; col = color.get(c, '#9a9892')
    ax2.hlines(y, min(v), max(v), color=col, linewidth=2, alpha=0.5)
    ax2.plot(sum(v)/len(v), y, 'o', color=col, markersize=8, markeredgecolor='white', markeredgewidth=1.5)
    ax2.text(1.0, y, f'{len(v)} дет.', va='center', ha='left', fontsize=9, color='#52514e')
ax2.set_yticks(ys); ax2.set_yticklabels([lab(c) for c in order], color='#0b0b0b')
ax2.axvline(0.5, color='#c3c2b7', linestyle='--', linewidth=1)
ax2.text(0.505, len(order)-0.6, 'порог 0.5', fontsize=9, color='#52514e')
ax2.set_xlim(0.2, 1.12); ax2.set_xlabel('Уверенность модели (точка — среднее, линия — от min до max)')
ax2.set_title('Уверенность по классам: ниже 0.5 — считать не стоит', loc='left', fontsize=12, color='#0b0b0b', pad=10)
ax2.grid(axis='x', color='#e7e6e1', linewidth=0.8); ax2.set_axisbelow(True)
ax2.spines['left'].set_visible(False); ax2.tick_params(axis='y', length=0)
fig.text(0.17, 0.965, 'Объектив · выход детектора на видео 12.09.2026 (video_detections.json, 921 детекций, 581 кадр с находками из ~1446)', fontsize=9, color='#52514e')
out='/Users/jasminagababyan/Desktop/objectiv_detections_chart.png'
fig.savefig(out, dpi=160); print(out)
