<template>
  <div class="page-container page-relations">
    <div class="relationship-layout">
      <!-- 固定头部区域：标题、说明、Tab栏 -->
      <div class="header-area">
        <!-- 顶部标题与点数 -->
        <div class="header-section">
          <h3 class="section-title center">命运羁绊</h3>
          <div class="points-display">
            <span class="label">剩余点数</span>
            <span class="value" :class="{ 'text-danger': globalRemainingPoints < 0 }">{{ globalRemainingPoints }}</span>
          </div>
        </div>

        <p class="desc center">确立主要角色对你的初始态度与认知</p>

        <!-- 角色选择器 (横向滚动) -->
        <RelationshipTargetSelector
          :model-value="currentNpc.roleId"
          :targets="formData.relationships.map(item => item.roleId).filter(Boolean)"
          :options="relationshipOptions"
          editable
          :allow-add="formData.relationships.length < 2 && (isInfiniteMode || globalRemainingPoints >= 30)"
          @update:model-value="selectNpc"
          @add="addNpc"
          @remove="removeNpcByRole"
        />
      </div>

      <!-- 可滚动内容区域 -->
      <div class="scrollable-content">
        <!-- 关系编辑区域 -->
        <div v-if="formData.relationships.length > 0" class="relationship-editor">
          <!-- 角色基本信息配置 -->
          <div class="npc-config-row">
            <div class="input-group role-select">
              <label>羁绊对象选择</label>
              <select v-model="currentNpc.roleId" class="text-input" @change="onRoleSelect(currentNpc)">
                <option disabled value="">-- 请选择羁绊对象 --</option>
                <option v-for="role in availableMainRoles" :key="role.id" :value="role.id">
                  {{ role.id }}
                </option>
              </select>
            </div>
          </div>

          <!-- 选中角色的详情卡片 (性格预览) -->
          <div v-if="currentNpc.roleId" class="npc-details-card">
            <div class="detail-section">
              <span class="detail-label">外貌印象</span>
              <span class="detail-text">{{ getSelectedRoleDetails(currentNpc.roleId).appearance }}</span>
            </div>
            <div class="detail-section">
              <span class="detail-label">性格底色</span>
              <div class="tags-container">
                <span
                  v-for="(tag, idx) in getSelectedRoleDetails(currentNpc.roleId).personalityTags"
                  :key="idx"
                  class="tag"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>

          <!-- 矩阵滑块区域 -->
          <div class="matrix-container">
            <!-- 左列：情感与认知 -->
            <div class="matrix-col">
              <h4 class="matrix-title">情感与认知维度</h4>
              <div v-for="dim in emotionalDimensions" :key="dim.key" class="slider-group">
                <div class="slider-header">
                  <span class="slider-label">{{ dim.label }}</span>
                  <span class="slider-value-display" :class="getInertiaClass(currentNpc.matrix[dim.key])">
                    <span class="desc-text">
                      {{ getRangeDesc(dim.key, currentNpc.matrix[dim.key]) }}
                    </span>
                    <span class="value-num">{{ currentNpc.matrix[dim.key] }}</span>
                  </span>
                </div>
                <input
                  v-model.number="currentNpc.matrix[dim.key]"
                  type="range"
                  :min="dim.min"
                  :max="dim.max"
                  class="styled-slider"
                  :style="getSliderBackground(currentNpc.matrix[dim.key], dim.min, dim.max)"
                />
              </div>
            </div>

            <!-- 右列：认知与功利 -->
            <div class="matrix-col">
              <h4 class="matrix-title">认知与功利维度</h4>
              <div v-for="dim in utilitarianDimensions" :key="dim.key" class="slider-group">
                <div class="slider-header">
                  <span class="slider-label">{{ dim.label }}</span>
                  <span class="slider-value-display" :class="getInertiaClass(currentNpc.matrix[dim.key])">
                    <span class="desc-text">
                      {{ getRangeDesc(dim.key, currentNpc.matrix[dim.key]) }}
                    </span>
                    <span class="value-num">{{ currentNpc.matrix[dim.key] }}</span>
                  </span>
                </div>
                <input
                  v-model.number="currentNpc.matrix[dim.key]"
                  type="range"
                  :min="dim.min"
                  :max="dim.max"
                  class="styled-slider"
                  :style="getSliderBackground(currentNpc.matrix[dim.key], dim.min, dim.max)"
                />
              </div>
            </div>
          </div>

          <!-- 自动生成的综述与玩家备注 -->
          <div class="relationship-summary">
            <div class="summary-header">
              <label>关系矩阵预览</label>
              <button class="btn-mini" @click="regenerateSummary"><span class="icon">⟳</span> 刷新</button>
            </div>
            <div class="generated-summary-box">
              {{ generateTechnicalSummary(currentNpc) }}
            </div>

            <div class="input-group" style="margin-top: 20px">
              <label>关系概述</label>
              <textarea
                v-model="currentNpc.summary"
                placeholder="在此处补充具体的过往经历、特殊约定或当前的关系状态..."
                rows="3"
                class="text-input textarea-input"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <div class="empty-content">
            <span class="empty-icon">∅</span>
            <p>孤身一人，没有额外羁绊</p>
            <p class="sub-text">点击上方添加按钮建立羁绊</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useStatStore } from '@/尘史使徒/UI/store/StatStore';
