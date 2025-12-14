/**
 * 获取当前角色的世界书的标注信息
 */
const getCurrentCharWorldBookPrimary = async () => {
  const { primary } = getCharWorldbookNames('current');
  if (!primary) {
    throw new Error('未能找到当前角色的世界书。');
  }
  return primary;
};

/**
 * 基于正则过滤世界书名称条目
 */
const filterWorldBookNamesRegex = (regex: RegExp, names: string[]) => {
  return names.filter(name => regex.test(name));
};

/**
 * 获取所有的世界书名称列表
 */
const getAllWorldBookNames = async () => {
  const primary = await getCurrentCharWorldBookPrimary();
  const bookInfo = await getWorldbook(primary);
  return bookInfo.map(t => t.name);
};

/**
 * 获取世界书信息
 */
const getWorldBookContent = async (bookNames: string[]) => {
  const primary = await getCurrentCharWorldBookPrimary();
  const bookInfo = await getWorldbook(primary);
  let info = '';
  const neededBookInfo = bookInfo
    .filter(t => bookNames.includes(t.name))
    .sort((a, b) => a.position.order - b.position.order);
  neededBookInfo.forEach(bookInfo => {
    info += bookInfo.content;
  });
  return info;
};

/**
 * 批量设置世界书条目
 */
const enabledEntry = async (targets: Array<{ name: string; enabled: boolean }>) => {
  const primary = await getCurrentCharWorldBookPrimary();
  const bookInfo = await getWorldbook(primary);
  // 有任何一条缺失，立即失败
  const miss = targets.find(t => !bookInfo.some(e => e.name === t.name));
  if (miss) return false;

  await updateWorldbookWith(primary, wb =>
    wb.map(entry => {
      const hit = targets.find(t => t.name === entry.name);
      return hit ? { ...entry, enabled: hit.enabled } : entry;
    }),
  );
  return true; // 全部成功
};

/**
 * 批量排除世界书条目
 */
const removeLoresByRegex = async (lores: any, regex: RegExp, isReversed: boolean) => {
  console.info('removeLoresByRegex: ', '开始过滤', regex, isReversed);
  const remove = (lore: any) =>
    _.remove(lore, entry => {
      return isReversed ? !entry.comment.match(regex) : entry.comment.match(regex);
    });
  remove(lores.globalLore);
  remove(lores.characterLore);
  remove(lores.chatLore);
  remove(lores.personaLore);

  console.log('removeLoresByRegex过滤完成: ', lores);
};

/**
 * 通过数组批量排除世界书条目
 */
const removeLoresByArray = async (lores: any, array: string[], isReversed: boolean) => {
  console.info('removeLoresByArray: ', '开始过滤', array, isReversed);
  const remove = (lore: any) =>
    _.remove(lore, entry => {
      return isReversed ? !array.includes(entry.comment) : array.includes(entry.comment);
    });
  remove(lores.globalLore);
  remove(lores.characterLore);
  remove(lores.chatLore);
  remove(lores.personaLore);
  console.log('removeLoresByArray过滤完成: ', lores);
};

export const WorldInfoUtil = {
  getCurrentCharWorldBookPrimary,
  getWorldBookContent,
  getAllWorldBookNames,
  filterWorldBookNamesRegex,
  enabledEntry,
  removeLoresByRegex,
  removeLoresByArray,
};
