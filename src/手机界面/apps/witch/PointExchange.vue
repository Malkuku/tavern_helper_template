<template>
  <section class="witch-scroll witch-point-exchange" aria-label="日元兑换">
    <span class="witch-eyebrow">MEMBER EXCHANGE</span>
    <h2>将回报，兑换成日常。</h2>
    <p>每 1 点恶堕积分可兑换 ￥{{ yenPerPoint }}。</p>
    <form class="witch-exchange-card" @submit.prevent="exchangePoints">
      <div class="witch-section-heading">
        <span>可用恶堕积分</span><strong>{{ availablePoints }} 点</strong>
      </div>
      <label for="witch-exchange-points">兑换点数</label>
      <input
        id="witch-exchange-points"
        v-model="exchangeAmount"
        type="number"
        min="1"
        step="1"
        inputmode="numeric"
        :disabled="exchangingPoints"
      />
      <p v-if="validExchangeAmount">到账 ￥{{ Number(exchangeAmount) * yenPerPoint }}</p>
      <p v-else-if="Number(exchangeAmount) > availablePoints" class="witch-exchange-error">恶堕积分不足</p>
      <p v-else>请输入正整数点数。</p>
      <button class="witch-main-action" type="submit" :disabled="exchangingPoints || !validExchangeAmount">
        {{ exchangingPoints ? '兑换中…' : '确认兑换' }}<span aria-hidden="true">↗</span>
      </button>
      <p v-if="exchangeNotice" role="status">{{ exchangeNotice }}</p>
      <p v-if="error" class="witch-exchange-error" role="alert">{{ error }}</p>
    </form>
    <p class="witch-exchange-caption">日元直接入账，组织财务会通过 Weline 发送到账通知。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMagicGirlStatStore } from '../../store/StatStore';
import { yenPerPoint } from './organizationExchange';

const store = useMagicGirlStatStore();
const availablePoints = computed(() => store.statData?.角色?.user?.恶堕积分 ?? 0);
const exchangeAmount = ref('1');
const exchangingPoints = ref(false);
const exchangeNotice = ref('');
const error = ref('');
const validExchangeAmount = computed(() => {
  const points = Number(exchangeAmount.value);
  return Number.isSafeInteger(points) && points > 0 && points <= availablePoints.value;
});
watch(exchangeAmount, () => {
  exchangeNotice.value = '';
  error.value = '';
});
async function exchangePoints() {
  if (exchangingPoints.value) return;
  exchangingPoints.value = true;
  error.value = '';
  exchangeNotice.value = '';
  const points = Number(exchangeAmount.value);
  try {
    await store.exchangePointsForMoney(points);
    exchangeNotice.value = `￥${points * yenPerPoint} 已到账，通知已发送至 Weline。`;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '兑换失败，请重试。';
  } finally {
    exchangingPoints.value = false;
  }
}
</script>
