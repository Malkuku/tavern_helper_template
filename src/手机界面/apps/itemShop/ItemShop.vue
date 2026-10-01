<template>
  <div class="item-shop">
    <div class="item-shop-scroll">
      <section class="item-shop-intro">
        <span class="witch-eyebrow">PRIVATE COLLECTION</span>
        <h1>道具精选</h1>
        <p>挑选适合这次行动的物品。</p>
        <button
          type="button"
          :disabled="
            busy || store.itemRefreshing || !!quote.error || balance < refreshPrice || (directed && !preference.trim())
          "
          @click="run(() => store.refreshItemShop(directed ? preference.trim() : undefined))"
        >
          {{
            store.itemRefreshing
              ? '刷新中…'
              : quote.error
                ? '刷新货架'
                : refreshPrice === 0
                  ? '刷新货架 · 免费'
                  : `刷新货架 · ${refreshPrice} 积分`
          }}
        </button>
        <label class="directed-refresh-toggle">
          <input v-model="directed" type="checkbox" :disabled="busy || store.itemRefreshing" />
          <span
            >定向刷新 <small>额外 {{ directedSurcharge }} 积分</small></span
          >
        </label>
        <div v-if="directed" class="directed-refresh">
          <label for="item-refresh-wish">想要什么道具？</label>
          <textarea id="item-refresh-wish" v-model="preference" placeholder="描述希望出现的道具、用途或效果"></textarea>
          <small>偏好会提高相关内容出现机会，不保证必出。</small>
        </div>
        <button v-if="store.itemRefreshing" type="button" @click="store.cancelItemRefresh()">取消等待</button>
        <RefreshFeedback v-if="store.itemRefreshing" label="正在更新道具货架" />
        <p v-if="quote.error" class="item-shop-error">{{ quote.error }}</p>
        <p v-else-if="balance < refreshPrice" class="item-shop-error">积分不足，需要 {{ refreshPrice }} 点。</p>
        <p v-if="store.itemRefreshError" class="item-shop-error">{{ store.itemRefreshError }}</p>
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
          {{ tab === 'shop' ? '货架上还没有道具，刷新看看。' : `${saleSide}没有可出售的道具。` }}
        </p>
        <article v-for="[name, item] in entries" :key="name" class="item-shop-card">
          <button
            type="button"
            class="item-shop-heading entry-toggle"
            :aria-expanded="expandedName === name"
            @click="toggleEntry(name)"
          >
            <InventoryIcon :svg="item.图标" kind="道具" />
            <div>
              <strong>{{ name }}</strong
              ><small>{{ item.评级 }} 级 · 库存 {{ item.数量 }} · 耐久 {{ item.耐久 }}</small>
            </div>
            <span class="entry-chevron" aria-hidden="true">{{ expandedName === name ? '⌃' : '⌄' }}</span>
          </button>
          <div v-if="expandedName === name" class="entry-details">
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
          </div>
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
import { directedRefreshSurcharge } from '../shopRefresh';
import type { InventorySide } from '../data/inventoryTransfer';
import InventoryIcon from '../data/InventoryIcon.vue';
import RefreshFeedback from '../witch/RefreshFeedback.vue';

const store = useMagicGirlStatStore();
const tab = ref<'shop' | 'sell'>('shop');
const sides: InventorySide[] = ['随身物品', '仓库'];
const saleSide = ref<InventorySide>('随身物品');
const busy = ref(false);
const error = ref('');
const preference = ref('');
const directed = ref(false);
const confirmSale = ref<string | null>(null);
const expandedName = ref('');
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
const directedSurcharge = computed(() => (store.statData ? directedRefreshSurcharge(store.statData) : 20));
const refreshPrice = computed(() => quote.value.price + (directed.value ? directedSurcharge.value : 0));

function quantityFor(key: string): number {
  return quantities.value[key] ?? 1;
}
function setQuantity(key: string, event: Event) {
  quantities.value[key] = Number((event.target as HTMLInputElement).value);
  confirmSale.value = null;
}
function toggleEntry(name: string) {
  expandedName.value = expandedName.value === name ? '' : name;
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
watch([tab, saleSide], () => {
  expandedName.value = '';
  confirmSale.value = null;
});
</script>
