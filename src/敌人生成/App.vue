<template>
  <ChronicleFrame title="路遇险敌" subtitle="敌情档案">
    <!-- 卡片内容 -->
    <div class="card-content">
      <!-- 敌人选择器 (多目标时显示) -->
      <div v-if="enemyNames.length > 0" class="tab-controller">
        <button
          v-for="name in enemyNames"
          :key="name"
          type="button"
          class="tab-btn"
          :aria-pressed="currentEnemyName === name"
          :class="{ active: currentEnemyName === name }"
          @click="currentEnemyName = name"
        >
          <span class="icon">▧</span> {{ name }}
        </button>
      </div>

      <!-- 实体详细数据展示 -->
      <transition name="fade-slide" mode="out-in">
        <div v-if="currentEnemy" :key="currentEnemyName" class="data-view">
          <div class="data-grid-layout">
            <!-- 模块 1: 生命状态 -->
            <div class="data-box vitals-box">
              <div class="box-header">
                <span class="box-icon"></span>
                <h4>生命体征</h4>
              </div>
              <div class="vitals-list">
                <!-- 生命 -->
                <div class="vital-item">
                  <div class="vital-labels">
                    <span class="vital-name">生命</span>
                    <span class="vital-value red"
                      >{{ currentEnemy.生命状态.生命.当前 }} / {{ currentEnemy.生命状态.生命.最大值 }}</span
                    >
                  </div>
                  <div class="progress-bg">
                    <div
                      class="progress-fill fill-red"
                      :style="{ width: getPercentage(currentEnemy.生命状态.生命) + '%' }"
                    ></div>
                  </div>
                </div>
                <!-- 体力 -->
                <div class="vital-item">
                  <div class="vital-labels">
                    <span class="vital-name">体力</span>
                    <span class="vital-value gold"
                      >{{ currentEnemy.生命状态.体力.当前 }} / {{ currentEnemy.生命状态.体力.最大值 }}</span
                    >
                  </div>
                  <div class="progress-bg">
                    <div
                      class="progress-fill fill-gold"
                      :style="{ width: getPercentage(currentEnemy.生命状态.体力) + '%' }"
                    ></div>
                  </div>
                </div>
                <!-- 精神 -->
                <div class="vital-item">
                  <div class="vital-labels">
                    <span class="vital-name">精神</span>
                    <span class="vital-value gray"
                      >{{ currentEnemy.生命状态.精神.当前 }} / {{ currentEnemy.生命状态.精神.最大值 }}</span
                    >
                  </div>
                  <div class="progress-bg">
                    <div
                      class="progress-fill fill-gray"
                      :style="{ width: getPercentage(currentEnemy.生命状态.精神) + '%' }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 模块 2: 基础数值 -->
            <div class="data-box attributes-box">
              <div class="box-header">
                <span class="box-icon"></span>
                <h4>基础参数</h4>
              </div>
              <div class="attr-grid">
                <div v-for="(val, key) in currentEnemy.基础数值" :key="key" class="attr-item">
                  <div class="attr-label">{{ key }}</div>
                  <div class="attr-value">{{ val }}</div>
                </div>
              </div>
            </div>

            <!-- 模块 3: 术之等级 -->
            <div class="data-box arts-box">
              <div class="box-header">
                <span class="box-icon"></span>
                <h4>神秘学识</h4>
              </div>
              <div class="arts-container">
                <div v-if="entries(currentEnemy.术之等级).length === 0" class="empty-hint">
                  [ 未检测到神秘学识波动 ]
                </div>
                <div v-for="(data, artName) in currentEnemy.术之等级" :key="artName" class="art-badge">
                  <div class="art-name">{{ artName }}</div>
                  <div class="art-level">Lv.{{ data.等级 }}</div>
                  <div class="art-exp">经验: {{ data.经验 }}</div>
                </div>
              </div>
            </div>

            <!-- 模块 4: 战斗策略 -->
            <div class="data-box strategy-box">
              <div class="box-header">
                <span class="box-icon"></span>
                <h4>行为预测</h4>
              </div>
              <div class="strategy-content">
                <ol v-if="currentEnemy.战斗策略?.length" class="strategy-list">
                  <li v-for="item in currentEnemy.战斗策略" :key="item">{{ item }}</li>
                </ol>
                <p v-else class="empty-hint">[ 暂无可用战术情报 ]</p>
              </div>
            </div>

            <!-- 模块 5: 特殊状态 -->
            <div class="data-box detail-box">
              <div class="box-header">
                <span class="box-icon"></span>
                <h4>特殊状态</h4>
              </div>
              <div v-if="entries(currentEnemy.特殊状态).length" class="record-list">
                <article
                  v-for="([name, state], index) in entries(currentEnemy.特殊状态)"
                  :key="name"
                  class="record-item"
                >
                  <div class="record-heading">
                    <strong>{{ name }}</strong
                    ><span>状态 {{ index + 1 }}</span>
                  </div>
                  <p>{{ state.描述 }}</p>
                  <dl>
                    <div>
                      <dt>效果</dt>
                      <dd>{{ state.效果 }}</dd>
                    </div>
                    <div>
                      <dt>持续</dt>
                      <dd>{{ state.持续时间 }}</dd>
                    </div>
                  </dl>
                </article>
              </div>
              <div v-else class="empty-hint">[ 无特殊状态 ]</div>
            </div>

            <!-- 模块 6: 装备 -->
            <div class="data-box detail-box">
              <div class="box-header">
                <span class="box-icon"></span>
                <h4>装备</h4>
              </div>
              <div v-if="entries(currentEnemy.装备).length" class="record-list">
                <article v-for="([name, item], index) in entries(currentEnemy.装备)" :key="name" class="record-item">
                  <div class="record-heading">
                    <strong>{{ name }}</strong
                    ><span>装备 {{ index + 1 }}</span>
                  </div>
                  <p>{{ item.描述 }}</p>
                  <dl>
                    <div>
                      <dt>作用</dt>
                      <dd>{{ item.作用 }}</dd>
                    </div>
                  </dl>
                </article>
              </div>
              <div v-else class="empty-hint">[ 未携带可识别装备 ]</div>
            </div>

            <!-- 模块 7: 技能 -->
            <div class="data-box skills-box">
              <div class="box-header">
                <span class="box-icon"></span>
                <h4>技能</h4>
              </div>
              <div v-if="entries(currentEnemy.技能).length" class="skill-grid">
                <article v-for="[name, skill] in entries(currentEnemy.技能)" :key="name" class="record-item">
                  <div class="record-heading">
                    <strong>{{ name }}</strong
                    ><span>{{ skill.性相 }} · Lv.{{ skill.技能等级 ?? 0 }}</span>
                  </div>
                  <p>{{ skill.描述 }}</p>
                  <dl>
                    <div>
                      <dt>消耗</dt>
                      <dd>{{ skill.消耗 }}</dd>
                    </div>
                    <div>
                      <dt>作用</dt>
                      <dd>{{ skill.作用 }}</dd>
                    </div>
                  </dl>
                </article>
              </div>
              <div v-else class="empty-hint">[ 未检测到可用技能 ]</div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </ChronicleFrame>
