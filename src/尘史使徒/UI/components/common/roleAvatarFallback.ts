interface RoleAvatarMeta {
  avatar: string;
  color: string;
  avatarStyle?: string;
}

const paths = [
  '<path d="M29 78c3-15 11-23 21-23s18 8 21 23M50 22a15 15 0 1 1 0 30 15 15 0 0 1 0-30Z"/><path class="sigil" d="m50 8 7 10-7 5-7-5 7-10Zm0 84-7-10 7-5 7 5-7 10Z"/>',
  '<path d="M50 14 81 68H19L50 14ZM50 86 19 32h62L50 86Z"/>',
  '<path d="m61 17 9 9-12 12-6-6 9-15ZM52 32 27 71l3 3 4-3 3 4 4-4 3 3 20-36-12-6ZM24 76l12-4"/>',
  '<path d="M67 17C46 21 31 39 27 71c13-4 25-13 31-26M30 70l-7 12M37 61l18-2M43 52l17-3M49 42l15-4"/>',
  '<path d="M15 50s13-19 35-19 35 19 35 19-13 19-35 19S15 50 15 50Zm35-11a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm0 4v14M43 50h14"/>',
  '<path d="M69 20A34 34 0 1 0 78 69 29 29 0 1 1 69 20ZM29 61l12-5M35 70l9-8"/>',
];

export function roleAvatarFallbackIndex(style: string | undefined, seed: string): number {
  if (style && /^[0-5]$/.test(style)) return Number(style);
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % 6;
}

export function roleAvatarFallbackSvg(style: string | undefined, seed: string): string {
  const index = roleAvatarFallbackIndex(style, seed);
  return `<svg class="avatar-fallback-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="43"/>${paths[index]}</svg>`;
}

export function wechatRoleAvatar(meta: RoleAvatarMeta | undefined, seed: string): string {
  if (meta?.avatar) return meta.avatar;
  const color = meta?.color && /^#[0-9a-fA-F]{6}$/.test(meta.color) ? meta.color : '#C9B485';
  const index = roleAvatarFallbackIndex(meta?.avatarStyle, seed);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#171920"/><g fill="none" stroke="${color}" stroke-width="3"><circle cx="50" cy="50" r="43"/>${paths[index]}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
