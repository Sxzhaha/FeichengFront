from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Ellipse, Arc

OUT = Path(__file__).resolve().parent
FONT = FontProperties(fname=r'C:\Windows\Fonts\msyh.ttc')
BOLD = FontProperties(fname=r'C:\Windows\Fonts\msyhbd.ttc')
plt.rcParams.update({'svg.fonttype': 'none', 'pdf.fonttype': 42})
GREEN, BLUE, ORANGE = '#176B4D', '#367D9D', '#C5773F'
INK, MUTED = '#173A35', '#557168'
SOFT = {GREEN: '#EAF4EE', BLUE: '#EBF3F7', ORANGE: '#FBF0E7'}
fig = plt.figure(figsize=(18, 13), facecolor='white')
ax = fig.add_axes([0, 0, 1, 1])
ax.set(xlim=(0, 1800), ylim=(1300, 0))
ax.axis('off')

def box(x, y, w, h, fill='white', edge=GREEN, lw=1.2):
    ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle='round,pad=0,rounding_size=3',
        facecolor=fill, edgecolor=edge, linewidth=lw, zorder=2))

def text(x,y,s,size=14,color=INK,bold=False,ha='center'):
    ax.text(x,y,s,fontsize=size,color=color,fontproperties=BOLD if bold else FONT,
        ha=ha,va='center',linespacing=1.55,zorder=5)

def arrow(x1,y1,x2,y2,color=GREEN,lw=1.6):
    ax.add_patch(FancyArrowPatch((x1,y1),(x2,y2),arrowstyle='-|>',mutation_scale=13,
        linewidth=lw,color=color,shrinkA=3,shrinkB=3,zorder=4))

def frame(y,h,title):
    box(75,y,1590,h)
    box(75,y,1590,39,GREEN,GREEN)
    text(95,y+19.5,title,14,'white',True,'left')

def cards(y,items,color=GREEN,height=77):
    n=len(items); gap=17; start=97; width=(1546-gap*(n-1))/n
    for i,(name,detail) in enumerate(items):
        x=start+i*(width+gap)
        box(x,y,width,height,SOFT[color],color)
        title_y,detail_y = (17,37) if height <= 55 else ((20,44) if height <= 70 else (24,52))
        text(x+width/2,y+title_y,name,13.3,color,True)
        if detail: text(x+width/2,y+detail_y,detail,10.5,MUTED)

text(900,49,'面向果园全周期生产的多模态多智能体决策与管控平台',25,GREEN,True)
ax.plot([75,1725],[88,88],color=GREEN,lw=1.6)

# A single restrained user icon accompanies the platform entry.
box(75,111,1590,68,SOFT[BLUE],BLUE)
ax.add_patch(Ellipse((112,134),18,18,facecolor='white',edgecolor=BLUE,lw=1.5,zorder=4))
ax.add_patch(Arc((112,158),36,29,theta1=180,theta2=360,color=BLUE,lw=1.5,zorder=4))
text(139,143,'种植人员 · 专家 · 管理者',14,BLUE,True,'left')
text(704,143,'自然语言 / 图片 / 视频',13,INK)
text(1150,143,'传感数据 / 定时抓拍 / 预警事件',13,INK)
arrow(870,179,870,197,BLUE)

frame(200,134,'业务应用层｜七大核心功能')
cards(250,[('智慧大脑','态势汇总 · 人机交互'),('智能感知','设备接入 · 农情采集'),
    ('智能监测','病虫 · 虫情 · 物候'),('智能决策','水肥 · 防治 · 预警'),
    ('园区管理','地块 · 设备 · 权限'),('农事管理','计划 · 派发 · 复核'),
    ('专家问诊','疑难复核 · 协同诊疗')],BLUE,65)
arrow(870,334,870,353)

frame(357,266,'多智能体协同层｜任务规划、专业协作与执行编排')
box(97,408,1546,60,SOFT[GREEN],GREEN)
text(870,429,'总控编排智能体',16,GREEN,True)
text(870,451,'意图路由  ·  任务拆解  ·  上下文维护  ·  工具选择  ·  结果汇总',11,MUTED)
for x in [283,675,1066,1457]: arrow(x,468,x,484)
cards(486,[('交互与意图智能体','需求理解 · 条件补全'),('感知接入智能体','采集调度 · 质量校验'),
    ('视觉诊断智能体','病虫识别 · 虫情计数'),('监测分析智能体','物候判定 · 趋势预警')],GREEN,53)
cards(552,[('知识检索智能体','证据检索 · 引用溯源'),('农艺决策智能体','证据融合 · 方案生成'),
    ('任务执行智能体','农事派发 · 设备联动'),('专家协同智能体','人工复核 · 经验回流')],GREEN,53)
arrow(870,623,870,642)

frame(646,161,'模型与知识工具层｜大小模型、检索与规则协同')
cards(698,[('专业视觉小模型','病虫害分类 · 虫情检测\n物候识别 · 置信度输出'),
    ('农业知识与 RAG','农技规程 · 专家案例\n知识图谱 · 检索与重排'),
    ('大语言模型','多模态理解 · 证据融合\n农艺推理 · 可信答案'),
    ('规则与执行工具','阈值边界 · 用药约束\n权限校验 · 人工确认')],GREEN,91)
arrow(870,807,870,826,ORANGE)

frame(830,140,'决策执行层｜可信方案、安全执行与结果反馈')
cards(881,[('可信诊断与预警','识别事实 · 证据引用'),('农艺方案与任务','防治建议 · 水肥计划'),
    ('设备与业务执行','人工确认 · 控制指令'),('效果复查与沉淀','执行回执 · 案例更新')],ORANGE,68)
for x in [471,862,1253]: arrow(x,915,x+17,915,ORANGE)

frame(997,145,'数据与感知底座｜跨作物、跨园区配置复用')
cards(1048,[('田间物联网','摄像头 · 虫情设备\n气象站 · 土壤传感器'),('生产业务数据','地块 · 作物 · 物候\n农事台账 · 历史预警'),
    ('农业知识资产','农技规程 · 专家经验\n诊断案例 · 版本管理'),('控制与平台支撑','灌溉 · 喷水等设备\n身份权限 · 日志审计')],BLUE,76)
arrow(870,997,870,970,BLUE)

# Feedback is routed outside the frames without crossing cards.
ax.plot([1668,1702,1702,1668],[920,920,438,438],color=ORANGE,lw=1.6,zorder=4)
arrow(1702,438,1668,438,ORANGE)
text(1723,680,'执\n行\n反\n馈',12,ORANGE,True)
box(75,1174,1590,64,SOFT[GREEN],GREEN)
text(870,1195,'多源感知 → 协同分析 → 知识检索 → 可信决策 → 安全执行 → 反馈学习',15,GREEN,True)
text(870,1219,'全程留痕：任务状态 · 模型版本 · 引用证据 · 规则命中 · 人工确认 · 设备回执',11,MUTED)

stem=OUT/'智慧农业多智能体平台架构图'
for ext in ('png','svg','pdf'):
    fig.savefig(stem.with_suffix('.'+ext),dpi=220,facecolor='white')
print(stem.with_suffix('.png'))
