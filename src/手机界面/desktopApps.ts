export const dataAppNames = ['主要角色', '次要角色', '我的档案', '技能', '随身物品'] as const;
export type DataAppName = (typeof dataAppNames)[number];

export function appDisplayName(name: string): string {
  return name === '主要角色' ? '心象监测' : name === '次要角色' ? '人物观测' : name;
}

export const apps = [
  { name: '微信', icon: '', color: 'linear-gradient(145deg, #42d76c, #08aa41)' },
  { name: '魔女恶堕计划', icon: '', color: 'linear-gradient(145deg, #411335, #150c25)' },
  { name: '角色编辑器', icon: '✎', color: 'linear-gradient(145deg, #c6a4df, #7756a1)' },
  { name: '信息', icon: '●', color: 'linear-gradient(145deg, #73e878, #19ae45)' },
  { name: '照片', icon: '', color: 'linear-gradient(145deg, #fff, #e6e8ed)' },
  { name: '相机', icon: '◎', color: 'linear-gradient(145deg, #8e929a, #525761)' },
  { name: '日历', icon: '', color: 'linear-gradient(145deg, #fff, #eef0f2)' },
  { name: '地图', icon: '', color: '#e8f5fc' },
  { name: '天气', icon: '☀', color: 'linear-gradient(145deg, #68c6ff, #2277e8)' },
  { name: '备忘录', icon: '≡', color: 'linear-gradient(180deg, #ffd95e 22%, #fff 22%)' },
  { name: '设置', icon: '⚙', color: 'linear-gradient(145deg, #a9aeb8, #626976)' },
];

export const dockApps = [
  { name: '电话', icon: '☎', color: 'linear-gradient(145deg, #72e978, #21ad4a)' },
  { name: '浏览器', icon: '◉', color: 'linear-gradient(145deg, #9cdeff, #2584ed)' },
  { name: '音乐', icon: '♫', color: 'linear-gradient(145deg, #ff898a, #ee3157)' },
  { name: '文件', icon: '▣', color: 'linear-gradient(145deg, #91c8ff, #3788f5)' },
];
