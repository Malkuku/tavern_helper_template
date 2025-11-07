<template>
  <div class="character-panel" :class="theme">
    <div v-if="visible" class="info-card">
      <!-- 头部 -->
      <div class="card-header">
        <h2 class="card-title">{{ name }}</h2>
        <div class="page-tabs">
          <button
            v-for="p in [1,2,3,4,5]"
            :key="p"
            :class="['tab-btn', {active: page===p}]"
            @click="page=p"
          >{{ tabTitle(p) }}</button>
        </div>
      </div>

      <!-- 加载 -->
      <div v-if="!character" class="loading-state">
        <div class="loading-spinner"></div>
        <p>正在加载角色信息...</p>
      </div>

      <!-- 内容区 -->
      <div v-else class="content-wrapper">
        <!-- ===== 第1页：好感度 + 想法 ===== -->
        <div v-show="page===1">
          <section class="section">
            <h3 class="section-title">特殊状态</h3>
            <!-- 好感度 -->
            <div class="status-card">
              <div class="status-label">
                <span class="icon">💕</span><span>好感度</span>
              </div>
              <div class="status-value">{{ affection }}</div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{width:affectionPercent}"></div>
              </div>
              <div class="progress-label">{{ affectionPercent }}</div>
              <div v-if="affectionReason" class="status-reason">{{ affectionReason }}</div>
            </div>
          </section>

          <section class="section">
            <h3 class="section-title">当前想法</h3>
            <div class="thought-box">
              <p class="thought-content">{{ currentThought||'...' }}</p>
            </div>
          </section>
        </div>

        <!-- ===== 第2页：服装 ===== -->
        <div v-show="page===2">
          <section class="section">
            <h3 class="section-title">当前服装</h3>
            <div class="single-col">
              <div v-for="(item,key) in clothing" :key="key" class="info-row">
                <span class="info-key">{{ key }}</span>
                <span class="info-val">{{ item||'无' }}</span>
              </div>
            </div>
          </section>
        </div>

        <!-- ===== 第3页：身体状态（含开发等级 + 描述） ===== -->
        <div v-show="page===3">
          <section class="section">
            <h3 class="section-title">身体状态</h3>

            <!-- 大圆环网格 -->
            <div class="level-big-grid">
              <div
                v-for="(lv, part) in devLevel"
                :key="part"
                class="level-big-item"
              >
                <!-- 圆环 -->
                <div class="level-circle-big">
                  <svg viewBox="0 0 36 36" class="level-svg-big">
                    <path class="level-bg-big"
                          d="M18 2.084 a 15.916 15.916 0 0 1 0 31.832 a 15.916 15.916 0 0 1 0 -31.832"/>
                    <path class="level-fg-big"
                          :stroke-dasharray="devCircleDash(part)"
                          d="M18 2.084 a 15.916 15.916 0 0 1 0 31.832 a 15.916 15.916 0 0 1 0 -31.832"/>
                  </svg>
                  <div class="level-text-big">
                    <span class="level-num-big">{{ lv }}</span>
                    <span class="level-small-big">Lv.</span>
                  </div>
                </div>

                <!-- 部位名 + 经验 + 描述 -->
                <div class="level-info">
                  <div class="level-part">{{ part }}</div>
                  <div class="level-exp">
                    {{ devExp[part]||0 }} / {{ expNeed(lv) }}
                  </div>
                  <div class="level-desc">{{ devDesc[part]||'暂无描述' }}</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- ===== 第4页：性交次数 ===== -->
        <div v-show="page===4">
          <section class="section">
            <h3 class="section-title">性交次数</h3>
            <DataTable
              :data="sexData"
              :page-size="15"
              empty-text="暂无记录"
            />
          </section>
        </div>

        <!-- ===== 第5页：调教回忆 ===== -->
        <div v-show="page===5">
          <section class="section">
            <h3 class="section-title">调教回忆</h3>
            <DataTable
              :data="trainingData"
              :page-size="15"
              empty-text="暂无回忆"
            />
          </section>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <p>该角色还未出场</p>
      <div class="empty-icon">👧⛏️🤵</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import DataTable from './DataTable.vue';

/* ===== props ===== */
const props = defineProps<{
  name: string                    // 角色名
  theme: 'light'|'dark'
  character?: {
    已出场?: boolean
    特殊状态: {
      好感度: number
      好感度变化原因?: string
      开发经验值?: Record<string, number>
    }
    服装: Record<string, string>
    身体开发描述?: Record<string, string>
    当前想法?: string
  }
  devLevel: Record<string, number>   // 身体开发等级
  sexData?: Record<string, any>   // 性交次数
  trainingData?: Record<string, any> // 调教回忆
}>()

/* ===== 基础 ===== */
const page = ref(1)
const visible = computed(()=> props.character?.已出场)
function tabTitle(p: number) {
  const titles = ['特殊状态', '服装', '身体状态', '性交次数', '调教回忆']
  return titles[p - 1]
}

