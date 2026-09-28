export const WECHAT_IMAGE_CATEGORIES_KEY = 'magicGirlWeChatImageCategories';

export type ImageFolder = { id: string; name: string };
export type ImageGroup = { id: string; name: string; folders: ImageFolder[] };
export type ImagePlacement = { groupId: string; folderId: string | null };
export type ImageCategories = { groups: ImageGroup[]; placements: Record<string, ImagePlacement> };

const scope = () => ({ type: 'script' as const, script_id: getScriptId() });

export function normalizeImageCategories(raw: unknown): ImageCategories {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { groups: [], placements: {} };
  const source = raw as Partial<ImageCategories>;
  const seen = new Set<string>();
  const groups: ImageGroup[] = [];
  for (const item of Array.isArray(source.groups) ? source.groups : []) {
    if (
      !item ||
      typeof item.id !== 'string' ||
      !item.id ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      seen.has(item.id)
    )
      continue;
    seen.add(item.id);
    const folders: ImageFolder[] = [];
    for (const folder of Array.isArray(item.folders) ? item.folders : []) {
      if (
        !folder ||
        typeof folder.id !== 'string' ||
        !folder.id ||
        typeof folder.name !== 'string' ||
        !folder.name.trim() ||
        seen.has(folder.id)
      )
        continue;
      seen.add(folder.id);
      folders.push({ id: folder.id, name: folder.name.trim() });
    }
    groups.push({ id: item.id, name: item.name.trim(), folders });
  }
  const placements: Record<string, ImagePlacement> = {};
  if (source.placements && typeof source.placements === 'object' && !Array.isArray(source.placements)) {
    for (const [imageId, place] of Object.entries(source.placements)) {
      if (!place || typeof place !== 'object' || !imageId) continue;
      const group = groups.find(item => item.id === place.groupId);
      if (!group || (place.folderId !== null && !group.folders.some(folder => folder.id === place.folderId))) continue;
      placements[imageId] = { groupId: group.id, folderId: place.folderId };
    }
  }
  return { groups, placements };
}

export function readImageCategories(): ImageCategories {
  return normalizeImageCategories(getVariables(scope())?.[WECHAT_IMAGE_CATEGORIES_KEY]);
}

function updateCategories(change: (current: ImageCategories) => ImageCategories): ImageCategories {
  let next: ImageCategories = { groups: [], placements: {} };
  updateVariablesWith(variables => {
    next = change(normalizeImageCategories(variables[WECHAT_IMAGE_CATEGORIES_KEY]));
    return { ...variables, [WECHAT_IMAGE_CATEGORIES_KEY]: next };
  }, scope());
  return next;
}

export function createImageGroup(name: string): ImageCategories {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('请输入一级文件夹名称。');
  return updateCategories(current => {
    if (current.groups.some(group => group.name === trimmed)) throw new Error('一级文件夹名称已存在。');
    return { ...current, groups: [...current.groups, { id: crypto.randomUUID(), name: trimmed, folders: [] }] };
  });
}

export function createImageFolder(groupId: string, name: string): ImageCategories {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('请输入二级文件夹名称。');
  return updateCategories(current => {
    const group = current.groups.find(item => item.id === groupId);
    if (!group) throw new Error('请先选择一级文件夹。');
    if (group.folders.some(folder => folder.name === trimmed)) throw new Error('二级文件夹名称已存在。');
    return {
      ...current,
      groups: current.groups.map(item =>
        item.id === groupId
          ? { ...item, folders: [...item.folders, { id: crypto.randomUUID(), name: trimmed }] }
          : item,
      ),
    };
  });
}

export function renameImageGroup(groupId: string, name: string): ImageCategories {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('请输入一级文件夹名称。');
  return updateCategories(current => {
    if (current.groups.some(group => group.id !== groupId && group.name === trimmed))
      throw new Error('一级文件夹名称已存在。');
    if (!current.groups.some(group => group.id === groupId)) throw new Error('一级文件夹不存在。');
    return {
      ...current,
      groups: current.groups.map(group => (group.id === groupId ? { ...group, name: trimmed } : group)),
    };
  });
}

export function renameImageFolder(groupId: string, folderId: string, name: string): ImageCategories {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('请输入二级文件夹名称。');
  return updateCategories(current => {
    const group = current.groups.find(item => item.id === groupId);
    if (!group?.folders.some(folder => folder.id === folderId)) throw new Error('二级文件夹不存在。');
    if (group.folders.some(folder => folder.id !== folderId && folder.name === trimmed))
      throw new Error('二级文件夹名称已存在。');
    return {
      ...current,
      groups: current.groups.map(item =>
        item.id === groupId
          ? {
              ...item,
              folders: item.folders.map(folder => (folder.id === folderId ? { ...folder, name: trimmed } : folder)),
            }
          : item,
      ),
    };
  });
}

export function deleteImageGroup(groupId: string): ImageCategories {
  return updateCategories(current => {
    if (!current.groups.some(group => group.id === groupId)) throw new Error('一级文件夹不存在。');
    return {
      groups: current.groups.filter(group => group.id !== groupId),
      placements: Object.fromEntries(
        Object.entries(current.placements).filter(([, place]) => place.groupId !== groupId),
      ),
    };
  });
}

export function deleteImageFolder(groupId: string, folderId: string): ImageCategories {
  return updateCategories(current => {
    const group = current.groups.find(item => item.id === groupId);
    if (!group?.folders.some(folder => folder.id === folderId)) throw new Error('二级文件夹不存在。');
    return {
      groups: current.groups.map(item =>
        item.id === groupId ? { ...item, folders: item.folders.filter(folder => folder.id !== folderId) } : item,
      ),
      placements: Object.fromEntries(
        Object.entries(current.placements).map(([id, place]) => [
          id,
          place.groupId === groupId && place.folderId === folderId ? { groupId, folderId: null } : place,
        ]),
      ),
    };
  });
}

export function placeImage(imageId: string, groupId: string | null, folderId: string | null): ImageCategories {
  if (!imageId) throw new Error('图片引用无效。');
  return updateCategories(current => {
    const placements = { ...current.placements };
    if (groupId === null) {
      delete placements[imageId];
    } else {
      const group = current.groups.find(item => item.id === groupId);
      if (!group || (folderId !== null && !group.folders.some(folder => folder.id === folderId)))
        throw new Error('目标文件夹不存在。');
      placements[imageId] = { groupId, folderId };
    }
    return { ...current, placements };
  });
}

export function removeImagePlacement(raw: unknown, imageId: string): ImageCategories {
  const current = normalizeImageCategories(raw);
  const placements = { ...current.placements };
  delete placements[imageId];
  return { ...current, placements };
}
