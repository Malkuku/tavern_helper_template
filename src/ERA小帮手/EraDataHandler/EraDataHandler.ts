import { EraDataRule } from './types/EraDataRule';
import { DSLHandler } from '../../Utils/DSLHandler/DSLHandler';
import { eraLogger } from '../utils/EraHelperLogger';

const MAX_LOOP_COUNT = 2000;

/*
 关于更新的逻辑：
 首先收到了一份可能只包含了snap部分数据的data
 先通过data把snap补全为完整的数据（即先获取一份snap的备份，用data对备份进行一次不做任何检查（没有handle，limit，range）的更新）
 此时我们初始化了一份完整的更新后的数据，然后再把这个数据应用规则更新
 处理数据结束后，对比更新后的数据和原始的快照，去除掉没有改变的项，然后返回最终结果
 */

/**
 * 定义操作结果的接口
 */
interface OperationResult {
  path: string;
  value: any;
  success: boolean;
  error?: string;
  log?: string;
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
 * 检查值是否为有效数字（包括处理NaN的情况）
 */
const isValidNumber = (value: any): boolean => {
  return typeof value === 'number' && !isNaN(value);
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

  // 使用snap来展开通配符路径
  const targetMatches = DSLHandler.getValueByPath(data, ruleItem.path, snap);
  const [neg, pos] = ruleItem.limit;

  targetMatches.forEach(({ value: currentValue, path: targetFullPath }) => {
    if (!isValidNumber(currentValue)) {
      results.push({
        path: targetFullPath,
        value: currentValue,
        success: false,
        error: 'Value is not a number',
        log: `Limit检查: ${targetFullPath} 值不是数字`
      });
      return;
    }

    // 获取快照中的原始值
    const snapValue = getByPath(snap, targetFullPath);
    if (!isValidNumber(snapValue)) {
      results.push({
        path: targetFullPath,
        value: currentValue,
        success: false,
        error: 'Snapshot value is not a number',
        log: `Limit检查: ${targetFullPath} 快照值不是数字`
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
        success: true,
        log: `Limit限制: ${targetFullPath} 从 ${currentValue} 调整为 ${finalValue} (相对快照值 ${snapValue} 的变化被限制在 [${neg}, ${pos}] 范围内)`
      });
    } else {
      results.push({
        path: targetFullPath,
        value: currentValue,
        success: true,
        log: `Limit检查: ${targetFullPath} 值 ${currentValue} 相对于快照值 ${snapValue} 的变化 ${d} 在允许范围内 [${neg}, ${pos}]`
      });
    }
  });

  return results;
};

/**
 * 应用range限制
 */
const applyRangeLimit = (
  data: any,
  ruleItem: EraDataRule[string]
): OperationResult[] => {
  const results: OperationResult[] = [];

  if (!ruleItem.range) return results;

  // 使用snap来展开通配符路径
  const targetMatches = DSLHandler.getValueByPath(data, ruleItem.path);
  const [min, max] = ruleItem.range;

  targetMatches.forEach(({ value: currentValue, path: targetFullPath }) => {
    if (!isValidNumber(currentValue)) {
      results.push({
        path: targetFullPath,
        value: currentValue,
        success: false,
        error: 'Value is not a number',
        log: `Range检查: ${targetFullPath} 值不是数字`
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
        success: true,
        log: `Range限制: ${targetFullPath} 从 ${currentValue} 调整为 ${finalValue} (范围: [${min}, ${max}])`
      });
    } else {
      results.push({
        path: targetFullPath,
        value: currentValue,
        success: true,
        log: `Range检查: ${targetFullPath} 值 ${currentValue} 在范围内 [${min}, ${max}]`
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

  // 获取所有匹配的目标路径位置，使用snap来展开通配符路径
  const targetMatches = DSLHandler.getValueByPath(data, targetPathPattern, snap);

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
          success: true, // 条件判断为false不算错误
          log: `条件判断: ${targetFullPath} 条件 "${ifExpr}" 未满足，跳过操作`
        });
        return; // 条件不满足，跳过这个目标
      }
    }

    // 执行操作表达式
    const opResult = DSLHandler.evaluateOp(opExpr, context);
    if (!opResult.success) {
      eraLogger.warn(`操作表达式执行失败: ${opExpr}`, opResult.error);
      results.push({
        path: targetFullPath,
        value: targetValue,
        success: false,
        error: opResult.error,
        log: `操作执行失败: ${targetFullPath} 表达式 "${opExpr}" 执行出错: ${opResult.error}`
      });
      return;
    }

    // 处理操作表达式的结果
    // 如果结果是数组（通配符路径的情况），需要分别处理每个路径
    if (Array.isArray(opResult.value)) {
      opResult.value.forEach(({ path, value }) => {
        const pathSegments = path.split('.');
        setByPathArray(data, pathSegments, value);

        results.push({
          path,
          value,
          success: true,
          log: `操作执行成功: ${path} 值更新为 ${value} (表达式: "${opExpr}")`
        });
      });
    } else {
      // 单个值的情况
      const pathSegments = targetFullPath.split('.');
      setByPathArray(data, pathSegments, opResult.value);

      results.push({
        path: targetFullPath,
        value: opResult.value,
        success: true,
        log: `操作执行成功: ${targetFullPath} 值从 ${targetValue} 更新为 ${opResult.value} (表达式: "${opExpr}")`
      });
    }
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
    // 对每个匹配的目标路径应用当前handle，使用snap来展开通配符路径
    const targetPathPattern = ruleItem.path;
    const targetMatches = DSLHandler.getValueByPath(data, targetPathPattern, snap);

    // 如果没有匹配项，继续下一个handle
    if (targetMatches.length === 0) {
      continue;
    }

    // 获取循环次数，默认为1，最大为10000
    const loopCount = Math.max(1, Math.min(handleItem.loop ?? 1, MAX_LOOP_COUNT));

    // 对每个匹配的目标路径应用当前handle
    for (const { path: targetFullPath, value: targetValue } of targetMatches) {
      // 循环执行
      for (let i = 0; i < loopCount; i++) {
        // 每次循环都创建新的上下文，确保使用最新的数据
        const context = DSLHandler.createEvalContext(data, snap, targetFullPath);

        // 如果有条件表达式，先判断条件
        if (handleItem.if) {
          const result = DSLHandler.evaluateIf(handleItem.if, context);
          if (!result.success || !result.value) {
            results.push({
              path: targetFullPath,
              value: targetValue,
              success: true, // 条件判断为false不算错误
              log: `条件判断: ${targetFullPath} handle "${handleKey}" 条件 "${handleItem.if}" 未满足，终止循环 (${i + 1}/${loopCount})`
            });
            break; // 条件不满足，跳出循环
          }
        }

        // 执行操作表达式
        const opResult = DSLHandler.evaluateOp(handleItem.op, context);
        if (!opResult.success) {
          eraLogger.warn(`操作表达式执行失败: ${handleItem.op}`, opResult.error);
          results.push({
            path: targetFullPath,
            value: targetValue,
            success: false,
            error: opResult.error,
            log: `操作执行失败: ${targetFullPath} handle "${handleKey}" 表达式 "${handleItem.op}" 执行出错: ${opResult.error}`
          });
          break; // 执行失败，跳出循环
        }

        // 处理操作表达式的结果
        // 如果结果是数组（通配符路径的情况），需要分别处理每个路径
        if (Array.isArray(opResult.value)) {
          opResult.value.forEach(({ path, value }) => {
            const pathSegments = path.split('.');
            setByPathArray(data, pathSegments, value);

            results.push({
              path,
              value,
              success: true,
              log: `操作执行成功: ${path} handle "${handleKey}" 第${i + 1}次循环，值更新为 ${value} (表达式: "${handleItem.op}")`
            });
          });
        } else {
          // 单个值的情况，但如果我们的目标路径包含通配符，我们需要特殊处理
          const opPathResult = DSLHandler.getValueByPath(data, handleItem.op.match(/\$\[(.*?)\]/)?.[1] || targetFullPath);

          if (opPathResult.length > 1) {
            // 如果操作路径也包含通配符并匹配多个路径
            opPathResult.forEach(({ path, value }) => {
              const pathSegments = path.split('.');
              setByPathArray(data, pathSegments, opResult.value);

              results.push({
                path,
                value: opResult.value,
                success: true,
                log: `操作执行成功: ${path} handle "${handleKey}" 第${i + 1}次循环，值更新为 ${opResult.value} (表达式: "${handleItem.op}")`
              });
            });
          } else {
            // 单个值的情况
            const pathSegments = targetFullPath.split('.');
            setByPathArray(data, pathSegments, opResult.value);

            results.push({
              path: targetFullPath,
              value: opResult.value,
              success: true,
              log: `操作执行成功: ${targetFullPath} handle "${handleKey}" 第${i + 1}次循环，值从 ${targetValue} 更新为 ${opResult.value} (表达式: "${handleItem.op}")`
            });
          }
        }
      }
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
  if (!ruleItem.enable) {
    results.push({
      path: ruleItem.path,
      value: undefined,
      success: true,
      log: `规则未启用，跳过处理`
    });
    return results;
  }

  // 2. 应用handle（优先级1）
  results.push(...applyHandles(data, snap, ruleItem));

  // 3. 应用limit（优先级2）
  results.push(...applyDeltaLimit(data, snap, ruleItem));

  // 4. 应用range（优先级3）
  results.push(...applyRangeLimit(data, ruleItem));

  return results;
};


/**
 * 合并数据到快照中，创建完整的数据对象
 * 只有当data中的值类型与snap中相应位置的值类型相同时才进行合并，不新增属性
 */
const mergeDataToSnapshot = (data: any, snap: any): any => {
  // 深拷贝快照作为基础
  const merged = JSON.parse(JSON.stringify(snap));

  // 递归合并data到merged中，只合并类型相同的值，不新增属性
  const merge = (target: any, source: any) => {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        // 只有当目标对象中存在该键且类型相同时才进行合并
        if (Object.prototype.hasOwnProperty.call(target, key) && typeof target[key] === typeof source[key]) {
          if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
            // 递归处理嵌套对象
            merge(target[key], source[key]);
          } else if (Array.isArray(target[key]) === Array.isArray(source[key])) {
            // 确保数组和非数组类型匹配后再赋值
            target[key] = source[key];
          }
        }
      }
    }
  };

