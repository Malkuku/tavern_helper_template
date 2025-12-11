import { EraDataRule } from './types/EraDataRule';
import { DSLHandler } from '../../Utils/DSLHandler/DSLHandler';
import { eraLogger } from '../utils/EraHelperLogger';

const MAX_LOOP_COUNT = 2000;

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
 * 比较对象差异
 */
const diffObjects = (obj: any, base: any): any => {
  const compare = (current: any, original: any): any => {
    if (typeof current !== 'object' || current === null || original === null) {
      return current !== original ? current : undefined;
    }
    if (Array.isArray(current)) {
      if (!Array.isArray(original) || current.length !== original.length) return current;
      const arrDiff = current.map((item, i) => compare(item, original[i])).filter(x => x !== undefined);
      return arrDiff.length > 0 ? current : undefined; // 数组简化处理：有变动则返回全量
    }
    let hasChanges = false;
    const objDiff: any = {};
    for (const key in current) {
      const valDiff = compare(current[key], original[key]);
      if (valDiff !== undefined) {
        objDiff[key] = valDiff;
        hasChanges = true;
      }
    }
    return hasChanges ? objDiff : undefined;
  };
  return compare(obj, base) || {};
};

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

/**
 * 从具体路径中提取通配符对应的值
 * @param pattern 规则路径 "角色.*.状态.*"
 * @param concretePath 具体路径 "角色.A.状态.B"
 * @returns ["A", "B"]
 */
const extractWildcardValues = (pattern: string, concretePath: string): string[] => {
  const pParts = pattern.split('.');
  const cParts = concretePath.split('.');
  const values: string[] = [];

  for (let i = 0; i < Math.min(pParts.length, cParts.length); i++) {
    if (pParts[i] === '*') {
      values.push(cParts[i]);
    }
  }
  return values;
};

