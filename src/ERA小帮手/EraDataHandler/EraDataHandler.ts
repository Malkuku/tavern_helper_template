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

function setByPathArray(root: any, path: string[], value: any) {
  let cur = root;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (!(k in cur) || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[path[path.length - 1]] = value;
}

/**
 * 判断两个对象是否相等
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) if (!(k in b) || !deepEqual(a[k], b[k])) return false;
  return true;
}

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
 * 设置函数，当判断路径满足条件时，将此路径的值设置为keyValue
 */
const applySetIf = (
  data: any,
  snap: any,
  ruleItem: EraDataRule[string]
): boolean => {
  const { setIf } = ruleItem;
  if (!setIf) return false;

  const judgeVal = getByPath(snap, setIf.path);

  let hit = false;
  switch (setIf.if) {
    case '==': hit = judgeVal === setIf.ifValue; break;
    case '>':  hit = judgeVal >  setIf.ifValue;  break;
    case '<':  hit = judgeVal <  setIf.ifValue;  break;
    case '>=': hit = judgeVal >= setIf.ifValue;  break;
    case '<=': hit = judgeVal <= setIf.ifValue;  break;
  }

  if (hit) {
    setByPath(data, ruleItem.path, setIf.keyValue);
  }
  return hit; // 返回是否命中，便于外面决定是否跳过后续 handle
};

/**
 * this.path [op] handle.path
 */
const applyOneHandle = (
  data: any,
  ruleItem: EraDataRule[string],
  targetPath: string,
  op: string,
  sourcePath: string,
  snap: any
): void => {
  const srcVal  = getByPath(snap, sourcePath);      // handle.path
  const thisVal = getByPath(data, ruleItem.path);   // this.getByPath(data, targetPath);

  if (typeof srcVal !== 'number' || typeof thisVal !== 'number') return;

  let result = 0;
  switch (op) {
    case 'add':      result = thisVal + srcVal; break;
    case 'subtract': result = thisVal - srcVal; break;
    case 'multiply': result = thisVal * srcVal; break;
    case 'divide':   result = srcVal === 0 ? 0 : thisVal / srcVal; break;
    default: return;
  }
  setByPath(data, targetPath, result);
};

/* applyHandles */
const applyHandles = (
  data: any,
  snap: any,
  ruleItem: EraDataRule[string],
  handles: NonNullable<EraDataRule[string]['handle']>
): void => {
  Object.entries(handles)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([, { op, path: sourcePath }], idx, arr) => {
      const targetPath = arr[idx][0];
      applyOneHandle(data, ruleItem, targetPath, op, sourcePath, snap);
    });
};

/* 改写后的单条规则入口 */
const applyOneRule = (
  data: any,
  snap: any,
  ruleItem: EraDataRule[string]
): void => {
  // 1. 未启用直接跳过
  if (!ruleItem.enable) return;

  // 2. setIf 优先级最高
  applySetIf(data, snap,ruleItem);

  // 3. 如果 setIf 命中，后面 limit / range 仍要再限制一次
  let cur = getByPath(data, ruleItem.path);
  let old = getByPath(snap, ruleItem.path);
  if (typeof cur !== 'number' || typeof old !== 'number') return;

  // 4. handle 阶段（setIf 命中后也会跑）
  if (ruleItem.handle) {
    applyHandles(data, snap, ruleItem, ruleItem.handle);
    cur = getByPath(data, ruleItem.path); // handle 可能再次改动它
  }

  // 5. limit -> range
  let v = ruleItem.limit
    ? applyDeltaLimit(old, cur, ruleItem.limit)
    : cur;
  if (ruleItem.range) v = applyRange(v, ruleItem.range);
  setByPath(data, ruleItem.path, v);
};

/* ---------- 最外层入口（不变） ---------- */
const applyRule = (
  data: any,
  snap: any,
  rules: EraDataRule
): any => {
  const clone = JSON.parse(JSON.stringify(data));
  const sorted = Object.entries(rules)
    .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));
  sorted.forEach(([, rule]) => applyOneRule(clone, snap, rule));
  return clone;
};

export const EraDataHandler = {
  setByPathArray,
  deepEqual,
  applyRule,
  applyHandles,
  applyOneHandle
};