  merge(merged, data);
  return merged;
};

/**
 * 比较两个对象，找出不同的部分
 * 只比较值的变化，不考虑类型变化，因为mergeDataToSnapshot已经保证了类型相同
 */
const diffObjects = (obj: any, base: any): any => {
  const compare = (current: any, original: any, path: string[] = []): any => {
    // 对于基本类型，直接比较值
    if (typeof current !== 'object' || current === null || original === null) {
      return current !== original ? current : undefined;
    }

    // 处理数组情况
    if (Array.isArray(current) || Array.isArray(original)) {
      if (!Array.isArray(current) || !Array.isArray(original) || current.length !== original.length) {
        return current;
      }

      const arrayDiff: any[] = [];
      let hasChanges = false;

      for (let i = 0; i < current.length; i++) {
        const itemDiff = compare(current[i], original[i], [...path, String(i)]);
        if (itemDiff !== undefined) {
          arrayDiff[i] = itemDiff;
          hasChanges = true;
        }
      }

      return hasChanges ? arrayDiff : undefined;
    }

    // 处理对象情况
    let hasChanges = false;
    const objDiff: any = {};

    // 检查所有当前对象的属性
    for (const key in current) {
      if (Object.prototype.hasOwnProperty.call(current, key)) {
        const valueDiff = compare(current[key], original[key], [...path, key]);
        if (valueDiff !== undefined) {
          objDiff[key] = valueDiff;
          hasChanges = true;
        }
      }
    }

    return hasChanges ? objDiff : undefined;
  };

  const result = compare(obj, base);
  return result || {};
};