</template>

<script setup>
import ChronicleFrame from '../尘史使徒/UI/components/common/ChronicleFrame.vue';
import { ref, computed } from 'vue';

// 1. 获取注入的 JSON 数据
const rawJson = $1;

// 2. 状态管理
const enemyNames = Object.keys(rawJson);
const currentEnemyName = ref(enemyNames.length > 0 ? enemyNames[0] : null);

// 3. 计算属性：获取当前选中的敌人数据
const currentEnemy = computed(() => {
  if (!currentEnemyName.value) return null;
  return rawJson[currentEnemyName.value];
});

// 4. 辅助函数：计算进度条百分比
const getPercentage = stat => {
  if (!stat || stat.最大值 === 0) return 0;
  const percent = (stat.当前 / stat.最大值) * 100;
  return Math.max(0, Math.min(100, percent)); // 限制在 0-100 之间
};

const entries = value => (value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : []);
</script>

<style scoped>
.card-content {
  padding: 20px;
  overflow-wrap: anywhere;
}
.tab-controller {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--c-border);
}
button {
  font: inherit;
  cursor: pointer;
}
.tab-btn {
  max-width: 100%;
  padding: 8px 14px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--c-text-dim);
  overflow-wrap: anywhere;
}
.tab-btn:hover,
.sub-tab:hover {
  background: var(--c-hover-bg);
  color: var(--c-text-main);
}
.tab-btn.active {
  border-color: var(--c-border);
  color: var(--c-gold);
  background: var(--c-hover-bg);
}
button:focus-visible {
  outline: 2px solid var(--c-gold);
  outline-offset: 3px;
}
.data-view,
.data-box {
  min-width: 0;
}
.data-box {
  padding: 18px;
  background: var(--chronicle-panel);
  border: 1px solid var(--c-border);
}
.box-header,
.section-header {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 16px;
}
.box-header {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--c-border);
}
.box-header h4,
.section-header h4 {
  margin: 0;
  color: var(--c-gold);
  font: 500 1rem var(--font-title);
  letter-spacing: 0.12em;
}
.box-icon {
  width: 4px;
  height: 4px;
  flex-shrink: 0;
  background: var(--c-gold);
  transform: rotate(45deg);
}
.vitals-list {
  display: grid;
  gap: 18px;
}
.vital-labels {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 0.85rem;
}
.vital-value {
  font-variant-numeric: tabular-nums;
}
.red {
  color: var(--c-accent-danger);
}
.gold {
  color: var(--c-gold);
}
.gray {
  color: var(--c-text-dim);
}
.blue {
  color: #8499af;
}
.progress-bg {
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}
.fill-red {
  background: var(--c-accent-danger);
}
.fill-gold {
  background: var(--c-gold);
}
.fill-gray {
  background: var(--c-text-dim);
}
.fill-blue {
  background: #8499af;
}
.attr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 100px), 1fr));
  gap: 10px;
}
.attr-item {
  padding: 12px 8px;
  border: 1px solid var(--c-border);
  text-align: center;
}
.attr-label {
  color: var(--c-text-dim);
  font-size: 0.8rem;
}
.attr-value {
  margin-top: 6px;
  color: var(--c-text-main);
  font: 500 1.35rem var(--font-title);
  font-variant-numeric: tabular-nums;
}
.arts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 130px), 1fr));
  gap: 12px;
}
.art-badge {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--c-border);
  text-align: center;
}
.art-name {
  margin-bottom: 8px;
  color: var(--c-text-main);
  font-family: var(--font-title);
}
.art-level {
  color: var(--c-gold);
  font-size: 0.9rem;
}
.art-exp {
  margin-top: 6px;
  color: var(--c-text-dim);
  font-size: 0.75rem;
}
.empty-hint {
  grid-column: 1 / -1;
  padding: 22px 0;
  text-align: center;
  color: var(--c-text-dim);
  font-size: 0.85rem;
}
.fade-slide-enter-active,
.fade-slide-leave-active,
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to,
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
@media (max-width: 480px) {
  .card-content {
    padding: 12px;
  }
  .data-box {
    padding: 14px;
  }
  .tab-btn {
    padding: 8px 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition: none !important;
  }
}