import RelationshipTargetSelector from '../role/RelationshipTargetSelector.vue';

const props = defineProps({
  formData: { type: Object, required: true },
  isInfiniteMode: { type: Boolean, default: false },
  globalRemainingPoints: { type: Number, default: 0 },
});
const emit = defineEmits(['update:formData']);
const statStore = useStatStore();

const currentNpcIndex = ref(0);
const currentNpc = computed(() => props.formData.relationships[currentNpcIndex.value] || {});

// ==========================================
// 1. 数据定义与规则映射
// ==========================================

const emotionalDimensions = [
  { key: 'affection', label: '好感度 (友情/亲情)', min: -100, max: 100 },
  { key: 'romantic', label: '浪漫度 (爱情倾向)', min: -100, max: 100 },
  { key: 'lust', label: '情欲 (生理吸引)', min: -100, max: 100 },
  { key: 'dependency', label: '依赖度 (需求程度)', min: -100, max: 100 },
];

const utilitarianDimensions = [
  { key: 'familiarity', label: '熟悉度 (信息了解)', min: 0, max: 100 },
  { key: 'influence', label: '影响力 (受你影响)', min: 0, max: 100 },
  { key: 'responsibility', label: '责任义务 (自觉)', min: 0, max: 100 },
  { key: 'utility', label: '利用价值 (目标助益)', min: 0, max: 100 },
];

// 规则字典
const RULE_SETS = {
  affection: [
    { min: -100, max: -80, label: '憎恨', desc: '主动伤害' },
    { min: -79, max: -40, label: '厌恶', desc: '避开/轻蔑' },
    { min: -39, max: -10, label: '不喜欢', desc: '负面印象' },
    { min: -9, max: 9, label: '漠视', desc: '无波澜' },
    { min: 10, max: 40, label: '友善', desc: '正面印象' },
    { min: 41, max: 80, label: '喜爱', desc: '主动关心' },
    { min: 81, max: 100, label: '深爱', desc: '愿为牺牲' },
  ],
  romantic: [
    { min: -100, max: -80, label: '毁灭/扭曲', desc: '因爱生恨' },
    { min: -79, max: -40, label: '排斥', desc: '排除可能' },
    { min: -39, max: -10, label: '无感', desc: '非恋人视角' },
    { min: -9, max: 9, label: '模糊', desc: '难辨友爱' },
    { min: 10, max: 40, label: '萌芽', desc: '超越友谊' },
    { min: 41, max: 80, label: '爱意', desc: '规划未来' },
    { min: 81, max: 100, label: '灵魂伴侣', desc: '命中注定' },
  ],
  lust: [
    { min: -100, max: -50, label: '生理排斥', desc: '强烈不适' },
    { min: -49, max: -10, label: '无趣', desc: '无性吸引' },
    { min: -9, max: 9, label: '无', desc: '未审视' },
    { min: 10, max: 40, label: '吸引', desc: '有性幻想' },
    { min: 41, max: 80, label: '渴求', desc: '主动接触' },
    { min: 81, max: 100, label: '痴迷', desc: '肉体执念' },
  ],
  dependency: [
    { min: -100, max: -50, label: '反向依赖', desc: '病态抗拒' },
    { min: -49, max: -10, label: '独立', desc: '尽量自理' },
    { min: -9, max: 9, label: '对等', desc: '互助' },
    { min: 10, max: 40, label: '情感依赖', desc: '寻求安慰' },
    { min: 41, max: 80, label: '功能依赖', desc: '核心需求' },
    { min: 81, max: 100, label: '绝对依赖', desc: '深度绑定' },
  ],
  familiarity: [
    { min: 0, max: 20, label: '陌生', desc: '仅知皮毛' },
    { min: 21, max: 40, label: '相识', desc: '公开信息' },
    { min: 41, max: 60, label: '同伴', desc: '习惯好恶' },
    { min: 61, max: 80, label: '密友', desc: '过往秘密' },
    { min: 81, max: 100, label: '知己', desc: '全知全能' },
  ],
  influence: [
    { min: 0, max: 20, label: '微弱', desc: '无作用' },
    { min: 21, max: 40, label: '参考', desc: '仅作参考' },
    { min: 41, max: 60, label: '重要', desc: '影响决策' },
    { min: 61, max: 80, label: '主导', desc: '常为妥协' },
    { min: 81, max: 100, label: '灯塔', desc: '最高指引' },
  ],
  responsibility: [
    { min: 0, max: 20, label: '无', desc: '无' },
    { min: 21, max: 40, label: '社会', desc: '基本道德' },
    { min: 41, max: 60, label: '角色', desc: '身份职责' },
    { min: 61, max: 80, label: '个人', desc: '私人承诺' },
    { min: 81, max: 100, label: '终极', desc: '核心意义' },
  ],
  utility: [
    { min: 0, max: 20, label: '累赘', desc: '障碍' },
    { min: 21, max: 40, label: '潜在', desc: '未来可用' },
    { min: 41, max: 60, label: '工具', desc: '特定任务' },
    { min: 61, max: 80, label: '资产', desc: '难以替代' },
    { min: 81, max: 100, label: '命脉', desc: '不可或缺' },
  ],
};

