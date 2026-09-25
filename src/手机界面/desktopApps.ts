export const dataAppNames = ['主要角色', '次要角色', '我的档案', '技能', '随身物品', '仓库'] as const;
export type DataAppName = (typeof dataAppNames)[number];

export function isDataApp(name: string | null): name is DataAppName {
  return dataAppNames.some(item => item === name);
}

export const apps = [
  { name: '微信', icon: '', color: 'linear-gradient(145deg, #42d76c, #08aa41)' },
  { name: '主要角色', icon: '', color: 'linear-gradient(145deg, #dba4cf, #795aab)' },
  { name: '次要角色', icon: '', color: 'linear-gradient(145deg, #a4b9de, #696da6)' },
  { name: '我的档案', icon: '', color: 'linear-gradient(145deg, #e6acbe, #b66c95)' },
  { name: '技能', icon: '', color: 'linear-gradient(145deg, #cfb5ee, #865cb7)' },
  { name: '随身物品', icon: '', color: 'linear-gradient(145deg, #efc3a5, #c98779)' },
  { name: '仓库', icon: '', color: 'linear-gradient(145deg, #aac9d7, #668da5)' },
  { name: '信息', icon: '●', color: 'linear-gradient(145deg, #73e878, #19ae45)' },
  { name: '照片', icon: '✿', color: 'linear-gradient(145deg, #fff, #e6e8ed)' },
  { name: '相机', icon: '◎', color: 'linear-gradient(145deg, #8e929a, #525761)' },
  { name: '日历', icon: '25', color: 'linear-gradient(145deg, #fff, #eef0f2)' },
  { name: '地图', icon: '⌖', color: 'linear-gradient(145deg, #6ad5b7, #4b8ef4)' },
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
