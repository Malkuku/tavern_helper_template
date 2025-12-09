import { EraDataRule } from './types/EraDataRule';
import { DSLHandler } from '../../Utils/DSLHandler/DSLHandler';

/**
 * 定义操作结果的接口
 */
interface OperationResult {
  path: string;
  value: any;
  success: boolean;
  error?: string;
}

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
): OperationResult[] => {
  const results: OperationResult[] = [];
  
  if (!ruleItem.range) return results;

  const targetMatches = DSLHandler.getValueByPath(data, ruleItem.path);
  const [min, max] = ruleItem.range;

  targetMatches.forEach(({ value: currentValue, path: targetFullPath }) => {
    if (typeof currentValue !== 'number') {
      results.push({
        path: targetFullPath,
        value: currentValue,
        success: false,
        error: 'Value is not a number'
      });
      return;
    }

    const finalValue = applyRange(currentValue, [min, max]);

    if (finalValue !== currentValue) {
      const pathSegments = targetFullPath.split('.');
      setByPathArray(data, pathSegments, finalValue);
      results.push({
        path: targetFullPath,
        value: finalValue,
        success: true
      });
    } else {
      results.push({
        path: targetFullPath,
        value: currentValue,
        success: true
      });
    }
  });
  
  return results;
};

/**
 * 应用limit限制（需要快照值）
 */
const applyDeltaLimit = (
  data: any,
  snap: any,
  ruleItem: EraDataRule[string]
): OperationResult[] => {
  const results: OperationResult[] = [];
  
  if (!ruleItem.limit) return results;

  const targetMatches = DSLHandler.getValueByPath(data, ruleItem.path);
  const [neg, pos] = ruleItem.limit;

  targetMatches.forEach(({ value: currentValue, path: targetFullPath }) => {
    if (typeof currentValue !== 'number') {
      results.push({
        path: targetFullPath,
        value: currentValue,
        success: false,
        error: 'Value is not a number'
      });
      return;
    }

    // 获取快照中的原始值
    const snapValue = getByPath(snap, targetFullPath);
    if (typeof snapValue !== 'number') {
      results.push({
        path: targetFullPath,
        value: currentValue,
        success: false,
        error: 'Snapshot value is not a number'
      });
      return;
    }

    const d = currentValue - snapValue;
    const finalValue = snapValue + (d > 0 ? Math.min(d, pos) : Math.max(d, neg));

    if (finalValue !== currentValue) {
      const pathSegments = targetFullPath.split('.');
      setByPathArray(data, pathSegments, finalValue);
      results.push({
        path: targetFullPath,
        value: finalValue,
        success: true
      });
    } else {
      results.push({
        path: targetFullPath,
        value: currentValue,
        success: true
      });
    }
  });
  
  return results;
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
): OperationResult[] => {
  const results: OperationResult[] = [];
  const { if: ifExpr, op: opExpr } = handleItem;

  // 获取当前规则的目标路径（可能包含通配符）
  const targetPathPattern = ruleItem.path;

  // 获取所有匹配的目标路径位置
  const targetMatches = DSLHandler.getValueByPath(data, targetPathPattern);

  // 如果没有匹配项，直接返回
  if (targetMatches.length === 0) {
    return results;
  }

  // 对每个匹配的目标路径进行处理
  targetMatches.forEach(({ value: targetValue, path: targetFullPath }) => {
    // 创建求值上下文
    const context = DSLHandler.createEvalContext(data, snap, targetFullPath);

    // 如果有条件表达式，先判断条件
    if (ifExpr) {
      const result = DSLHandler.evaluateIf(ifExpr, context);
      if (!result.success || !result.value) {
        results.push({
          path: targetFullPath,
          value: targetValue,
          success: true // 条件判断为false不算错误
        });
        return; // 条件不满足，跳过这个目标
      }
    }

    // 执行操作表达式
    const opResult = DSLHandler.evaluateOp(opExpr, context);
    if (!opResult.success) {
      console.warn(`操作表达式执行失败: ${opExpr}`, opResult.error);
      results.push({
        path: targetFullPath,
        value: targetValue,
        success: false,
        error: opResult.error
      });
      return;
    }

    // 设置结果值（支持通配符的路径需要特殊处理）
    const pathSegments = targetFullPath.split('.');
    setByPathArray(data, pathSegments, opResult.value);

    results.push({
      path: targetFullPath,
      value: opResult.value,
      success: true
    });
  });

  return results;
};

