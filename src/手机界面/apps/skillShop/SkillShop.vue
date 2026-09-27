<template>
  <div class="skill-shop">
    <header>
      <strong>组织技能商店</strong><span>{{ balance }} 积分</span>
    </header>
    <div class="shop-scroll">
      <section class="shop-intro">
        <h1>组织技能</h1>
        <p>每次手动刷新生成 6 个技能；每周首次免费，周一重置报价。</p>
        <button type="button" :disabled="busy || store.skillRefreshing || balance < quote.price" @click="refreshShop">
          {{ store.skillRefreshing ? '生成中…' : `刷新货架 · ${quote.price} 积分` }}
        </button>
        <button v-if="store.skillRefreshing" class="cancel-refresh" type="button" @click="store.cancelSkillRefresh()">
          取消等待
        </button>
        <p v-if="balance < quote.price" class="shop-error">积分不足，需要 {{ quote.price }} 点。</p>
        <p v-if="store.skillRefreshError" class="shop-error">{{ store.skillRefreshError }}，可再次刷新。</p>
      </section>

      <nav class="shop-tabs" aria-label="技能商店页面">
        <button type="button" :class="{ active: tab === 'shop' }" @click="tab = 'shop'">可购技能</button>
        <button type="button" :class="{ active: tab === 'owned' }" @click="tab = 'owned'">我的技能</button>
      </nav>

      <div v-if="tab === 'shop'" class="shop-list">
        <p v-if="!shopEntries.length" class="shop-empty">货架暂无技能。点击刷新生成本周可购买的技能。</p>
        <article v-for="[name, item] in shopEntries" :key="name" class="shop-card">
          <div class="shop-heading">
            <InventoryIcon :svg="item.图标" />
            <div>
              <strong>{{ name }}</strong
              ><small>{{ owned[name] ? '升级版本' : '新技能' }} · {{ item.适用评级 }}</small>
            </div>
          </div>
          <p>{{ item.描述 }}</p>
          <div class="shop-effect">{{ item.作用 }}</div>
          <small
            >战力评级贡献 {{ item.战力评级贡献 }}{{ owned[name] ? `（当前 ${owned[name].战力评级贡献}）` : '' }}</small
          >
          <button type="button" :disabled="busy || balance < item.价格" @click="purchase(name)">
            购买 · {{ item.价格 }} 积分
          </button>
        </article>
      </div>
      <div v-else class="shop-list">
        <p v-if="!ownedEntries.length" class="shop-empty">目前没有持有技能。</p>
        <article v-for="[name, item] in ownedEntries" :key="name" class="shop-card">
          <div class="shop-heading">
            <InventoryIcon :svg="item.图标" />
            <div>
              <strong>{{ name }}</strong
              ><small>{{ item.适用评级 }}</small>
            </div>
          </div>
          <p>{{ item.描述 }}</p>
          <div class="shop-effect">{{ item.作用 }}</div>
          <small>战力评级贡献 {{ item.战力评级贡献 }} · 累计价格 {{ item.价格 }}</small>
          <div v-if="confirmSale === name" class="sale-confirm">
            <span>卖出后获得 {{ Math.floor(item.价格 / 2) }} 积分，技能将被移除。</span>
            <button type="button" :disabled="busy" @click="sell(name)">确认卖出</button>
            <button type="button" @click="confirmSale = null">取消</button>
          </div>
          <button v-else type="button" :disabled="busy" @click="confirmSale = name">
            出售 · {{ Math.floor(item.价格 / 2) }} 积分
          </button>
        </article>
      </div>
      <p v-if="error" class="shop-error" role="alert">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMagicGirlStatStore } from '../../store/StatStore';
import { refreshQuote } from './skillShop';
import InventoryIcon from '../data/InventoryIcon.vue';

const store = useMagicGirlStatStore();
const tab = ref<'shop' | 'owned'>('shop');
const busy = ref(false);
const error = ref('');
const confirmSale = ref<string | null>(null);
const balance = computed(() => store.statData?.角色.user.恶堕积分 ?? 0);
const shopEntries = computed(() => Object.entries(store.statData?.技能商店 ?? {}));
const owned = computed(() => store.statData?.角色.user.技能 ?? {});
const ownedEntries = computed(() => Object.entries(owned.value));
const quote = computed(() => {
  try {
    return store.statData ? refreshQuote(store.statData) : { price: 0, count: 0, next: '' };
  } catch {
    return { price: Number.POSITIVE_INFINITY, count: 0, next: '' };
  }
});

async function run(action: () => Promise<unknown>) {
  busy.value = true;
  error.value = '';
  try {
    await action();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '技能商店操作失败。';
  } finally {
    busy.value = false;
  }
}
function refreshShop() {
  void run(() => store.refreshSkillShop());
}
function purchase(name: string) {
  void run(() => store.purchaseSkill(name));
}
function sell(name: string) {
  void run(async () => {
    await store.sellOwnedSkill(name);
    confirmSale.value = null;
  });
}
</script>

<style scoped>
.skill-shop {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f3f8;
  color: #30283b;
  font-family: sans-serif;
}
header {
  height: 104px;
  box-sizing: border-box;
  padding: 52px 18px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #faf8fc;
  border-bottom: 1px solid #e8e2ee;
}
header span {
  color: #76519b;
  font-size: 13px;
  font-weight: 700;
}
.shop-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 17px 40px;
}
.shop-intro {
  padding: 17px;
  border-radius: 18px;
  color: #fff;
  background: linear-gradient(140deg, #342d54, #76527e);
}
h1 {
  margin: 0;
  font-size: 25px;
}
.shop-intro p {
  font-size: 12px;
  line-height: 1.6;
}
button {
  border: 0;
  border-radius: 10px;
  padding: 9px 12px;
  background: #76519b;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}
button:disabled {
  opacity: 0.5;
}
.shop-intro button {
  background: #fff;
  color: #55366f;
}
.shop-tabs {
  display: flex;
  gap: 8px;
  margin: 16px 0;
}
.shop-tabs button {
  flex: 1;
  background: #e9e1ef;
  color: #65477b;
}
.shop-tabs button.active {
  background: #76519b;
  color: #fff;
}
.shop-list {
  display: grid;
  gap: 12px;
}
.shop-card {
  padding: 15px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 5px 18px #42334a08;
  display: grid;
  gap: 10px;
}
.shop-heading {
  display: flex;
  gap: 10px;
  align-items: center;
}
.shop-heading div {
  display: grid;
  gap: 3px;
}
.shop-heading small,
.shop-card small {
  color: #8a7c93;
  font-size: 11px;
}
.shop-card p {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
}
.shop-effect {
  padding: 10px;
  border-radius: 10px;
  background: #f8f4fa;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.shop-error {
  color: #b6375a;
  font-size: 12px;
}
.shop-intro .shop-error {
  color: #ffe4ed;
}
.shop-empty {
  color: #776b80;
  font-size: 13px;
  text-align: center;
  padding: 28px 0;
}
.sale-confirm {
  display: grid;
  gap: 7px;
  font-size: 12px;
}
.sale-confirm button:last-child {
  background: #e9e1ef;
  color: #65477b;
}
</style>
