import { apps, dockApps } from './desktopApps';

export type DesktopItem = { kind: 'app'; name: string } | { kind: 'folder'; id: string; name: string; apps: string[] };
export type PhoneLayout = { desktop: DesktopItem[]; dock: string[] };
export type DragItem = { kind: 'app'; name: string } | { kind: 'folder'; id: string };
export type DropTarget =
  | { zone: 'desktop'; key: string; placement: 'before' | 'after' | 'inside' }
  | { zone: 'dock'; key: string; placement: 'before' | 'after' }
  | { zone: 'dock-empty' }
  | { zone: 'empty' };

const knownApps = new Set([...apps, ...dockApps].map(app => app.name));

export function defaultPhoneLayout(): PhoneLayout {
  return {
    desktop: apps.map(app => ({ kind: 'app', name: app.name })),
    dock: dockApps.map(app => app.name),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cloneLayout(layout: PhoneLayout): PhoneLayout {
  return JSON.parse(JSON.stringify(layout));
}

/** 旧布局缺少新应用时补到桌面；无效/重复项目不会进入可操作布局。 */
export function normalizePhoneLayout(raw: unknown): PhoneLayout {
  if (!isRecord(raw)) return defaultPhoneLayout();
  const used = new Set<string>();
  const desktop: DesktopItem[] = [];
  const dock: string[] = [];
  const rawDock = Array.isArray(raw.dock) ? raw.dock : [];
  for (const name of rawDock) {
    if (typeof name === 'string' && knownApps.has(name) && !used.has(name) && dock.length < 4) {
      dock.push(name);
      used.add(name);
    }
  }
  const folderIds = new Set<string>();
  for (const item of Array.isArray(raw.desktop) ? raw.desktop : []) {
    if (!isRecord(item)) continue;
    if (item.kind === 'app' && typeof item.name === 'string' && knownApps.has(item.name) && !used.has(item.name)) {
      desktop.push({ kind: 'app', name: item.name });
      used.add(item.name);
    } else if (item.kind === 'folder' && typeof item.id === 'string' && item.id && !folderIds.has(item.id)) {
      folderIds.add(item.id);
      const members: string[] = [];
      for (const name of Array.isArray(item.apps) ? item.apps : []) {
        if (typeof name === 'string' && knownApps.has(name) && !used.has(name)) {
          members.push(name);
          used.add(name);
        }
      }
      if (members.length)
        desktop.push({ kind: 'folder', id: item.id, name: String(item.name || '文件夹'), apps: members });
    }
  }
  for (const app of [...apps, ...dockApps]) if (!used.has(app.name)) desktop.push({ kind: 'app', name: app.name });
  return { desktop, dock };
}

export function itemKey(item: DesktopItem): string {
  return item.kind === 'folder' ? `folder:${item.id}` : `app:${item.name}`;
}

function removeSource(
  layout: PhoneLayout,
  source: DragItem,
): { layout: PhoneLayout; item: DesktopItem; desktopIndex: number } | null {
  const next = cloneLayout(layout);
  if (source.kind === 'folder') {
    const index = next.desktop.findIndex(item => item.kind === 'folder' && item.id === source.id);
    if (index < 0) return null;
    return { layout: next, item: next.desktop.splice(index, 1)[0], desktopIndex: index };
  }
  const desktopIndex = next.desktop.findIndex(item => item.kind === 'app' && item.name === source.name);
  if (desktopIndex >= 0) return { layout: next, item: next.desktop.splice(desktopIndex, 1)[0], desktopIndex };
  const dockIndex = next.dock.indexOf(source.name);
  if (dockIndex >= 0) {
    next.dock.splice(dockIndex, 1);
    return { layout: next, item: { kind: 'app', name: source.name }, desktopIndex: -1 };
  }
  const folderIndex = next.desktop.findIndex(item => item.kind === 'folder' && item.apps.includes(source.name));
  if (folderIndex < 0) return null;
  const folder = next.desktop[folderIndex] as Extract<DesktopItem, { kind: 'folder' }>;
  folder.apps.splice(folder.apps.indexOf(source.name), 1);
  if (!folder.apps.length) next.desktop.splice(folderIndex, 1);
  return { layout: next, item: { kind: 'app', name: source.name }, desktopIndex: folderIndex };
}

export function movePhoneItem(
  layout: PhoneLayout,
  source: DragItem,
  target: DropTarget,
  newFolderId: string,
): PhoneLayout {
  const removed = removeSource(layout, source);
  if (!removed) return layout;
  const { layout: next, item, desktopIndex } = removed;
  if (target.zone === 'empty') {
    next.desktop.push(item);
    return next;
  }
  if (target.zone === 'dock-empty') {
    if (item.kind === 'folder' || next.dock.length >= 4) return layout;
    next.dock.push(item.name);
    return next;
  }
  if (target.zone === 'desktop') {
    const targetIndex = next.desktop.findIndex(candidate => itemKey(candidate) === target.key);
    if (targetIndex < 0) return layout;
    const destination = next.desktop[targetIndex];
    if (target.placement === 'inside' && item.kind === 'app') {
      if (destination.kind === 'folder') destination.apps.push(item.name);
      else if (destination.kind === 'app') {
        next.desktop.splice(targetIndex, 1, {
          kind: 'folder',
          id: newFolderId,
          name: '文件夹',
          apps: [destination.name, item.name],
        });
      }
      return next;
    }
    next.desktop.splice(targetIndex + (target.placement === 'after' ? 1 : 0), 0, item);
    return next;
  }
  if (item.kind === 'folder') return layout;
  const targetIndex = next.dock.indexOf(target.key);
  if (targetIndex < 0) return layout;
  if (next.dock.length >= 4) {
    const displaced = next.dock.splice(targetIndex, 1, item.name)[0];
    next.desktop.splice(desktopIndex < 0 ? next.desktop.length : Math.min(desktopIndex, next.desktop.length), 0, {
      kind: 'app',
      name: displaced,
    });
  } else next.dock.splice(targetIndex + (target.placement === 'after' ? 1 : 0), 0, item.name);
  return next;
}

export function takeAppOutOfFolder(layout: PhoneLayout, folderId: string, appName: string): PhoneLayout {
  const folderIndex = layout.desktop.findIndex(item => item.kind === 'folder' && item.id === folderId);
  if (folderIndex < 0) return layout;
  const folder = layout.desktop[folderIndex];
  if (folder.kind !== 'folder' || !folder.apps.includes(appName)) return layout;
  const next = cloneLayout(layout);
  const copy = next.desktop[folderIndex] as Extract<DesktopItem, { kind: 'folder' }>;
  copy.apps.splice(copy.apps.indexOf(appName), 1);
  if (!copy.apps.length) next.desktop.splice(folderIndex, 1);
  next.desktop.splice(folderIndex + (copy.apps.length ? 1 : 0), 0, { kind: 'app', name: appName });
  return next;
}
