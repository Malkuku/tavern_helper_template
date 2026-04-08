<template>
  <div class="page-container page-four">
    <div class="confirmation-layout">

      <section class="form-group narrative-section">
        <h3 class="section-title center">叙事风格</h3>
        <div class="narrative-wrapper">
          <NarrativePaceSelector v-model="formData.narrativePace" />
        </div>
      </section>

      <!-- 资源兑换 -->
      <section class="form-group exchange-section">
        <h3 class="section-title center">资源转化</h3>
        <div class="exchange-box">
          <div class="exchange-info">
            <div class="res-row">
              <span>剩余点数:</span>
              <span class="val highlight">{{ globalRemainingPoints }}</span>
            </div>
            <div class="res-row">
              <span>初始金钱:</span>
              <span class="val">{{ finalMoney }}</span>
              <span class="sub">(2000 + {{ moneyExchangePoints * 200 }})</span>
            </div>
            <div class="res-row">
              <span>缥缈异质:</span>
              <span class="val text-blue">{{ finalHeterogeneity }}</span>
              <span class="sub">(2000 + {{ heterogeneityPoints * 100 }})</span>
            </div>
          </div>

          <div class="exchange-control" v-if="globalRemainingPoints > 0 && !isInfiniteMode">
            <label>兑换金钱</label>
            <div class="slider-container">
              <span>0</span>
              <input type="range" v-model.number="moneyExchangePoints" min="0" :max="globalRemainingPoints" step="1" class="styled-slider">
              <span>{{ globalRemainingPoints }}</span>
            </div>
            <div class="exchange-desc">
              投入 <span class="text-gold">{{ moneyExchangePoints }}</span> 点兑换金钱，
              剩余 <span class="text-blue">{{ globalRemainingPoints - moneyExchangePoints }}</span> 点转化为异质。
            </div>
          </div>
          <div v-else-if="isInfiniteMode" class="infinite-warning">
            无限模式下不进行点数转化，获得默认初始资源。
          </div>
        </div>
      </section>

      <section class="form-group summary-section">
        <h3 class="section-title center">铭刻确认</h3>
        <div class="final-card">
          <div class="card-row">
            <span class="label">身份：</span>
            <span class="value">{{ formData.location }} 的 {{ formData.identity }} ({{ formData.age }})</span>
          </div>
          <div class="card-row">
            <span class="label">外貌：</span>
            <span class="value">{{ finalAppearance }}</span>
          </div>
          <div class="card-row">
            <span class="label">性格：</span>
            <span class="value highlight">{{ finalPersonalitySummary }}</span>
          </div>
          <div class="card-row">
            <span class="label">羁绊：</span>
            <div class="value">
              <span v-for="(npc, i) in formData.relationships" :key="i" class="art-tag">
                <template v-if="npc.roleId">
                  {{ npc.name }} ({{ npc.matrix.affection > 0 ? '友善' : '中立' }})
                </template>
              </span>
              <span v-if="formData.relationships.length === 0 || !formData.relationships.some(n => n.roleId)" class="dim">无</span>
            </div>
          </div>
        </div>
      </section>

      <div class="action-buttons">
        <div class="io-group">
          <button class="io-btn" @click="$emit('export-config')">导出配置</button>
          <button class="io-btn" @click="$emit('import-config')">导入配置</button>
        </div>
        <button class="confirm-btn large" :disabled="submitting || (!isInfiniteMode && globalRemainingPoints < 0)" @click="onSubmit">
          <span v-if="!submitting">铭刻真实 · 开始旅程</span>
          <span v-else>正在生成世界...</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import NarrativePaceSelector from '@/尘史使徒/UI/components/story/NarrativePaceSelector.vue';

const props = defineProps([
  'formData', 'isInfiniteMode', 'globalRemainingPoints',
  'finalAppearance', 'finalPersonalitySummary', 'submitting'
]);
const emit = defineEmits(['update:formData', 'submit', 'export-config', 'import-config']);

const moneyExchangePoints = ref(0);

// 监听剩余点数变化，重置兑换值
watch(() => props.globalRemainingPoints, (newVal) => {
  if (moneyExchangePoints.value > newVal) {
    moneyExchangePoints.value = Math.max(0, newVal);
  }
});

const finalMoney = computed(() => {
  if (props.isInfiniteMode) return 1000;
  return 1000 + (moneyExchangePoints.value * 200);
});

const heterogeneityPoints = computed(() => {
  if (props.isInfiniteMode) return 0;
  return Math.max(0, props.globalRemainingPoints - moneyExchangePoints.value);
});

const finalHeterogeneity = computed(() => {
  if (props.isInfiniteMode) return 4000;
  return 4000 + (heterogeneityPoints.value * 100);
});

const onSubmit = () => {
  emit('submit', {
    finalMoney: finalMoney.value,
    finalHeterogeneity: finalHeterogeneity.value
  });
};
</script>

<style scoped>
/* 提取自原文件 */
.page-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; padding: 20px; overflow-y: auto; }
.confirmation-layout { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; padding-top: 10px; }
.exchange-box { background: rgba(0,0,0,0.3); border: 1px solid #444; padding: 15px; }
.exchange-info { display: flex; justify-content: space-around; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 15px; }
.res-row { display: flex; flex-direction: column; align-items: center; }
.res-row .val { font-size: 1.5rem; font-weight: bold; color: #ddd; }
.res-row .val.highlight { color: var(--c-gold); }
.res-row .sub { font-size: 0.8rem; color: #666; }
.exchange-control { padding: 10px; text-align: center; }
.exchange-desc { font-size: 0.9rem; color: #888; margin-top: 10px; }
.infinite-warning { text-align: center; color: var(--c-gold); font-style: italic; }
.final-card { background: rgba(197, 160, 89, 0.05); border: 1px solid var(--c-gold); padding: 20px; }
.card-row { display: flex; margin-bottom: 10px; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 5px; }
.card-row .label { width: 80px; color: #888; font-weight: bold; flex-shrink: 0; }
.card-row .value { color: #ddd; flex: 1; }
.card-row .value.highlight { color: var(--c-gold); font-style: italic; }
.action-buttons { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
.io-group { display: flex; gap: 10px; }
.io-btn { background: transparent; border: 1px solid #444; color: #888; padding: 5px 10px; font-size: 0.8rem; cursor: pointer; }
.io-btn:hover { border-color: var(--c-gold); color: var(--c-gold); }
.confirm-btn.large { background: rgba(0,0,0,0.5); border: 1px solid var(--c-gold); color: var(--c-gold); font-family: 'Cinzel', serif; font-size: 1.2rem; padding: 15px 40px; cursor: pointer; transition: all 0.3s; letter-spacing: 2px; }
.confirm-btn.large:hover:not(:disabled) { background: var(--c-gold); color: #000; box-shadow: 0 0 25px rgba(197, 160, 89, 0.5); }
.confirm-btn:disabled { border-color: #444; color: #444; cursor: not-allowed; }
.section-title.center { text-align: center; border-bottom: none; position: relative; display: inline-block; width: 100%; }
.section-title.center::after { content: ''; display: block; width: 60px; height: 2px; background: var(--c-gold); margin: 5px auto 0; }
.slider-container { display: flex; align-items: center; gap: 10px; }
.styled-slider { flex: 1; accent-color: var(--c-gold); cursor: pointer; height: 4px; background: #333; }
.text-gold { color: var(--c-gold); }
.text-blue { color: var(--c-blue); }
</style>