.data-grid-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.strategy-content p {
  margin: 0;
  color: var(--c-text-main);
  line-height: 1.8;
  white-space: pre-wrap;
}
.strategy-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 22px;
  color: var(--c-text-main);
  line-height: 1.65;
}
.strategy-list li::marker {
  color: var(--c-gold);
  font-variant-numeric: tabular-nums;
}
.skills-box {
  grid-column: 1 / -1;
}
.record-list,
.skill-grid {
  display: grid;
  gap: 12px;
}
.skill-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
}
.record-item {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--c-border);
}
.record-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.record-heading strong {
  color: var(--c-gold);
  font-family: var(--font-title);
}
.record-heading span {
  color: var(--c-text-dim);
  font-size: 0.75rem;
  text-align: right;
}
.record-item p {
  margin: 8px 0;
  color: var(--c-text-main);
  line-height: 1.6;
}
.record-item dl {
  display: grid;
  gap: 6px;
  margin: 0;
}
.record-item dl div {
  display: grid;
  grid-template-columns: 3.5em minmax(0, 1fr);
  gap: 8px;
}
.record-item dt {
  color: var(--c-text-dim);
}
.record-item dd {
  min-width: 0;
  margin: 0;
  color: var(--c-text-main);
  overflow-wrap: anywhere;
}
@media (max-width: 600px) {
  .data-grid-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .record-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
  .record-heading span {
    text-align: left;
  }
}
</style>