/**
 * 主入口函数 - 应用所有规则
 */
const applyRule = async (
  data: any,
  snap: any,
  rules: EraDataRule
): Promise<{ data: any, results: OperationResult[], log: string }> => {
  // 首先将data合并到snap中，创建完整的数据对象
  const fullData = mergeDataToSnapshot(data, snap);

  // 深拷贝fullData，避免直接修改
  const clone = JSON.parse(JSON.stringify(fullData));

  const allResults: OperationResult[] = [];

  // 按照order排序规则
  const sortedRules = Object.entries(rules)
    .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));

  // 应用每条规则
  for (const [ruleName, rule] of sortedRules) {
    const ruleResults = applyOneRule(clone, snap, rule);
    // 为每个结果添加规则名称前缀
    ruleResults.forEach(result => {
      if (!result.log) {
        result.log = '';
      }
      result.log = `[${ruleName}] ${result.log}`;
    });
    allResults.push(...ruleResults);

    // 添加异步延迟，避免阻塞主线程
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // 生成执行日志
  const logs = allResults
    .filter(result => result.log)
    .map(result => result.log);

  const logText = logs.length > 0 ? logs.join('\n') : '没有执行任何操作';

  // 比较处理后的数据和原始快照，只返回变化的部分
  const diffData = diffObjects(clone, snap);

  return { data: diffData, results: allResults, log: logText };
};

