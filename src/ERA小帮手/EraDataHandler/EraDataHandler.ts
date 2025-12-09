import { EraDataRule } from './types/EraDataRule';
import { DSLHandler } from '../../Utils/DSLHandler/DSLHandler';
/**
 * 通过path路径获取对象的一个值（不支持通配符）
 */
const getByPath = (obj: any, path: string): any =>
  path.split('.').reduce((o, k) => o?.[k], obj);

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
 * 应用range限制
 */
const applyRangeLimit = (
  data: any,
  ruleItem: EraDataRule[string]
): void => {
  if (!ruleItem.range) return;

  const targetMatches = DSLHandler.getValueByPath(data, ruleItem.path);
  const [min, max] = ruleItem.range;

  targetMatches.forEach(({ value: currentValue, path: targetFullPath }) => {
    if (typeof currentValue !== 'number') return;

    const finalValue = applyRange(currentValue, [min, max]);

    if (finalValue !== currentValue) {
      const pathSegments = targetFullPath.split('.');
      setByPathArray(data, pathSegments, finalValue);
    }
  });
};

/**
 * 应用limit限制（需要快照值）
 */
const applyDeltaLimit = (
  data: any,
  snap: any,
  ruleItem: EraDataRule[string]
): void => {
  if (!ruleItem.limit) return;

  const targetMatches = DSLHandler.getValueByPath(data, ruleItem.path);
  const [neg, pos] = ruleItem.limit;

  targetMatches.forEach(({ value: currentValue, path: targetFullPath }) => {
    if (typeof currentValue !== 'number') return;

    // 获取快照中的原始值
    const snapValue = getByPath(snap, targetFullPath);
    if (typeof snapValue !== 'number') return;

    const d = currentValue - snapValue;
    const finalValue = snapValue + (d > 0 ? Math.min(d, pos) : Math.max(d, neg));

    if (finalValue !== currentValue) {
      const pathSegments = targetFullPath.split('.');
      setByPathArray(data, pathSegments, finalValue);
    }
  });
};

/**
 * 处理单个handle（包含条件判断）
 */
const applyOneHandle = (
  data: any,
  snap: any,
  ruleItem: EraDataRule[string],
  handleKey: string,
  handleItem: NonNullable<EraDataRule[string]['handle']>[string]
): boolean => {
  const { if: ifExpr, op: opExpr } = handleItem;

  // 获取当前规则的目标路径（可能包含通配符）
  const targetPathPattern = ruleItem.path;

  // 获取所有匹配的目标路径位置
  const targetMatches = DSLHandler.getValueByPath(data, targetPathPattern);

  // 如果没有匹配项，直接返回
  if (targetMatches.length === 0) {
    return false;
  }

  let hasApplied = false;

  // 对每个匹配的目标路径进行处理
  targetMatches.forEach(({ value: targetValue, path: targetFullPath }) => {
    // 创建求值上下文
    const context = DSLHandler.createEvalContext(data, snap, targetFullPath);

    // 如果有条件表达式，先判断条件
    if (ifExpr) {
      const result = DSLHandler.evaluateIf(ifExpr, context);
      if (!result.success || !result.value) {
        return; // 条件不满足，跳过这个目标
      }
    }

    // 执行操作表达式
    const opResult = DSLHandler.evaluateOp(opExpr, context);
    if (!opResult.success) {
      console.warn(`操作表达式执行失败: ${opExpr}`, opResult.error);
      return;
    }

    // 设置结果值（支持通配符的路径需要特殊处理）
    const pathSegments = targetFullPath.split('.');
    setByPathArray(data, pathSegments, opResult.value);

    hasApplied = true;
  });

  return hasApplied;
};

/**
 * 应用所有handles（修正排序逻辑）
 */
const applyHandles = (
  data: any,
  snap: any,
  ruleItem: EraDataRule[string]
): boolean => {
  if (!ruleItem.handle) return false;

  let hasApplied = false;

  // 按照order排序处理，如果没有order则默认为0
  const sortedHandles = Object.entries(ruleItem.handle)
    .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));

  for (const [handleKey, handleItem] of sortedHandles) {
    const applied = applyOneHandle(data, snap, ruleItem, handleKey, handleItem);
    if (applied) {
      hasApplied = true;
    }
  }

  return hasApplied;
};

/**
 * 单条规则处理入口（修正处理顺序）
 */
const applyOneRule = (
  data: any,
  snap: any,
  ruleItem: EraDataRule[string]
): void => {
  // 1. 检查是否启用
  if (!ruleItem.enable) return;

  // 2. 应用handle（优先级1）
  applyHandles(data, snap, ruleItem);

  // 3. 应用limit（优先级2）
  applyDeltaLimit(data, snap, ruleItem);

  // 4. 应用range（优先级3）
  applyRangeLimit(data, ruleItem);
};


/**
 * 主入口函数 - 应用所有规则
 */
const applyRule = (
  data: any,
  snap: any,
  rules: EraDataRule
): any => {
  // 深拷贝原始数据，避免直接修改
  const clone = JSON.parse(JSON.stringify(data));

  // 按照order排序规则
  const sortedRules = Object.entries(rules)
    .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));

  // 应用每条规则
  sortedRules.forEach(([, rule]) => {
    applyOneRule(clone, snap, rule);
  });

  return clone;
};

/**
 * 通过路径数组设置值（工具函数）
 */
function setByPathArray(root: any, path: string[], value: any) {
  let cur = root;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (!(k in cur) || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[path[path.length - 1]] = value;
}

export const EraDataHandler = {
  setByPathArray,
  deepEqual,
  applyRule,
  applyHandles,
  applyOneHandle,
  applyOneRule
};
