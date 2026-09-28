interface RoleAvatarMeta {
  avatar: string;
  color: string;
  avatarStyle?: string;
}

export const roleAvatarStyleNames = ['银辉', '夜紫', '绯红', '青岚', '雾紫', '星夜'] as const;

// Six anonymous silhouettes; each surface renders this one SVG source.
const silhouettes = [
  {
    background: '#59647d',
    halo: '#d9d7d0',
    back: 'M17 90V46C17 20 31 10 50 10s33 10 33 36v44Z',
    fringe: 'M25 47C24 26 35 17 53 17c14 0 23 9 23 30-8-3-12-11-16-19-8 11-20 17-35 19Z',
    strands: 'M22 47c-2 16-1 27 2 37m53-38c3 14 3 27 0 38',
  },
  {
    background: '#635b7d',
    halo: '#d7c9e9',
    back: 'M22 77V42c0-19 11-29 28-29s28 10 28 29v35Z',
    fringe: 'M24 46c1-20 12-30 28-30 15 0 24 10 24 28-9-4-15-10-19-17-7 9-19 16-33 19Z',
    strands: 'M23 49c-1 9 0 17 3 26m51-27c1 9 0 17-3 26',
  },
  {
    background: '#765b70',
    halo: '#e0beca',
    back: 'M17 88V44c0-20 13-31 32-31 20 0 34 12 34 33v42Z',
    fringe: 'M24 46c0-19 11-30 27-30 16 0 25 10 27 28-12-2-19-7-23-17-7 11-17 16-31 19Z',
    strands: 'M20 47c-4 13-3 25 0 38m60-37c4 13 4 25 1 37',
  },
  {
    background: '#4e6e78',
    halo: '#c3dce1',
    back: 'M24 76V40c0-18 10-28 26-28s26 10 26 28v36Z',
    fringe: 'M25 46c-1-19 9-30 25-30 15 0 24 10 25 29-12-5-19-10-24-18-5 9-14 15-26 19Z',
    strands: 'M25 44c-2 10-2 19 0 29m50-29c2 10 2 19 0 29',
  },
  {
    background: '#6e657f',
    halo: '#e1d0e9',
    back: 'M18 89V46c0-22 13-34 32-34s32 12 32 34v43Z',
    fringe: 'M23 48c0-20 11-32 28-32 16 0 26 11 26 31-8-3-14-12-18-20-8 12-20 17-36 21Z',
    strands: 'M21 49c-3 13-3 26 0 36m58-36c3 13 3 26 0 36',
  },
  {
    background: '#536579',
    halo: '#c8d8e7',
    back: 'M19 88V44c0-21 13-32 31-32s31 11 31 32v44Z',
    fringe: 'M24 47c1-21 12-31 28-31 17 0 25 11 25 30-10-3-17-11-21-19-7 11-19 17-32 20Z',
    strands: 'M21 49c-3 14-2 25 1 36m57-36c3 14 2 25-1 36',
  },
] as const;

export function roleAvatarFallbackIndex(style: string | undefined, seed: string): number {
  if (style && /^[0-5]$/.test(style)) return Number(style);
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % silhouettes.length;
}

export function roleAvatarFallbackSvg(style: string | undefined, seed: string, color = '#C9B485'): string {
  const index = roleAvatarFallbackIndex(style, seed);
  const silhouette = silhouettes[index];
  const accent = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#C9B485';
  const clip = `role-silhouette-${index}`;
  return [
    `<svg class="avatar-fallback-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><clipPath id="${clip}"><circle cx="50" cy="50" r="49"/></clipPath></defs><g clip-path="url(#${clip})">`,
    `<circle cx="50" cy="50" r="50" fill="${silhouette.background}"/>`,
    `<circle cx="50" cy="40" r="32" fill="${silhouette.halo}" opacity=".45"/>`,
    `<path d="M14 25h6m-3-3v6m66 7h5m-2-2v5M14 69h4m-2-2v4" stroke="${silhouette.halo}" stroke-width="1.3" opacity=".8"/>`,
    `<path d="${silhouette.back}" fill="#1b263a"/>`,
    '<path d="M5 101c3-23 15-33 32-35l13 10 13-10c17 2 29 12 32 35Z" fill="#182235"/>',
    '<path d="M39 65v13l11 8 11-8V65Z" fill="#29354b"/>',
    '<path d="M31 41c0-16 8-25 19-25s19 9 19 25v18c0 16-8 25-19 25S31 75 31 59Z" fill="#29354b"/>',
    `<path d="${silhouette.fringe}" fill="#1b263a"/>`,
    `<path d="${silhouette.strands}" fill="none" stroke="#34435a" stroke-width="2" stroke-linecap="round"/>`,
    `<path d="M35 84 50 95l15-11" fill="none" stroke="${accent}" stroke-width="1.6" opacity=".85"/>`,
    `<path d="m50 84 3 4-3 5-3-5Z" fill="${accent}"/>`,
    `<circle cx="50" cy="50" r="48" fill="none" stroke="${accent}" stroke-width="1.5" opacity=".85"/></g></svg>`,
  ].join('');
}

export function roleAvatarFallbackDataUri(style: string | undefined, seed: string, color?: string): string {
  return `data:image/svg+xml,${encodeURIComponent(roleAvatarFallbackSvg(style, seed, color))}`;
}

export function wechatRoleAvatar(meta: RoleAvatarMeta | undefined, seed: string): string {
  if (meta?.avatar) return meta.avatar;
  return roleAvatarFallbackDataUri(meta?.avatarStyle, seed, meta?.color);
}
