import { EraDataRule } from './types/EraDataRule';
import { DSLHandler } from './DSLHandler/DSLHandler';
import { eraLogger } from '../utils/EraHelperLogger';
import { RuleParser } from './DSLHandler/ruleParser';
import { VariableStore } from './DSLHandler/evaluator';

const MAX_LOOP_COUNT = 10000;
const LOG_WINDOW = 10; // 定义日志记录的窗口大小

// --- 类型定义 ---

interface LogEntry {
  ruleName: string;
  path: string;
  action: 'handle' | 'limit' | 'range' | 'skip' | 'error';
  message: string;
  changes?: { from: any; to: any };
  success: boolean;
}

interface OperationResult {
  path: string;
  value: any;
  success: boolean;
  error?: string;
  log?: LogEntry; // 结构化日志
}

// --- 日志处理器 ---

class EraRuleLogger {
  private logs: LogEntry[] = [];

  add(entry: LogEntry) {
    this.logs.push(entry);
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  toString(): string {
    if (this.logs.length === 0) return '没有执行任何操作';
    return this.logs
      .map(l => {
        const status = l.success ? '✅' : '❌';
        const change = l.changes ? ` (${l.changes.from} -> ${l.changes.to})` : '';
        return `[${l.ruleName}] ${status} [${l.action}] ${l.path}: ${l.message}${change}`;
      })
      .join('\n');
  }

  clear() {
    this.logs = [];
  }
}

// --- 工具函数 ---

/**
 * 将 Map 上下文转为数组
 */
const contextMapToArray = (map: Map<number, string>): string[] => {
  const result: string[] = [];
  // 假设通配符序号从 1 开始连续
  for (let i = 1; i <= map.size; i++) {
    result.push(map.get(i) || '');
  }
  return result;
};

/**
 * 将数据合并到快照中，仅合并类型匹配的字段
 */
const mergeDataToSnapshot = (data: any, snap: any): any => {
  const merged = JSON.parse(JSON.stringify(snap));
  const merge = (target: any, source: any) => {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (Object.prototype.hasOwnProperty.call(target, key) && typeof target[key] === typeof source[key]) {
          if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
            merge(target[key], source[key]);
          } else if (Array.isArray(target[key]) === Array.isArray(source[key])) {
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
 * 深度比较两个对象，并返回一个仅包含值差异的对象。
 *
 * **严格结构模式**：
 * 1. 假设 `current` 和 `original` 具有完全相同的键结构。
 * 2. 只比较 `original` 中存在的键。
 * 3. 忽略任何在 `current` 中新增或在 `original` 中不存在的键。
 * 4. 如果值的类型发生变化，也忽略该差异。
 * 5. 数组被视为一个整体进行比较。
 *
 * @param current 新对象
 * @param original 原始对象
 * @returns 包含合法值差异的对象，如果没有差异则返回一个空对象 {}
 */
export function diffObjects(current: any, original: any): any {
  // 如果两者全等，或都是 NaN，则无差异
  if (current === original || (Number.isNaN(current) && Number.isNaN(original))) {
    return {};
  }

  // 如果 original 不是对象（或为 null），我们无法遍历它的键。
  // 按照严格结构模式，如果它们不相等，则返回 current 作为值的变化。
  if (typeof original !== 'object' || original === null) {
    // 但要先检查 current 是否是对象，如果是，说明类型变了，应忽略
    if (typeof current === 'object' && current !== null) {
      console.warn(`[diffObjects] Ignored structural change: original is not an object, but current is.`);
      return {};
    }
    // 如果 original 和 current 都不是对象，且不相等，返回 current
    return current;
  }

  // 如果 original 是对象，但 current 不是，这是非法的结构变化，忽略。
  if (typeof current !== 'object' || current === null) {
    console.warn(`[diffObjects] Ignored structural change: original is an object, but current is not.`);
    return {};
  }

  // 数组作为特例处理，被视为一个原子值。
  if (Array.isArray(original)) {
    if (!Array.isArray(current) || JSON.stringify(current) !== JSON.stringify(original)) {
      // 如果 current 不是数组，或内容不同，则返回整个新数组
      return current;
    }
    return {};
  }

  const diff: { [key: string]: any } = {};

  // 只遍历 original 的键，这是我们信任的“结构蓝图”
  for (const key in original) {
    // 确保 current 中也存在这个 key，否则是结构差异，跳过
    if (!Object.prototype.hasOwnProperty.call(current, key)) {
      console.warn(`[diffObjects] Ignored structural change: key '${key}' was removed in current object.`);
      continue;
    }

    const currentValue = current[key];
    const originalValue = original[key];

    //拒绝 NaN
    if (typeof currentValue === 'number' && Number.isNaN(currentValue)) {
      console.warn(`[diffObjects] Ignored NaN value for key '${key}'.`);
      continue;
    }

    // 如果值相同或都是 NaN，则跳过
    if (currentValue === originalValue || (Number.isNaN(currentValue) && Number.isNaN(originalValue))) {
      continue;
    }

    // 检查类型是否一致
    const getType = (value: any) => value === null ? 'null' : typeof value;
    if (getType(currentValue) !== getType(originalValue)) {
      console.warn(`[diffObjects] Ignored type mismatch for key '${key}'. Original: ${getType(originalValue)}, Current: ${getType(currentValue)}.`);
      continue;
    }

    // 递归比较子对象（确保两者都是对象）
    if (typeof currentValue === 'object' && currentValue !== null && !Array.isArray(currentValue)) {
      const nestedDiff = diffObjects(currentValue, originalValue);
      if (nestedDiff && Object.keys(nestedDiff).length > 0) {
        diff[key] = nestedDiff;
      }
    }
    // 处理原始类型和数组的值变化
    else {
      diff[key] = currentValue;
    }
  }
  return diff;
}

/**
 * 注入通配符上下文到表达式字符串中
 * @param expression 原始表达式 "$[角色.*.好感度]"
 * @param wildcards 通配符对应的值列表 ["星宫诗羽"]
 * @returns 注入后的表达式 "$[角色.星宫诗羽.好感度]"
 */
const injectWildcards = (expression: string, wildcards: string[]): string => {
  if (!wildcards.length) return expression;

  // 匹配 $[...] 结构
  return expression.replace(/\$\[(.*?)\]/g, (match, content) => {
    const parts = content.split('.');
    let wildcardIndex = 0;
    const newParts = parts.map((part: string) => {
      if (part === '*' && wildcardIndex < wildcards.length) {
        return wildcards[wildcardIndex++];
      }
      return part;
    });
    return `$[${newParts.join('.')}]`;
  });
};

// --- 核心逻辑 ---
export const EraDataHandler = {
  /**
   * 主入口：应用规则
   */
  async applyRule(data: any, snap: any, rules: EraDataRule) {
    try {
      const logger = new EraRuleLogger();
      const workingData = mergeDataToSnapshot(data, snap);

      const sortedRules = Object.entries(rules)
        .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));

      // 创建全局变量池,生命周期为整个 applyRule 调用
      const globalVars: VariableStore = new Map();

      eraLogger.log(`[EraDataHandler] 获取到原始数据`, data);
      eraLogger.log(`[EraDataHandler] 获取到快照`, snap);
      eraLogger.log(`[EraDataHandler] 处理原始数据为全量`, workingData);
      eraLogger.log(`[EraDataHandler] 正在处理规则`, sortedRules);

      for (const [ruleName, rule] of sortedRules) {
        if (!rule.enable) continue;

        try {
          // 统一调用 _processRule
          await this._processRule(workingData, snap, ruleName, rule, logger, globalVars);
        } catch (e: any) {
          eraLogger.error(`[EraDataHandler] 运行规则'${ruleName}'时出现错误 :`, e);
          logger.add({
            ruleName,
            path: rule.path,
            action: 'error',
            success: false,
            message: e.message || 'Unknown error'
          });
        }
      }

      eraLogger.log(`[EraDataHandler] 已完成数据的更新`, workingData);
      eraLogger.log(`[EraDataHandler] 处理过程日志`, logger.getLogs())

      const diff = diffObjects(workingData, snap);
      eraLogger.log(`[EraDataHandler] 合并数据变化`, diff);
      return {
        data: diff,
        log: logger.toString(),
        rawLogs: logger.getLogs()
      };
    }finally{
      DSLHandler.clearCache();
    }
  },

  /**
   * 统一规则处理器
   * 核心逻辑：获取上下文列表 -> 遍历上下文 -> 执行规则
   */
  async _processRule(data: any, snap: any, ruleName: string, rule: EraDataRule[string], logger: EraRuleLogger, globalVars: VariableStore) {
    // 创建局部变量池,生命周期为单个规则
    const localVars: VariableStore = new Map();

    const ruleLoopCount = Math.max(1, Math.min(rule.loop ?? 1, MAX_LOOP_COUNT));
    const parser = new RuleParser(data);

    // 1. 确定上下文来源 (Context Source)
    let contexts: Map<number, string>[] = [];
    if (rule.path === '*') {
      // --- Global Mode ---
      if (rule.if) {
        // 尝试从 rule.if 解析通配符上下文
        // 如果 rule.if 里没有通配符，getContexts 会返回 [new Map()] (即单次执行)
        contexts = parser.getContexts(rule.if);
      } else {
        // 没有 if，也没有 path，默认为单次执行的空上下文
        contexts = [new Map()];
      }
    } else {
      const pathExpr = `$[${rule.path}]`;
      contexts = parser.getContexts(pathExpr);
    }

    if (contexts.length === 0) return;

    // 2. 遍历每一个上下文 (Context Loop)
    for (const ctxMap of contexts) {
      const wildcardValues = contextMapToArray(ctxMap);

      // 计算当前上下文对应的具体 Path (仅用于 Scoped 模式下的 limit/range 计算)
      let currentPath = '';
      if (rule.path !== '*') {
        currentPath = injectWildcards(rule.path, wildcardValues);
      }

      // --- 优化开始：预先计算具体的表达式字符串 ---
      // 因为在同一个 Context 下，wildcardValues 是不变的，
      // 所以 injectWildcards 的结果在整个 ruleLoopCount 循环中都是一样的。
      const concreteIf = rule.if ? injectWildcards(rule.if, wildcardValues) : null;
      const preparedHandles: { key: string, cfg: any, concreteIf: string | null, concreteOp: string }[] = [];
      if (rule.handle) {
        const sortedHandles = Object.entries(rule.handle)
          .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));

        for (const [key, cfg] of sortedHandles) {
          preparedHandles.push({
            key,
            cfg,
            concreteIf: cfg.if ? injectWildcards(cfg.if, wildcardValues) : null,
            concreteOp: injectWildcards(cfg.op, wildcardValues)
          });
        }
      }

      // 3. 规则级循环 (Rule Loop)
      for (let loopIndex = 0; loopIndex < ruleLoopCount; loopIndex++) {
        const shouldLogRuleLoop = ruleLoopCount <= LOG_WINDOW * 2 || loopIndex < LOG_WINDOW || loopIndex >= ruleLoopCount - LOG_WINDOW;

        // 如果循环次数过多，在适当位置插入一条省略日志
        if (ruleLoopCount > LOG_WINDOW * 2 && loopIndex === LOG_WINDOW) {
          logger.add({
            ruleName,
            path: currentPath || 'Global',
            action: 'skip',
            success: true,
            message: `Skipping logs from loop ${LOG_WINDOW + 1} to ${ruleLoopCount - LOG_WINDOW}...`
          });
        }

        // --- A. Rule Level IF ---
        let isRuleMet = true;
        if (concreteIf) {
          // 直接使用预计算好的字符串，配合 DSLEngine 的 AST 缓存
          const ifRes = DSLHandler.execute(concreteIf, data, globalVars, localVars);
          // --- 修改开始 ---
          if (!ifRes.success) {
            isRuleMet = false;
            if (shouldLogRuleLoop) { // 只有在需要记录日志的循环中才记录
              logger.add({
                ruleName,
                path: currentPath || 'Global',
                action: 'error', // 使用 'error' 或 'if-error'
                success: false,
                message: `Rule 'if' condition failed to execute: ${ifRes.error}`
              });
            }
          } else {
            isRuleMet = Array.isArray(ifRes.value)
              ? ifRes.value.every(v => v.value === true)
              : !!ifRes.value;
          }
        }
        // 如果条件不满足
        if (!isRuleMet) {
          // 如果是 Global 模式，或者不是第一次循环，直接退出
          // (Scoped 模式下，第一次循环即使条件不满足，也可能需要执行 limit/range)
          if (rule.path === '*' || loopIndex > 0) break;
        }

        // --- B. Handle Execution ---
        if (isRuleMet && preparedHandles.length > 0) {
          for (const item of preparedHandles) {
            const hLoop = Math.max(1, Math.min(item.cfg.loop ?? 1, MAX_LOOP_COUNT));

            for(let i=0; i<hLoop; i++) {
              const shouldLogHandleLoop = hLoop <= LOG_WINDOW * 2 || i < LOG_WINDOW || i >= hLoop - LOG_WINDOW;

              if (hLoop > LOG_WINDOW * 2 && i === LOG_WINDOW) {
                logger.add({
                  ruleName,
                  path: currentPath || 'Global',
                  action: 'skip',
                  success: true,
                  message: `[${item.key}] Skipping logs from loop ${LOG_WINDOW + 1} to ${hLoop - LOG_WINDOW}...`
                });
              }

              // 使用预计算的字符串
              if (item.concreteIf) {
                const res = DSLHandler.execute(item.concreteIf, data, globalVars, localVars);
                if (!res.success) { //  handle 内部的 if 添加日志
                  if (shouldLogHandleLoop) {
                    logger.add({
                      ruleName,
                      path: currentPath || 'Global',
                      action: 'error',
                      success: false,
                      message: `Handle [${item.key}] 'if' condition failed to execute: ${res.error}`
                    });
                  }
                  break; // 条件执行失败，跳出此 handle 的循环
                }
                const isTrue = Array.isArray(res.value) ? res.value.every(v => v.value === true) : !!res.value;
                if (!isTrue) break;
              }

              // 使用预计算的字符串
              const opRes = DSLHandler.execute(item.concreteOp, data, globalVars, localVars);

              // 应用 DSL 引擎返回的变更
              if (opRes.success && Array.isArray(opRes.value)) {
                opRes.value.forEach(change => {
                  // 只有当返回结果包含 path 时，才认为是一次有效的赋值操作
                  if (change.path) {
                    const oldValue = DSLHandler.getValue(data, change.path);
                    DSLHandler.setValue(data, change.path, change.value);

                    if (shouldLogHandleLoop) {
                      logger.add({
                        ruleName,
                        path: change.path,
                        action: 'handle',
                        success: true,
                        message: `[${item.key}] Loop ${i + 1}/${hLoop} (Ctx: ${wildcardValues.join('.')})`,
                        changes: { from: oldValue, to: change.value }
                      });
                    }
                  } else if (shouldLogHandleLoop) {
                      logger.add({
                        ruleName,
                        path: currentPath || 'Global',
                        action: 'handle',
                        success: true,
                        message: `[${item.key}] Evaluated value: ${JSON.stringify(change.value)} (No assignment)`,
                      });
                    }
                });
              } else if (!opRes.success) {
                if (shouldLogHandleLoop) {
                  logger.add({
                    ruleName,
                    path: currentPath || 'Global',
                    action: 'handle',
                    success: false,
                    message: `[${item.key}] Error: ${opRes.error}`
                  });
                }
              }
            }
          }
        }

        // --- C. Limit & Range (仅当有具体 Path 时生效) ---
        // 逻辑：Scoped 模式下，即使 if 不满足，第一次循环也要检查 limit/range
        if (currentPath && (isRuleMet || loopIndex === 0)) {
          this._applyLimitAndRange(data, snap, rule, currentPath, logger, ruleName, shouldLogRuleLoop);
        }

        if (!isRuleMet) break;
      }
    }
  },