/**
 * 应用所有handles（修正排序逻辑）
 */
const applyHandles = (
  data: any,
  snap: any,
  ruleItem: EraDataRule[string]
): OperationResult[] => {
  const results: OperationResult[] = [];
  
  if (!ruleItem.handle) return results;

  // 按照order排序处理，如果没有order则默认为0
  const sortedHandles = Object.entries(ruleItem.handle)
    .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));

  // 逐个应用handle，保证按顺序执行
  for (const [handleKey, handleItem] of sortedHandles) {
    // 对每个匹配的目标路径进行处理
    const targetPathPattern = ruleItem.path;
    const targetMatches = DSLHandler.getValueByPath(data, targetPathPattern);

    // 如果没有匹配项，继续下一个handle
    if (targetMatches.length === 0) {
      continue;
    }

    // 对每个匹配的目标路径应用当前handle
    for (const { path: targetFullPath, value: targetValue } of targetMatches) {
      // 创建求值上下文
      const context = DSLHandler.createEvalContext(data, snap, targetFullPath);
      
      // 如果有条件表达式，先判断条件
      if (handleItem.if) {
        const result = DSLHandler.evaluateIf(handleItem.if, context);
        if (!result.success || !result.value) {
          results.push({
            path: targetFullPath,
            value: targetValue,
            success: true // 条件判断为false不算错误
          });
          continue; // 条件不满足，跳过这个目标
        }
      }

      // 执行操作表达式
      const opResult = DSLHandler.evaluateOp(handleItem.op, context);
      if (!opResult.success) {
        console.warn(`操作表达式执行失败: ${handleItem.op}`, opResult.error);
        results.push({
          path: targetFullPath,
          value: targetValue,
          success: false,
          error: opResult.error
        });
        continue;
      }

      // 设置结果值
      const pathSegments = targetFullPath.split('.');
      setByPathArray(data, pathSegments, opResult.value);
      
      results.push({
        path: targetFullPath,
        value: opResult.value,
        success: true
      });
    }
  }

  return results;
};

/**
 * 单条规则处理入口（修正处理顺序）
 */
const applyOneRule = (
  data: any,
  snap: any,
  ruleItem: EraDataRule[string]
): OperationResult[] => {
  const results: OperationResult[] = [];
  
  // 1. 检查是否启用
  if (!ruleItem.enable) return results;

  // 2. 应用handle（优先级1）
  results.push(...applyHandles(data, snap, ruleItem));

  // 3. 应用limit（优先级2）
  results.push(...applyDeltaLimit(data, snap, ruleItem));

  // 4. 应用range（优先级3）
  results.push(...applyRangeLimit(data, ruleItem));
  
  return results;
};


/**
 * 主入口函数 - 应用所有规则
 */
const applyRule = (
  data: any,
  snap: any,
  rules: EraDataRule
): { data: any, results: OperationResult[] } => {
  // 深拷贝原始数据，避免直接修改
  const clone = JSON.parse(JSON.stringify(data));
  
  const allResults: OperationResult[] = [];

  // 按照order排序规则
  const sortedRules = Object.entries(rules)
    .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));

  // 应用每条规则
  sortedRules.forEach(([, rule]) => {
    const ruleResults = applyOneRule(clone, snap, rule);
    allResults.push(...ruleResults);
  });

  return { data: clone, results: allResults };
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