/**
 * 通过路径数组设置值（工具函数）
 */
function setByPathArray(root: any, path: string[], value: any) {
  let cur = root;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    // 确保路径上的所有中间节点都存在
    if (!(k in cur)) {
      // 检查下一个键是否为数字，如果是，则创建数组，否则创建对象
      const nextKey = path[i + 1];
      cur[k] = isNaN(Number(nextKey)) ? {} : [];
    } else if (typeof cur[k] !== 'object') {
      // 如果当前键存在但不是对象，强制覆盖为适当的类型
      const nextKey = path[i + 1];
      cur[k] = isNaN(Number(nextKey)) ? {} : [];
    }
    cur = cur[k];
  }
  cur[path[path.length - 1]] = value;
}

/**
 * 测试dsl语法
 * @param testData 测试数据
 * @param snapshot 快照数据
 * @param path 测试路径
 * @param ifExpr if表达式 '<<if> $[角色.角色A.特殊状态.好感度] ?[>=] &[{num}40]>'
 * @param opExpr op表达式 '<<op> $[角色.角色A.特殊状态.好感度] #[+] &[{num}10]>
 * @param loopCount 循环次数，默认为1
 */
const testDsl = (testData: object,snapshot: object, path: string,ifExpr: string,opExpr: string, loopCount: number = 1)=>{
  // 创建临时规则对象以便重用现有逻辑
  const tempRule = {
    temp: {
      order: 0,
      enable: true,
      path,
      handle: {
        test: {
          order:0,
          if: ifExpr,
          op: opExpr,
          loop: loopCount
        }
      }
    }
  };

  // 使用现有的 applyRule 函数来处理测试
  const result = applyOneRule(testData, snapshot, tempRule.temp);

  // 格式化结果为字符串输出
  let output = '';
  result.forEach((res, index) => {
    if (index > 0) output += '\n';
    output += `路径: ${res.path}\n`;
    output += `值: ${JSON.stringify(res.value)}\n`;
    output += `成功: ${res.success}\n`;
    if (res.error) output += `错误: ${res.error}\n`;
    if (res.log) output += `日志: ${res.log}\n`;
    output += '========================';
  });

  if (result.length === 0) {
    output = '没有执行任何操作';
  }

  return output;
}

export const EraDataHandler = {
  setByPathArray,
  deepEqual,
  applyRule,
  applyHandles,
  applyOneHandle,
  applyOneRule,
  testDsl
};