// ==========================================
// 2. 辅助函数
// ==========================================

const getRangeDesc = (key, val) => {
  const rules = RULE_SETS[key];
  if (!rules) return '未知';
  const match = rules.find(r => val >= r.min && val <= r.max);
  return match ? `${match.label}` : '未知';
};

const getInertiaClass = val => {
  const abs = Math.abs(val);
  if (abs > 80) return 'text-gold';
  if (abs > 40) return 'text-blue';
  return 'text-gray';
};

const getSliderBackground = (val, min, max) => {
  const percentage = ((val - min) / (max - min)) * 100;
  return {
    background: `linear-gradient(to right, var(--c-gold) 0%, var(--c-gold) ${percentage}%, #222 ${percentage}%, #222 100%)`,
  };
};

// ==========================================
// 3. 角色数据处理
// ==========================================

const availableMainRoles = computed(() => {
  const roles = statStore.stat_data?.['角色']?.['主要角色'] || {};
  return Object.keys(roles).map(key => {
    const role = roles[key];
    return {
      id: key,
      appearance: role['外貌概括'] || (role['外貌'] ? role['外貌'].join('，') : '未知'),
      personalityTags: role['性格']
        ? [role['性格']['社交表现'], role['性格']['行动逻辑'], role['性格']['道德底色']].filter(Boolean)
        : ['未知'],
    };
  });
});
const relationshipOptions = computed(() => availableMainRoles.value.map(role => ({ id: role.id, label: role.id })));
const selectNpc = roleId => {
  const index = props.formData.relationships.findIndex(item => item.roleId === roleId);
  if (index >= 0) currentNpcIndex.value = index;
};

const getSelectedRoleDetails = roleId => {
  return availableMainRoles.value.find(r => r.id === roleId) || { appearance: '暂无信息', personalityTags: [] };
};

const getRoleName = roleId => {
  return roleId || '未定对象';
};

const onRoleSelect = npc => {
  npc.name = npc.roleId;
};

// ==========================================
// 4. 增删逻辑
// ==========================================

const addNpc = (roleId = '') => {
  if (props.formData.relationships.length >= 2) return;
  // eslint-disable-next-line vue/no-mutating-props
  props.formData.relationships.push({
    roleId,
    name: `未定对象`,
    summary: '',
    matrix: {
      affection: 0,
      romantic: 0,
      lust: 0,
      dependency: 0,
      familiarity: 0,
      influence: 0,
      responsibility: 0,
      utility: 0,
    },
  });
  currentNpcIndex.value = props.formData.relationships.length - 1;
};
const removeNpcByRole = roleId => {
  const index = props.formData.relationships.findIndex(item => item.roleId === roleId);
  if (index >= 0) removeNpc(index);
};

const removeNpc = index => {
  // eslint-disable-next-line vue/no-mutating-props
  props.formData.relationships.splice(index, 1);
  if (currentNpcIndex.value >= props.formData.relationships.length) {
    currentNpcIndex.value = Math.max(0, props.formData.relationships.length - 1);
  }
};

