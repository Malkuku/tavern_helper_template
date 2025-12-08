import { EraDataRule } from './types/EraDataRule';

/**
 * 通过path路径获取对象的一个值
 */
const getByPath = (obj: any, path: string): any =>
  path.split('.').reduce((o, k) => o?.[k], obj);

/**
 * 通过path路径设置对象一个值
 */
const setByPath = (obj: any, path: string, val: any): void => {
  const keys = path.split('.');
  const last = keys.pop()!;
  const node = keys.reduce((o, k) => (o[k] ??= {}), obj);
  node[last] = val;
};

/**
 * 限定范围
 */
const applyRange = (v: number, [min, max]: [number, number]): number =>
  Math.max(min, Math.min(v, max));

/**
 * 限定增量范围
 */
const applyDeltaLimit = (
  oldV: number,
  newV: number,
  [neg, pos]: [number, number]
): number => {
  const d = newV - oldV;
  return oldV + (d > 0 ? Math.min(d, pos) : Math.max(d, neg));
};

/**
 * 根据一条 handle 描述，把“源路径”的值经过运算后累加到“目标路径”
 * 支持 add | subtract | multiply | divide
 */
const applyOneHandle = (
  data: any,
  snap: any,
  targetPath: string,
  op: string,
  sourcePath: string
): void => {
  const src = getByPath(data, sourcePath);
  const dstOld = getByPath(snap, targetPath);
  if (typeof src !== 'number' || typeof dstOld !== 'number') return;

  let delta = 0;
  switch (op) {
    case 'add':      delta = src;            break;
    case 'subtract': delta = -src;           break;
    case 'multiply': delta = dstOld * src;   break;
    case 'divide':   delta = src === 0 ? 0 : dstOld / src; break;
    default: return;
  }

  // multiply / divide 直接覆盖；add / subtract 做累加
  const newV = ['multiply', 'divide'].includes(op) ? delta : dstOld + delta;
  setByPath(data, targetPath, newV);
};

/**
 * 处理“handle”段：按声明顺序依次执行跨路径运算
 */
const applyHandles = (
  data: any,
  snap: any,
  handles: NonNullable<EraDataRule[string]['handle']>
): void => {
  // 先按 key 排序，保证顺序可预期
  Object.entries(handles)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([, { op, path: sourcePath }], idx, arr) => {
      // 这里约定：handle 的 key 就是“目标路径”
      const targetPath = arr[idx][0];
      applyOneHandle(data, snap, targetPath, op, sourcePath);
    });
};

/**
 * 处理“rule”段：按顺序依次执行跨路径运算
 * @param data 当前数据
 * @param snap 快照
 * @param ruleItem
 */
const applyOneRule = (
  data: any,
  snap: any,
  ruleItem: EraDataRule[string]
): void =>{
  const cur = getByPath(data, ruleItem.path);
  const old = getByPath(snap, ruleItem.path);
  if (typeof cur !== 'number' || typeof old !== 'number') return;

  // 先跑 handle 运算（会修改 data）
  if (ruleItem.handle) applyHandles(data, snap, ruleItem.handle);

  //处理增量
  let v = ruleItem.limit
    ? applyDeltaLimit(old, cur, ruleItem.limit)
    : cur;

  //再处理范围
  if (ruleItem.range) v = applyRange(v, ruleItem.range);

  //更新数值
  setByPath(data, ruleItem.path, v);
}

/* ---------- 应用规则 ---------- */
const applyRule = (
  data: any,
  snap: any,
  rules: EraDataRule
): any => {
  const clone = JSON.parse(JSON.stringify(data));
  // 按 order 升序排列
  const sorted = Object.entries(rules).sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));
  sorted.forEach(([, rule]) => applyOneRule(clone, snap, rule));
  return clone;
};

/* ====================  导出  ==================== */
export const EraDataHandler = {
  applyRule,
  /* 测试用 */
  applyHandles,
  applyOneHandle,
};
