export interface SpeakerInfo {
  fixedName: string;
  avatarUrl: string;
  color: string;
  avatarStyle: string;
}

const info = (data: any, fixedName: string): SpeakerInfo => ({
  fixedName: String(fixedName),
  avatarUrl: String(data?.meta?.avatar || ''),
  color: /^#[0-9a-fA-F]{6}$/.test(data?.meta?.color) ? data.meta.color : '#C9B485',
  avatarStyle: /^[0-5]$/.test(data?.meta?.avatarStyle) ? data.meta.avatarStyle : 'auto',
});

const hillSpeaker: SpeakerInfo = {
  fixedName: '希尔·菲诺尔',
  avatarUrl: 'https://gitgud.io/mouse789/dust-laden-obdurant/-/raw/main/头像/希尔.webp',
  color: '#A8B9CC',
  avatarStyle: 'auto',
};

export function resolveSpeaker(roles: any, rawName: string, currentUserName: string): SpeakerInfo {
  const name = rawName.trim();
  const user = roles?.user;
  if (user && ['user', currentUserName, user?.姓名, user?.key].filter(Boolean).map(String).includes(name)) {
    return info(user, currentUserName || user?.姓名 || 'user');
  }
  if (name === '希尔' || name === '希尔·菲诺尔') return hillSpeaker;
  for (const bucket of [roles?.主要角色 ?? {}, roles?.次要角色 ?? {}]) {
    for (const [key, data] of Object.entries(bucket) as [string, any][]) {
      if ([key, data?.姓名].filter(Boolean).map(String).includes(name)) return info(data, data?.姓名 || key);
    }
  }
  return { fixedName: name, avatarUrl: '', color: '#C9B485', avatarStyle: 'auto' };
}
