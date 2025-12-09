<template>
  <div>
    <button @click="testDSLExpression">测试DSL</button>
  </div>
</template>
<script setup lang="ts">

import { createEvalContext } from '../../../Utils/DSLHandler/utils';
import { DSLEngine } from '../../../Utils/DSLHandler/dsl-engine';
import { eraLogger } from '../../utils/EraHelperLogger';

/**
 * 测试 DSL 表达式
 */
const testDSLExpression = ()=> {
  const testData = {
    角色: {
      角色A: {
        特殊状态: {
          好感度: 50
        }
      },
      角色B: {
        特殊状态: {
          好感度: 30
        }
      }
    }
  };

  const snapshot = JSON.parse(JSON.stringify(testData));
  const context = createEvalContext(testData, snapshot, '角色.角色A.特殊状态.好感度');

  // 测试条件表达式
  const ifExpr = '<<if> $[角色.角色A.特殊状态.好感度] ?[>=] &[{num}40]>';
  const result = DSLEngine.evaluateIf(ifExpr, context);
  eraLogger.log('条件表达式结果:', result); // { success: true, value: true }

  // 测试操作表达式
  const opExpr = '<<op> $[角色.角色A.特殊状态.好感度] #[+] &[{num}10]>';
  const opResult = DSLEngine.evaluateOp(opExpr, context);
  eraLogger.log('操作表达式结果:', opResult); // { success: true, value: 60 }
}
</script>