/* ===== 计算 ===== */
const affection = computed(()=> props.character?.特殊状态.好感度 ?? 0)
const affectionReason = computed(()=> props.character?.特殊状态.好感度变化原因)
const currentThought = computed(()=> props.character?.当前想法)
const clothing = computed(()=> props.character?.服装 || {})
const devExp = computed(()=> props.character?.特殊状态.开发经验值 || {})
const devDesc = computed(()=> props.character?.身体开发描述 || {})

/* 好感度百分比（按最高阶段算） */
const affectionPercent = computed(()=>{
  // 这里仅示例：取 1000 为满值，可在外部传入阶段表再精确计算
  return `${Math.min(100, Math.round((affection.value / 1000) * 100))}%`
})

/* 经验值需求 */
function expNeed(lv:number){
  return Math.floor(7 * Math.log(lv + 1) + 5)
}

/* 圆环进度 */
function devCircleDash(part:string){
  const lv = props.devLevel[part] || 0
  const exp = devExp.value[part] || 0
  const need = expNeed(lv)
  const percent = Math.min(100, (exp / need) * 100)
  return `${percent}, 100`
}
</script>

<style lang="scss" scoped>
/* ========== 粉色 & 深紫色主题变量 ========== */
.character-panel {
  --bg-primary: #fff0f5;
  --bg-secondary: #ffe4e6;
  --bg-tertiary: #ffdce0;
  --text-primary: #3e1f47;
  --text-secondary: #6d4b7d;
  --text-tertiary: #9a7aa0;
  --border-color: #d8bfd8;
  --shadow: 0 2px 12px rgba(142, 92, 184, 0.08);
  --accent: #ff66b3;
  --accent-hover: #ff4da6;
  --radius: 12px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.character-panel.dark {
  --bg-primary: #2c1b3d;
  --bg-secondary: #24162f;
  --bg-tertiary: #1a1025;
  --text-primary: #ffd1e8;
  --text-secondary: #d9a7c1;
  --text-tertiary: #a87e9e;
  --border-color: #4a3a5b;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  --accent: #ff66b3;
  --accent-hover: #ff4da6;
}

/* ========== 以下结构与之前完全一致，仅类名调整为 character-panel ========== */
.character-panel {
  padding: 24px;
  min-height: 100%;
  background: var(--bg-secondary);
  transition: var(--transition);
}

.info-card {
  background: var(--bg-primary);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  max-width: 900px;
  margin: 0 auto;
}

.card-header {
  padding: 24px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.card-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.page-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: var(--transition);
}

.tab-btn.active {
  background: white;
  color: var(--accent);
}

.content-wrapper {
  padding: 24px;
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--border-color);
}

.status-card {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--border-color);
  transition: var(--transition);
}

.status-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
  border-color: var(--accent);
}

.status-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  font-weight: 500;
}

.status-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 8px;
}

.progress-bar {
  width: 80%;
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  margin: 8px auto 4px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #ff6090);
  transition: width 0.4s ease;
}

.progress-label {
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
  margin-top: 4px;
}

.status-reason {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.4;
  margin-top: 6px;
}

.thought-box {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--border-color);
  position: relative;
}

.thought-box::before {
  content: '"';
  position: absolute;
  top: -10px;
  left: 16px;
  font-size: 48px;
  color: var(--accent);
  opacity: 0.3;
}

.thought-content {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-secondary);
  font-style: italic;
  padding-left: 20px;
}

.single-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px 16px;
  font-size: 15px;
}

.info-key {
  color: var(--text-secondary);
}

.info-val {
  font-weight: 500;
  color: var(--text-primary);
}

/* 大圆环 */
.level-big-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 24px;
  margin-top: 12px;
}

.level-big-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 20px;
  transition: var(--transition);
}

.level-big-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
  border-color: var(--accent);
}

.level-circle-big {
  position: relative;
  width: 90px;
  height: 90px;
  margin-bottom: 12px;
}

.level-svg-big {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.level-bg-big {
  fill: none;
  stroke: var(--border-color);
  stroke-width: 3.8;
}

.level-fg-big {
  fill: none;
  stroke: var(--accent);
  stroke-width: 3.8;
  stroke-linecap: round;
  transition: stroke-dasharray 0.4s ease;
}

.level-text-big {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  line-height: 1;
}

.level-num-big {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
}

.level-small-big {
  font-size: 11px;
  color: var(--text-secondary);
}

.level-info {
  text-align: center;
}

.level-part {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.level-exp {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}

.level-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  max-width: 120px;
}

.loading-state,
.empty-state {
  padding: 48px;
  text-align: center;
  color: var(--text-secondary);
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent);
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .page-tabs {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
  }

  .tab-btn {
    flex: 1 1 auto;
    min-width: 64px;          /* 保证最小可点击区域 */
    white-space: normal;      /* 允许文字换行 */
    line-height: 1.2;
    padding: 6px 10px;
    font-size: 13px;
    text-align: center;
    word-break: keep-all;     /* 优先在空格处断行 */
  }
}

/* 深色模式滚动条（保持统一） */
.character-panel.dark ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.character-panel.dark ::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}
.character-panel.dark ::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}
.character-panel.dark ::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