// --- 核心逻辑 ---
export const EraDataHandler = {
  /**
   * 主入口：应用规则
   */
  async applyRule(data: any, snap: any, rules: EraDataRule) {
    const logger = new EraRuleLogger();

    // 1. 准备全量数据
    const workingData = mergeDataToSnapshot(data, snap);

    // 2. 排序规则
    const sortedRules = Object.entries(rules)
      .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));

    eraLogger.log(`[EraDataHandler] 获取到原始数据`, data);
    eraLogger.log(`[EraDataHandler] 获取到快照`, snap);
    eraLogger.log(`[EraDataHandler] 处理原始数据为全量`, workingData);
    eraLogger.log(`[EraDataHandler] 正在处理规则`, sortedRules);


    // 3. 逐条执行
    for (const [ruleName, rule] of sortedRules) {
      if (!rule.enable) continue;

      try {
        // 区分两种模式：
        // Mode A: Global Handle (path 为 "*") -> 直接执行 handle，不进行 limit/range
        // Mode B: Scoped Rule (path 为具体路径) -> 展开路径，对每个匹配项执行 handle/limit/range

        if (rule.path === '*') {
          await this._processGlobalRule(workingData, ruleName, rule, logger);
        } else {
          await this._processScopedRule(workingData, snap, ruleName, rule, logger);
        }
      } catch (e: any) {
        logger.add({
          ruleName,
          path: rule.path,
          action: 'error',
          success: false,
          message: e.message || 'Unknown error'
        });
      }

      // 避免阻塞 UI
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // 4. 生成结果
    const diff = diffObjects(workingData, snap);
    return {
      data: diff,
      log: logger.toString(),
      rawLogs: logger.getLogs() // 提供原始 JSON 日志供前端使用
    };
  },

  /**
   * 处理全局规则 (Path = "*")
   * 这种模式下只处理 handle，且 handle 中的表达式由 DSLHandler 自动处理通配符
   */
  async _processGlobalRule(data: any, ruleName: string, rule: EraDataRule[string], logger: EraRuleLogger) {
    // 获取规则的循环次数，默认为1，最大值为1000
    const ruleLoopCount = Math.max(1, Math.min(rule.loop ?? 1, MAX_LOOP_COUNT));

    if (!rule.handle) return;

    const sortedHandles = Object.entries(rule.handle)
      .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));

    // 规则级别的循环处理
    for (let ruleLoopIndex = 0; ruleLoopIndex < ruleLoopCount; ruleLoopIndex++) {

      // --- Rule Level IF Check ---
      if (rule.if) {
        const ifResult = DSLHandler.execute(rule.if, data);
        // 全局模式下，如果 if 返回 false (或者数组中所有项都为 false)，则中断循环
        const isRuleTrue = ifResult.success && Array.isArray(ifResult.value)
          ? ifResult.value.every(v => v.value === true)
          : !!ifResult.value;

        if (!isRuleTrue) {
          // 全局规则没有 limit/range，所以如果条件不满足直接终止
          break;
        }
      }

      // --- Handle Execution ---
      for (const [handleKey, handleCfg] of sortedHandles) {
        const loopCount = Math.max(1, Math.min(handleCfg.loop ?? 1, MAX_LOOP_COUNT));

        for (let i = 0; i < loopCount; i++) {
          // 1. Check Handle IF
          if (handleCfg.if) {
            const ifResult = DSLHandler.execute(handleCfg.if, data);
            const isTrue = ifResult.success && Array.isArray(ifResult.value)
              ? ifResult.value.every(v => v.value === true)
              : !!ifResult.value;

            if (!isTrue) break;
          }

          // 2. Execute Op
          const opResult = DSLHandler.execute(handleCfg.op, data);

          if (opResult.success && Array.isArray(opResult.value)) {
            opResult.value.forEach(res => {
              logger.add({
                ruleName,
                path: res.path || 'Global',
                action: 'handle',
                success: true,
                message: `[${handleKey}] Loop ${i + 1}/${loopCount} (Rule loop ${ruleLoopIndex + 1}/${ruleLoopCount})`,
                changes: { from: '?', to: res.value }
              });
            });
          } else if (!opResult.success) {
            logger.add({
              ruleName,
              path: 'Global',
              action: 'handle',
              success: false,
              message: `[${handleKey}] Error: ${opResult.error} (Rule loop ${ruleLoopIndex + 1}/${ruleLoopCount})`
            });
          }
        }
      }
    }
  },

  /**
   * 处理作用域规则 (Path = "角色.*.属性")
   * 这种模式下，先展开 path，然后针对每个具体路径执行 handle/limit/range
   */
  async _processScopedRule(data: any, snap: any, ruleName: string, rule: EraDataRule[string], logger: EraRuleLogger) {
    // 获取规则的循环次数，默认为1，最大值为1000
    const ruleLoopCount = Math.max(1, Math.min(rule.loop ?? 1, MAX_LOOP_COUNT));

    // 1. 展开 Scope (基于 rule.path)
    // 使用 DSLHandler 的工具获取所有匹配的路径
    const targets = DSLHandler.getValue(data, rule.path);

    if (!Array.isArray(targets) || targets.length === 0) return;

    // 2. 遍历每个具体目标 (Context)
    for (const target of targets) {
      const currentPath = target.path;
      const wildcardValues = extractWildcardValues(rule.path, currentPath);

      // 规则级别的循环处理
      for (let loopIndex = 0; loopIndex < ruleLoopCount; loopIndex++) {

        // --- 1. Rule Level IF Check ---
        let isRuleConditionMet = true;
        if (rule.if) {
          // 注入上下文：将 rule.if 表达式中的 * 替换为当前 Scope 的具体值
          const concreteRuleIf = injectWildcards(rule.if, wildcardValues);
          const ifRes = DSLHandler.execute(concreteRuleIf, data);

          // 判断条件是否满足
          isRuleConditionMet = ifRes.success && Array.isArray(ifRes.value) && ifRes.value.length > 0
            ? ifRes.value[0].value
            : false;
        }

        // --- 2. Handle 处理 (仅当 Rule IF 满足时执行) ---
        if (isRuleConditionMet && rule.handle) {
          const sortedHandles = Object.entries(rule.handle)
            .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));

          for (const [handleKey, handleCfg] of sortedHandles) {
            const loopCount = Math.max(1, Math.min(handleCfg.loop ?? 1, MAX_LOOP_COUNT));

            for (let i = 0; i < loopCount; i++) {
              // 注入上下文
              const concreteIf = handleCfg.if ? injectWildcards(handleCfg.if, wildcardValues) : null;
              const concreteOp = injectWildcards(handleCfg.op, wildcardValues);

              // Check Handle If
              if (concreteIf) {
                const ifRes = DSLHandler.execute(concreteIf, data);
                const isTrue = ifRes.success && Array.isArray(ifRes.value) && ifRes.value.length > 0
                  ? ifRes.value[0].value
                  : false;

                if (!isTrue) break; // 条件不满足，跳出 handle 循环
              }

              // Execute Op
              const opRes = DSLHandler.execute(concreteOp, data);
              if (opRes.success && Array.isArray(opRes.value)) {
                opRes.value.forEach(v => {
                  logger.add({
                    ruleName,
                    path: v.path || currentPath,
                    action: 'handle',
                    success: true,
                    message: `[${handleKey}] Loop ${i + 1}/${loopCount} (Rule loop ${loopIndex + 1}/${ruleLoopCount})`,
                    changes: { from: '?', to: v.value }
                  });
                });
              }
            }
          }
        }

        // --- 3. Limit & Range 处理 ---
        // 逻辑：如果 Rule IF 满足，则执行；
        // 如果 Rule IF 不满足，但这是第一次循环（loopIndex === 0），也执行一次（确保 range/limit 至少生效一次）
        if (isRuleConditionMet || loopIndex === 0) {

          // --- Limit 处理 (基于 Snap 的 Delta 限制) ---
          if (rule.limit && rule.limit.length === 2) {
            // 重新获取当前值（因为 Handle 可能修改了它）
            const newVal = DSLHandler.getValue(data, currentPath);
            // 获取 Snap 值
            const snapVal = DSLHandler.getValue(snap, currentPath);

            const currentV = (Array.isArray(newVal) && newVal.length > 0) ? newVal[0].value : undefined;
            const snapV = (Array.isArray(snapVal) && snapVal.length > 0) ? snapVal[0].value : undefined;

            if (typeof currentV === 'number' && typeof snapV === 'number') {
              const [minDelta, maxDelta] = rule.limit;
              const delta = currentV - snapV;
              let limitedDelta = delta;

              if (delta > maxDelta) limitedDelta = maxDelta;
              if (delta < minDelta) limitedDelta = minDelta;

              if (limitedDelta !== delta) {
                const finalVal = snapV + limitedDelta;
                DSLHandler.setValue(data, currentPath, finalVal);
                logger.add({
                  ruleName,
                  path: currentPath,
                  action: 'limit',
                  success: true,
                  message: `Delta ${delta} limited to [${minDelta}, ${maxDelta}] (Rule loop ${loopIndex + 1}/${ruleLoopCount})`,
                  changes: { from: currentV, to: finalVal }
                });
              }
            }
          }

          // --- Range 处理 (绝对值范围限制) ---
          if (rule.range && rule.range.length === 2) {
            const valRes = DSLHandler.getValue(data, currentPath);
            const currentV = (Array.isArray(valRes) && valRes.length > 0) ? valRes[0].value : undefined;

            if (typeof currentV === 'number') {
              const [min, max] = rule.range;
              const clamped = Math.max(min, Math.min(currentV, max));

              if (clamped !== currentV) {
                DSLHandler.setValue(data, currentPath, clamped);
                logger.add({
                  ruleName,
                  path: currentPath,
                  action: 'range',
                  success: true,
                  message: `Value clamped to [${min}, ${max}] (Rule loop ${loopIndex + 1}/${ruleLoopCount})`,
                  changes: { from: currentV, to: clamped }
                });
              }
            }
          }
        }

        // --- 4. 终止循环 ---
        // 如果 Rule IF 不满足，在执行完（可能的）一次 limit/range 后，终止循环
        if (!isRuleConditionMet) {
          break;
        }
      }
    }
  },

  /**
   * 测试 DSL 语法 (辅助工具)
   */
  testDsl(data: any, expr: string): string {
    const res = DSLHandler.execute(expr, data);
    if (!res.success) return `Error: ${res.error}`;
    return JSON.stringify(res.value, null, 2);
  }
};
