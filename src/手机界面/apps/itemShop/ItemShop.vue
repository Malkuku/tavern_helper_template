<template>
  <div class="item-shop">
    <header>
      <strong>组织道具商店</strong><span>{{ balance }} 积分</span>
    </header>
    <div class="item-shop-scroll">
      <section class="item-shop-intro">
        <h1>组织道具</h1>
        <p>每次刷新生成 9 件商品；每周首次免费，周一重置报价。</p>
        <button
          type="button"
          :disabled="busy || store.itemRefreshing || !!quote.error || balance < quote.price"
          @click="run(() => store.refreshItemShop())"
        >
          {{ store.itemRefreshing ? '生成中…' : quote.error ? '刷新货架' : `刷新货架 · ${quote.price} 积分` }}
        </button>
        <button v-if="store.itemRefreshing" type="button" @click="store.cancelItemRefresh()">取消等待</button>
        <p v-if="quote.error" class="item-shop-error">{{ quote.error }}</p>
        <p v-else-if="balance < quote.price" class="item-shop-error">积分不足，需要 {{ quote.price }} 点。</p>
        <p v-if="store.itemRefreshError" class="item-shop-error">{{ store.itemRefreshError }}，可再次刷新。</p>
      </section>

      <nav class="item-shop-tabs" aria-label="道具商店页面">
        <button type="button" :class="{ active: tab === 'shop' }" @click="tab = 'shop'">购买道具</button>
        <button type="button" :class="{ active: tab === 'sell' }" @click="tab = 'sell'">出售道具</button>
      </nav>
      <div v-if="tab === 'sell'" class="item-shop-sides" aria-label="出售来源">
        <button
          v-for="side in sides"
          :key="side"
          type="button"
          :class="{ active: saleSide === side }"
          @click="saleSide = side"
        >
          {{ side }}
        </button>
      </div>

      <div class="item-shop-list">
        <p v-if="!entries.length" class="item-shop-empty">
          {{ tab === 'shop' ? '货架暂无商品。点击刷新生成。' : `${saleSide}没有可出售的道具。` }}
        </p>
        <article v-for="[name, item] in entries" :key="name" class="item-shop-card">
          <div class="item-shop-heading">
            <InventoryIcon :svg="item.图标" />
            <div>
              <strong>{{ name }}</strong
              ><small>{{ item.评级 }} 级 · 库存 {{ item.数量 }} · 耐久 {{ item.耐久 }}</small>
            </div>
          </div>
          <p>{{ item.描述 }}</p>
          <div class="item-shop-effect">{{ item.作用 }}</div>
          <small>单件基准价 {{ item.价格 }} 积分</small>
          <label class="item-shop-quantity">
            数量
            <input
              type="number"
              min="1"
              :max="item.数量"
              step="1"
              :value="quantityFor(`${tab}:${saleSide}:${name}`)"
              @input="setQuantity(`${tab}:${saleSide}:${name}`, $event)"
            />
          </label>
          <button
            v-if="tab === 'shop'"
            type="button"
            :disabled="
              busy ||
              !validQuantity(item.数量, quantityFor(`shop:${saleSide}:${name}`)) ||
              balance < item.价格 * quantityFor(`shop:${saleSide}:${name}`)
            "
            @click="run(() => store.purchaseItem(name, quantityFor(`shop:${saleSide}:${name}`)))"
          >
            购买 · {{ item.价格 * quantityFor(`shop:${saleSide}:${name}`) }} 积分
          </button>
          <template v-else>
            <div v-if="confirmSale === `${saleSide}:${name}`" class="item-shop-confirm">
              <span
                >从{{ saleSide }}卖出 {{ quantityFor(`sell:${saleSide}:${name}`) }} 件，获得
                {{ refund(item.价格, quantityFor(`sell:${saleSide}:${name}`)) }} 积分。</span
              >
              <button
                type="button"
                :disabled="busy || !validQuantity(item.数量, quantityFor(`sell:${saleSide}:${name}`))"
                @click="sell(name)"
              >
                确认卖出
              </button>
              <button type="button" @click="confirmSale = null">取消</button>
            </div>
            <button
              v-else
              type="button"
              :disabled="busy || !validQuantity(item.数量, quantityFor(`sell:${saleSide}:${name}`))"
              @click="confirmSale = `${saleSide}:${name}`"
            >
              出售 · {{ refund(item.价格, quantityFor(`sell:${saleSide}:${name}`)) }} 积分
            </button>
          </template>
        </article>
      </div>
      <p v-if="error" class="item-shop-error" role="alert">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMagicGirlStatStore } from '../../store/StatStore';
import { itemRefreshQuote } from './itemShop';
import type { InventorySide } from '../data/inventoryTransfer';
import InventoryIcon from '../data/InventoryIcon.vue';