  /**
   *  Limit 和 Range 逻辑
   */
  _applyLimitAndRange(data: any, snap: any, rule: EraDataRule[string], currentPath: string, logger: EraRuleLogger, ruleName: string, shouldLog: boolean) {

    // 1. 获取当前值 (Raw Value)
    const currentV = DSLHandler.getValue(data, currentPath);
    // 2. 获取快照值 (Raw Value)
    const snapV = DSLHandler.getValue(snap, currentPath);

    // Limit 处理
    if (rule.limit && rule.limit.length === 2) {
      if (typeof currentV === 'number' && typeof snapV === 'number') {
        const [minDelta, maxDelta] = rule.limit;
        const delta = currentV - snapV;
        let limitedDelta = delta;

        if (delta > maxDelta) limitedDelta = maxDelta;
        if (delta < minDelta) limitedDelta = minDelta;

        if (limitedDelta !== delta) {
          const finalVal = snapV + limitedDelta;
          DSLHandler.setValue(data, currentPath, finalVal);
          if (shouldLog) {
            logger.add({
              ruleName,
              path: currentPath,
              action: 'limit',
              success: true,
              message: `Delta ${delta} limited to [${minDelta}, ${maxDelta}]`,
              changes: { from: currentV, to: finalVal }
            });
          }
        }
      }
    }

    // Range 处理
    if (rule.range && rule.range.length === 2) {
      const valAfterLimit = DSLHandler.getValue(data, currentPath);

      if (typeof valAfterLimit === 'number') {
        const [min, max] = rule.range;
        const clamped = Math.max(min, Math.min(valAfterLimit, max));

        if (clamped !== valAfterLimit) {
          DSLHandler.setValue(data, currentPath, clamped);
          if (shouldLog) {
            logger.add({
              ruleName,
              path: currentPath,
              action: 'range',
              success: true,
              message: `Value clamped to [${min}, ${max}]`,
              changes: { from: valAfterLimit, to: clamped }
            });
          }
        }
      }
    }
  },
};