const regenerateSummary = () => {
  // 触发重新渲染
};

// ==========================================
// 5. 核心：生成技术综述
// ==========================================

const generateTechnicalSummary = npc => {
  if (!npc.roleId) return '等待选择角色...';

  const m = npc.matrix;
  const lines = [];

  lines.push(`【人际关系矩阵: ${getRoleName(npc.roleId)} → <user>】`);

  const emo = [];
  emo.push(`好感:${m.affection}[${getRangeDesc('affection', m.affection)}]`);
  emo.push(`浪漫:${m.romantic}[${getRangeDesc('romantic', m.romantic)}]`);
  emo.push(`情欲:${m.lust}[${getRangeDesc('lust', m.lust)}]`);
  emo.push(`依赖:${m.dependency}[${getRangeDesc('dependency', m.dependency)}]`);
  lines.push(`情感: ${emo.join(', ')}`);

  const util = [];
  util.push(`熟悉:${m.familiarity}[${getRangeDesc('familiarity', m.familiarity)}]`);
  util.push(`影响力:${m.influence}[${getRangeDesc('influence', m.influence)}]`);
  util.push(`责任:${m.responsibility}[${getRangeDesc('responsibility', m.responsibility)}]`);
  util.push(`价值:${m.utility}[${getRangeDesc('utility', m.utility)}]`);
  lines.push(`认知: ${util.join(', ')}`);

  return lines.join('\n');
};

// ==========================================
// 6. 自动汇总写入 formData
// ==========================================

const getFullSummaryText = () => {
  const rels = props.formData.relationships;
  if (!rels || rels.length === 0) {
    return '孤身一人，没有额外羁绊';
  }
  return rels
    .map(npc => {
      let text = generateTechnicalSummary(npc);
      if (npc.summary) {
        text += `\n关系概述: ${npc.summary}`;
      }
      return text;
    })
    .join('\n\n');
};

watch(
  () => props.formData.relationships,
  () => {
    // eslint-disable-next-line vue/no-mutating-props
    props.formData.fullRelationshipText = getFullSummaryText();
  },
  { deep: true, immediate: true },
);

defineExpose({
  getFullSummaryText,
});
</script>

