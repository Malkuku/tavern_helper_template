import { EraDataRule } from './types/EraDataRule';
import { DSLHandler } from '../../Utils/DSLHandler/DSLHandler';
import { eraLogger } from '../utils/EraHelperLogger';
import { DSLResult } from '../../Utils/DSLHandler/dsl-engine';

const MAX_LOOP_COUNT = 2000;

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

  const targetMatches = DSLHandler.getValueByPath(data, ruleItem.path);
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
    // 对每个匹配的目标路径应用当前handle
    const targetPathPattern = ruleItem.path;
    const targetMatches = DSLHandler.getValueByPath(data, targetPathPattern);

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
 * 主入口函数 - 应用所有规则
 */
const applyRule = async (
  data: any,
  snap: any,
  rules: EraDataRule
): Promise<{ data: any, results: OperationResult[], log: string }> => {
  // 深拷贝原始数据，避免直接修改
  const clone = JSON.parse(JSON.stringify(data));

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
  eraLogger.log("执行日志：",logText)

  return { data: clone, results: allResults, log: logText };
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
  const planeSnapshot = JSON.parse(JSON.stringify(snapshot));
  eraLogger.log(
    '加载测试数据:', testData,
    '快照:', planeSnapshot,
    '测试路径:', path,
    '条件表达式:', ifExpr,
    '操作表达式:', opExpr,
    '循环次数:', loopCount
  )

  // 限制循环次数在合理范围内
  const actualLoopCount = Math.max(1, Math.min(loopCount ?? 1, MAX_LOOP_COUNT));

  let output = '';

  // 循环执行
  for (let i = 0; i < actualLoopCount; i++) {
    if (actualLoopCount > 1) {
      output += `第${i + 1}次循环:\n`;
    }

    const context = DSLHandler.createEvalContext(testData, planeSnapshot, path);
    // 测试条件表达式
    let conditionResult: DSLResult | null = null;
    if(ifExpr){
      const result = DSLHandler.evaluateIf(ifExpr, context);
      conditionResult = result;
      output += `条件表达式：${ifExpr}\n`;
      output += `条件表达式结果：${JSON.stringify(result) || '表达式存在错误'}\n`
      eraLogger.log(`条件表达式：${ifExpr}，结果：${JSON.stringify(result)}`);
      output += '========================\n';
    }

    // 测试操作表达式
    if(opExpr){
      // 如果有条件表达式且结果为false，则不执行操作表达式
      if (conditionResult && !conditionResult.value) {
        output += `由于条件表达式结果为false，跳过执行操作表达式：${opExpr}\n`;
        eraLogger.log(`由于条件表达式结果为false，跳过执行操作表达式：${opExpr}`);
        output += '========================\n';
        break; // 条件不满足，跳出循环
      } else {
        const result = DSLHandler.evaluateOp(opExpr, context);
        output += `操作表达式：${opExpr}\n`;
        output += `操作表达式结果：${JSON.stringify(result) || '表达式存在错误'}\n`;
        eraLogger.log(`操作表达式：${opExpr}，结果：${JSON.stringify(result)}`);
        output += '========================\n';

        // 如果操作成功并且有返回值，则更新测试数据
        if (result.success && result.value) {
          // 处理返回的路径和值
          if (Array.isArray(result.value)) {
            // 多个路径的情况（通配符）
            result.value.forEach(({ path: resultPath, value: resultValue }) => {
              DSLHandler.setValueByPath(testData, resultPath, resultValue);
            });
          } else {
            // 单个值的情况
            DSLHandler.setValueByPath(testData, path, result.value);
          }
        }

        // 如果是最后一次循环，不需要换行
        if (i < actualLoopCount - 1) {
          output += '\n';
        }
      }
    }
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
