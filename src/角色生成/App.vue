<template>
  <ChronicleFrame title="角色档案" subtitle="旅途人物">
    <!-- 卡片内容 -->
    <div class="card-content">
      <!-- 角色选择器 (多目标时显示) -->
      <div v-if="characterNames.length > 0" class="tab-controller">
        <button
          v-for="name in characterNames"
          :key="name"
          type="button"
          class="tab-btn"
          :aria-pressed="currentCharacterName === name"
          :class="{ active: currentCharacterName === name }"
          @click="currentCharacterName = name"
        >
          <span class="icon">▧</span> {{ name }}
        </button>
      </div>

      <!-- 实体详细数据展示 -->
      <transition name="fade-slide" mode="out-in">
        <div v-if="currentCharacter" :key="currentCharacterName" class="data-view">
          <!-- 头部信息与操作区 -->
          <div class="profile-header">
            <div class="profile-info">
              <h3 class="char-name">{{ currentCharacter.姓名 }}</h3>
              <p class="char-intro">{{ currentCharacter.简介 }}</p>
              <div class="tag-list">
                <span v-for="tag in currentCharacter.性格标签" :key="tag" class="tag">#{{ tag }}</span>
              </div>
            </div>
            <div class="profile-actions">
              <button
                type="button"
                class="action-btn record-btn"
                :aria-pressed="isRecorded"
                :class="{ 'is-recorded': isRecorded }"
                @click="recordCharacter"
              >
                <span class="btn-icon">{{ isRecorded ? '✔' : '⭳' }}</span>
                <span class="btn-text">{{ isRecorded ? '取消收录' : '记录该角色' }}</span>
              </button>
              <div v-if="!isRecorded" class="location-hint">将绑定至: [ {{ currentMapIndex }} ]</div>
            </div>
          </div>

          <!-- 核心数据区：单栏流式布局 -->
          <div class="core-data-layout">
            <!-- 异常/特殊状态 (提至全局警告区) -->
            <div
              v-if="currentCharacter.特殊状态 && Object.keys(currentCharacter.特殊状态).length > 0"
              class="data-box status-box"
            >
              <div class="box-header">
                <span class="box-icon"></span>
                <h4>异常 / 特殊状态</h4>
              </div>
              <div class="status-list">
                <div v-for="(status, statusName) in currentCharacter.特殊状态" :key="statusName" class="status-item">
                  <div class="status-name">⚠ {{ statusName }}</div>
                  <div class="status-desc">{{ status.描述 }}</div>
                  <div class="status-meta">
                    <span class="meta-label">效果:</span> {{ status.效果 }}<br />
                    <span class="meta-label">持续:</span> {{ status.持续时间 }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 详情面板 (包含基础参数、学识、技能) -->
            <div class="data-box detail-tabs-box">
              <!-- 详情子标签页 -->
              <div class="sub-tab-controller">
                <button
                  type="button"
                  class="sub-tab"
                  :class="{ active: currentDetailTab === '基础参数' }"
                  :aria-pressed="currentDetailTab === '基础参数'"
                  @click="currentDetailTab = '基础参数'"
                >
                  <span class="tab-icon">⟡</span> 基础参数
                </button>
                <button
                  type="button"
                  class="sub-tab"
                  :class="{ active: currentDetailTab === '神秘学识' }"
                  :aria-pressed="currentDetailTab === '神秘学识'"
                  @click="currentDetailTab = '神秘学识'"
                >
                  <span class="tab-icon">✧</span> 神秘学识
                </button>
                <button
                  type="button"
                  class="sub-tab"
                  :class="{ active: currentDetailTab === '掌握技能' }"
                  :aria-pressed="currentDetailTab === '掌握技能'"
                  @click="currentDetailTab = '掌握技能'"
                >
                  <span class="tab-icon">⎈</span> 掌握技能
                </button>
              </div>

              <!-- 分页内容区 -->
              <div class="tab-content-area">
                <transition name="fade" mode="out-in">
                  <!-- 分页 1: 基础参数 (生命状态 + 基础数值) -->
                  <div v-if="currentDetailTab === '基础参数'" key="tab-attr" class="tab-pane">
                    <!-- 1.1 生命状态 -->
                    <div class="inner-section">
                      <div class="section-header">
                        <span class="box-icon"></span>
                        <h4>生命体征</h4>
                      </div>
                      <div class="vitals-list">
                        <div v-for="(stat, key) in currentCharacter.生命状态" :key="key" class="vital-item">
                          <div class="vital-labels">
                            <span class="vital-name">{{ key }}</span>
                            <span class="vital-value" :class="getVitalColorClass(key)">
                              {{ stat.当前 }} / {{ stat.最大值 }}
                            </span>
                          </div>
                          <div class="progress-bg">
                            <div
                              class="progress-fill"
                              :class="'fill-' + getVitalColorClass(key)"
                              :style="{ width: getPercentage(stat) + '%' }"
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 分割线 -->
                    <div class="section-divider"></div>

                    <!-- 1.2 基础数值 (7维) -->
                    <div class="inner-section">
                      <div class="section-header">
                        <span class="box-icon"></span>
                        <h4>核心属性</h4>
                      </div>
                      <div class="attr-grid">
                        <div v-for="(val, key) in currentCharacter.基础数值" :key="key" class="attr-item">
                          <div class="attr-label">{{ key }}</div>
                          <div class="attr-value">{{ val }}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 分页 2: 神秘学识 -->
                  <div v-else-if="currentDetailTab === '神秘学识'" key="tab-arts" class="tab-pane">
                    <div class="arts-container">
                      <div
                        v-if="!currentCharacter.术之等级 || Object.keys(currentCharacter.术之等级).length === 0"
                        class="empty-hint"
                      >
                        [ 未检测到神秘学识波动 ]
                      </div>
                      <div v-for="(data, artName) in currentCharacter.术之等级" :key="artName" class="art-badge">
                        <div class="art-name">{{ artName }}</div>
                        <div class="art-level">Lv.{{ data.等级 }}</div>
                        <div class="art-exp">EXP: {{ data.经验 }}</div>
                      </div>
                    </div>
                  </div>

                  <!-- 分页 3: 技能列表 -->
                  <div v-else-if="currentDetailTab === '掌握技能'" key="tab-skills" class="tab-pane">
                    <div class="skills-list">
                      <div
                        v-if="!currentCharacter.技能 || Object.keys(currentCharacter.技能).length === 0"
                        class="empty-hint"
                      >
                        [ 暂无技能情报 ]
                      </div>
                      <div v-for="(skill, skillName) in currentCharacter.技能" :key="skillName" class="skill-item">
                        <div class="skill-header">
                          <span class="skill-name"
                            >{{ skillName }} <span class="skill-level">Lv.{{ skill.技能等级 }}</span></span
                          >
                          <span class="skill-aspect">[{{ skill.性相 }}]</span>
                        </div>
                        <div class="skill-desc">{{ skill.描述 }}</div>
                        <div class="skill-meta">
                          <span class="meta-label">消耗:</span> {{ skill.消耗 }} | <span class="meta-label">作用:</span>
                          {{ skill.作用 }}
                        </div>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </ChronicleFrame>
</template>

<script setup>
import ChronicleFrame from '../尘史使徒/UI/components/common/ChronicleFrame.vue';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { MvuUtil } from '@/Utils/MvuUtil';

// 1. 获取注入的 JSON 数据
const rawJson = $1 || {};

// 2. 状态管理
const characterNames = Object.keys(rawJson);
const currentCharacterName = ref(characterNames.length > 0 ? characterNames[0] : null);
const globalMvuData = ref(null);

// 详情面板的子标签页状态
const currentDetailTab = ref('基础参数');

// 监听角色切换，自动重置子标签页到“基础参数”
watch(currentCharacterName, () => {
  currentDetailTab.value = '基础参数';
});

// 3. 获取全局 Mvu 数据的辅助函数
const fetchGlobalData = () => {
  globalMvuData.value = Mvu.getMvuData({ type: 'message', message_id: -1 });
};

// 监听全局变量更新事件
const handleMvuUpdate = e => {
  if (e.detail && e.detail.newData) {
    globalMvuData.value = e.detail.newData;
  } else {
    fetchGlobalData();
  }
};

onMounted(() => {
  fetchGlobalData();
  addEventListener('mag_variable_update_ended', handleMvuUpdate);
});

onUnmounted(() => {
  removeEventListener('mag_variable_update_ended', handleMvuUpdate);
});

// 4. 计算属性
const currentCharacter = computed(() => {
  if (!currentCharacterName.value) return null;
  return rawJson[currentCharacterName.value];
});

const currentMapIndex = computed(() => {
  return globalMvuData.value?.stat_data?.世界?.地图索引 || '未知区域';
});

const isRecorded = computed(() => {
  if (!currentCharacterName.value || !globalMvuData.value) return false;
  const minorChars = globalMvuData.value.stat_data?.角色?.次要角色 || {};
  return !!minorChars[currentCharacterName.value];
});

// 5. 核心方法：记录/取消记录角色
const recordCharacter = async () => {
  if (!currentCharacter.value) return;

  let diffObj = {};

  if (isRecorded.value) {
    // === 取消记录逻辑 ===
    // 将对应的角色 key 设置为 null 以删除
    diffObj = {
      角色: {
        次要角色: {
          [currentCharacterName.value]: null,
        },
      },
    };
  } else {
    // === 记录角色逻辑 ===
    const charDataToSave = JSON.parse(JSON.stringify(currentCharacter.value));
    charDataToSave.区域检索词 = [currentMapIndex.value];
    charDataToSave.在场 = true;

    diffObj = {
      角色: {
        次要角色: {
          [currentCharacterName.value]: charDataToSave,
        },
      },
    };
  }

  try {
    await MvuUtil.updateMvuDataByDiff(diffObj);
    // 稍微延迟刷新以确保本地状态同步
    setTimeout(fetchGlobalData, 100);
  } catch (error) {
    console.error('更新角色档案失败:', error);
  }
};

// 6. UI 辅助函数
const getPercentage = stat => {
  if (!stat || stat.最大值 === 0) return 0;
  const percent = (stat.当前 / stat.最大值) * 100;
  return Math.max(0, Math.min(100, percent));
};

const getVitalColorClass = key => {
  if (key === '生命') return 'red';
  if (key === '体力') return 'gold';
  if (key === '精神') return 'blue';
  return 'gray';
};
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

.profile-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--c-border);
}
.profile-info {
  flex: 1;
  min-width: 0;
}
.char-name {
  margin: 0 0 12px;
  color: var(--c-gold);
  font: 500 1.5rem var(--font-title);
  letter-spacing: 0.12em;
}
.char-intro {
  margin: 0 0 14px;
  color: var(--c-text-main);
  line-height: 1.8;
  font-size: 0.9rem;
  white-space: pre-wrap;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag {
  padding: 3px 8px;
  border: 1px solid var(--c-border);
  color: var(--c-text-dim);
  font-size: 0.75rem;
}
.profile-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  max-width: 100%;
}
.action-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--c-gold);
  background: var(--c-hover-bg);
  color: var(--c-gold);
}
.action-btn:hover {
  background: rgba(164, 139, 87, 0.18);
}
.action-btn.is-recorded {
  border-color: var(--c-border);
  color: var(--c-text-dim);
}
.action-btn.is-recorded:hover {
  border-color: var(--c-accent-danger);
  color: var(--c-accent-danger);
}
.location-hint {
  color: var(--c-text-dim);
  font-size: 0.75rem;
  line-height: 1.6;
}
.core-data-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.section-divider {
  height: 1px;
  margin: 24px 0;
  background: var(--c-border);
}
.detail-tabs-box {
  padding: 0;
}
.sub-tab-controller {
  display: flex;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--c-border);
}
.sub-tab {
  flex: 1 1 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 13px 8px;
  border: 0;
  border-bottom: 2px solid transparent;
  color: var(--c-text-dim);
  background: transparent;
  font-size: 0.85rem;
}
.sub-tab.active {
  color: var(--c-gold);
  border-bottom-color: var(--c-gold);
  background: var(--c-hover-bg);
}
.tab-content-area {
  padding: 20px;
}
.vitals-list {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
}
.skills-list,
.status-list {
  display: grid;
  gap: 12px;
}
.skill-item,
.status-item {
  min-width: 0;
  padding: 14px;
  background: rgba(255, 255, 255, 0.025);
  border-left: 2px solid var(--c-gold);
}
.skill-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.skill-name {
  color: var(--c-gold);
  font-family: var(--font-title);
}
.skill-level {
  margin-left: 6px;
  color: var(--c-text-dim);
  font-size: 0.8rem;
}
.skill-aspect {
  color: var(--c-gold);
  font-size: 0.8rem;
}
.skill-desc,
.status-desc {
  margin-bottom: 8px;
  color: var(--c-text-main);
  font-size: 0.9rem;
  line-height: 1.8;
  white-space: pre-wrap;
}
.skill-meta,
.status-meta {
  color: var(--c-text-dim);
  font-size: 0.8rem;
  line-height: 1.7;
}
.meta-label {
  color: var(--c-gold);
}
.status-item {
  border-left-color: var(--c-accent-danger);
}
.status-name {
  margin-bottom: 8px;
  color: var(--c-accent-danger);
  font-family: var(--font-title);
}
@media (max-width: 600px) {
  .profile-header {
    flex-direction: column;
    gap: 16px;
  }
  .profile-actions {
    align-items: flex-start;
  }
  .tab-content-area {
    padding: 14px;
  }
  .detail-tabs-box {
    padding: 0;
  }
}
</style>