<style scoped>
/* 基础布局 - 修复溢出问题的关键 */
.page-relations {
  display: flex;
  flex-direction: column;
  background: linear-gradient(to bottom, #0a0a0a, #111);
  color: #ddd;
  height: 100%; /* 确保占满父容器 */
  flex: 1;
  width: 100%;
  overflow: hidden; /* 防止整体滚动 */
  box-sizing: border-box;
}

.relationship-layout {
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

/* 头部区域 (不滚动) */
.header-area {
  flex-shrink: 0; /* 防止被压缩 */
  padding: 0 10px;
  box-sizing: border-box;
}

/* 内容区域 (可滚动) */
.scrollable-content {
  flex: 1;
  overflow-y: auto; /* 仅此处滚动 */
  min-height: 0; /* Flex布局嵌套滚动的关键 */
  padding: 0 10px 40px 10px; /* 底部留白 */
  /* 滚动条美化 */
  scrollbar-width: thin;
  scrollbar-color: #444 rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}

/* 头部样式 */
.header-section {
  position: relative;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #333;
  margin-top: 10px;
}

.section-title.center {
  text-align: center;
  font-family: 'Cinzel', serif;
  color: var(--c-gold);
  font-size: 1.8rem;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.points-display {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid var(--c-gold);
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 0.9rem;
  display: flex;
  gap: 10px;
  align-items: center;
}

.points-display .value {
  color: var(--c-gold);
  font-weight: bold;
  font-size: 1.1rem;
}

.points-display .value.text-danger {
  color: var(--c-danger);
}

.desc.center {
  text-align: center;
  color: #777;
  font-size: 0.9rem;
  margin-bottom: 15px;
}

/* 编辑区域 */
.relationship-editor {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.npc-config-row {
  display: flex;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.role-select {
  flex: 1;
}

.input-group label {
  font-size: 0.85rem;
  color: #999;
  font-weight: 500;
}

.text-input {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid #444;
  color: #fff;
  padding: 10px 12px;
  border-radius: 6px;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.text-input:focus {
  border-color: var(--c-gold);
  outline: none;
  background: rgba(0, 0, 0, 0.5);
}

/* 详情卡片 */
.npc-details-card {
  background: linear-gradient(145deg, rgba(30, 30, 30, 0.6), rgba(20, 20, 20, 0.8));
  border: 1px solid #333;
  border-left: 3px solid var(--c-gold);
  padding: 16px 20px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}

.detail-section {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.detail-label {
  color: #999;
  font-size: 0.85rem;
  min-width: 65px;
  padding-top: 2px;
  flex-shrink: 0;
}

.detail-text {
  color: #ddd;
  font-size: 0.95rem;
  line-height: 1.5;
}

.tags-container {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  background: rgba(197, 160, 89, 0.1);
  border: 1px solid rgba(197, 160, 89, 0.3);
  padding: 4px 10px;
  font-size: 0.8rem;
  border-radius: 12px;
  color: var(--c-gold);
}

/* 矩阵区域 */
.matrix-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  background: rgba(0, 0, 0, 0.2);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #222;
  box-sizing: border-box;
}

.matrix-title {
  color: #fff;
  border-bottom: 1px solid #333;
  margin-bottom: 20px;
  padding-bottom: 10px;
  font-size: 1.05rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.matrix-title::before {
  content: '';
  display: block;
  width: 4px;
  height: 14px;
  background: var(--c-gold);
  border-radius: 2px;
}

.slider-group {
  margin-bottom: 22px;
  background: rgba(255, 255, 255, 0.02);
  padding: 12px 15px;
  border-radius: 6px;
  border: 1px solid #2a2a2a;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.slider-label {
  font-size: 0.9rem;
  color: #bbb;
  font-weight: 500;
}

.slider-value-display {
  font-size: 0.85rem;
  display: flex;
  gap: 8px;
  align-items: center;
}

.desc-text {
  font-weight: bold;
}

.value-num {
  background: #111;
  border: 1px solid #333;
  padding: 2px 8px;
  border-radius: 4px;
  min-width: 36px;
  text-align: center;
  font-family: monospace;
  font-size: 0.9rem;
}

.styled-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  appearance: none;
  background: #222;
  outline: none;
  touch-action: none; /* 优化触摸拖动 */
}

.styled-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px; /* 加大触摸区域 */
  height: 20px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  border: 3px solid var(--c-gold);
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.6);
  transition: transform 0.1s;
}

.styled-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

/* 综述区域 */
.relationship-summary {
  background: rgba(20, 20, 20, 0.6);
  border: 1px solid #333;
  padding: 20px;
  border-radius: 8px;
  box-sizing: border-box;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.summary-header label {
  font-size: 1rem;
  color: #ddd;
  font-weight: 500;
}

.btn-mini {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #444;
  color: #aaa;
  font-size: 0.8rem;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.btn-mini:hover {
  border-color: var(--c-gold);
  color: var(--c-gold);
  background: rgba(197, 160, 89, 0.1);
}

.generated-summary-box {
  background: #0a0a0a;
  border: 1px solid #222;
  border-left: 3px solid #4a9eff;
  padding: 12px 15px;
  font-family: 'Consolas', monospace;
  font-size: 0.85rem;
  color: #9cdcfe;
  white-space: pre-wrap;
  border-radius: 4px;
  line-height: 1.5;
  box-sizing: border-box;
}

.textarea-input {
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
  box-sizing: border-box;
  width: 100%;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 2px dashed #333;
  border-radius: 8px;
  margin: 20px 0;
  min-height: 200px;
}

.empty-content {
  text-align: center;
  color: #555;
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 10px;
}

.sub-text {
  font-size: 0.85rem;
  margin-top: 5px;
}

/* 颜色工具类 */
.text-gold {
  color: var(--c-gold);
}
.text-blue {
  color: #4a9eff;
}
.text-gray {
  color: #888;
}

/* =========================================
   移动端适配优化
   ========================================= */
@media (max-width: 768px) {
  .section-title.center {
    font-size: 1.4rem;
  }

  .points-display {
    position: relative;
    top: 0;
    transform: none;
    margin-top: 10px;
    justify-content: center;
    width: fit-content;
    margin-left: auto;
    margin-right: auto;
  }

  .npc-config-row {
    flex-direction: column;
    gap: 10px;
  }

  .matrix-container {
    grid-template-columns: 1fr; /* 单列显示 */
    padding: 15px;
    gap: 20px;
  }

  .slider-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .slider-value-display {
    width: 100%;
    justify-content: space-between;
  }

  .relationship-summary {
    padding: 15px;
  }

  .scrollable-content {
    padding-bottom: 80px; /* 增加底部留白，防止被移动浏览器UI遮挡 */
  }
}
</style>