const store = useMagicGirlStatStore();
const tab = ref<'shop' | 'sell'>('shop');
const sides: InventorySide[] = ['随身物品', '仓库'];
const saleSide = ref<InventorySide>('随身物品');
const busy = ref(false);
const error = ref('');
const confirmSale = ref<string | null>(null);
const quantities = ref<Record<string, number>>({});
const balance = computed(() => store.statData?.角色.user.恶堕积分 ?? 0);
const entries = computed(() => {
  if (!store.statData) return [];
  return Object.entries(
    tab.value === 'shop'
      ? store.statData.商店
      : saleSide.value === '随身物品'
        ? store.statData.角色.user.物品
        : store.statData.仓库,
  );
});
const quote = computed(() => {
  try {
    return { ...(store.statData ? itemRefreshQuote(store.statData) : { price: 0, count: 0, next: '' }), error: '' };
  } catch (cause) {
    return {
      price: Number.POSITIVE_INFINITY,
      count: 0,
      next: '',
      error: cause instanceof Error ? cause.message : '刷新报价无效。',
    };
  }
});

function quantityFor(key: string): number {
  return quantities.value[key] ?? 1;
}
function setQuantity(key: string, event: Event) {
  quantities.value[key] = Number((event.target as HTMLInputElement).value);
  confirmSale.value = null;
}
function validQuantity(available: number, quantity: number): boolean {
  return Number.isSafeInteger(quantity) && quantity > 0 && quantity <= available;
}
function refund(price: number, quantity: number): number {
  return Math.floor(price / 2) * quantity;
}
async function run(action: () => Promise<unknown>) {
  busy.value = true;
  error.value = '';
  try {
    await action();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '道具商店操作失败。';
  } finally {
    busy.value = false;
  }
}
function sell(name: string) {
  const side = saleSide.value;
  const quantity = quantityFor(`sell:${side}:${name}`);
  void run(async () => {
    await store.sellOwnedItem(side, name, quantity);
    confirmSale.value = null;
  });
}
watch([tab, saleSide], () => (confirmSale.value = null));
</script>

<style scoped>
.item-shop {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f7f4f1;
  color: #342b30;
  font-family: sans-serif;
}
header {
  height: 104px;
  box-sizing: border-box;
  padding: 52px 18px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fdfaf8;
  border-bottom: 1px solid #ece2dd;
}
header span {
  color: #a1665b;
  font-size: 13px;
  font-weight: 700;
}
.item-shop-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 17px 40px;
}
.item-shop-intro {
  padding: 17px;
  border-radius: 18px;
  color: #fff;
  background: linear-gradient(140deg, #654555, #a56864);
}
h1 {
  margin: 0;
  font-size: 25px;
}
.item-shop-intro p {
  font-size: 12px;
  line-height: 1.6;
}
button {
  border: 0;
  border-radius: 10px;
  padding: 9px 12px;
  background: #a1665b;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}
button:disabled {
  opacity: 0.5;
}
.item-shop-intro button {
  margin-right: 8px;
  background: #fff;
  color: #73494b;
}
.item-shop-tabs,
.item-shop-sides {
  display: flex;
  gap: 8px;
  margin: 16px 0;
}
.item-shop-sides {
  margin-top: 0;
}
.item-shop-tabs button,
.item-shop-sides button {
  flex: 1;
  background: #efe3df;
  color: #805952;
}
.item-shop-tabs button.active,
.item-shop-sides button.active {
  background: #a1665b;
  color: #fff;
}
.item-shop-list {
  display: grid;
  gap: 12px;
}
.item-shop-card {
  padding: 15px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 5px 18px #42334a08;
  display: grid;
  gap: 10px;
}
.item-shop-heading {
  display: flex;
  align-items: center;
  gap: 10px;
}
.item-shop-heading div {
  display: grid;
  gap: 3px;
}
.item-shop-heading small,
.item-shop-card small {
  color: #897c7c;
  font-size: 11px;
}
.item-shop-card p {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
}
.item-shop-effect {
  padding: 10px;
  border-radius: 10px;
  background: #faf4f1;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.item-shop-quantity {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
}
.item-shop-quantity input {
  width: 74px;
  padding: 7px;
  border: 1px solid #dfd0cb;
  border-radius: 8px;
  font: inherit;
}
.item-shop-confirm {
  display: grid;
  gap: 7px;
  font-size: 12px;
}
.item-shop-confirm button:last-child {
  background: #efe3df;
  color: #805952;
}
.item-shop-error {
  color: #b6375a;
  font-size: 12px;
}
.item-shop-intro .item-shop-error {
  color: #ffe4ed;
}
.item-shop-empty {
  color: #776b80;
  font-size: 13px;
  text-align: center;
  padding: 28px 0;
}
</style>
