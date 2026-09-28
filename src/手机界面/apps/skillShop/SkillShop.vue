<template>
  <div class="skill-shop">
    <div class="shop-scroll">
      <section class="shop-intro">
        <span class="witch-eyebrow">EXCLUSIVE SKILLS</span>
        <h1>技能精选</h1>
        <p>探索专属能力，升级你已拥有的技能。</p>
        <button type="button" :disabled="busy || store.skillRefreshing || balance < quote.price" @click="refreshShop">
          {{ store.skillRefreshing ? '生成中…' : `刷新货架 · ${quote.price} 积分` }}
        </button>
        <button v-if="store.skillRefreshing" class="cancel-refresh" type="button" @click="store.cancelSkillRefresh()">
          取消等待
        </button>
        <RefreshFeedback v-if="store.skillRefreshing" label="正在更新技能货架" />
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
          <button
            type="button"
            class="shop-heading entry-toggle"
            :aria-expanded="expandedName === name"
            @click="toggleEntry(name)"
          >
            <InventoryIcon :svg="item.图标" kind="技能" />
            <div>
              <strong>{{ name }}</strong
              ><small>{{ owned[name] ? '升级版本' : '新技能' }} · {{ item.适用评级 }}</small>
            </div>
            <span class="entry-chevron" aria-hidden="true">{{ expandedName === name ? '⌃' : '⌄' }}</span>
          </button>
          <div v-if="expandedName === name" class="entry-details">
            <p>{{ item.描述 }}</p>
            <div class="shop-effect">{{ item.作用 }}</div>
            <small
              >战力评级贡献 {{ item.战力评级贡献
              }}{{ owned[name] ? `（当前 ${owned[name].战力评级贡献}）` : '' }}</small
            >
            <button type="button" :disabled="busy || balance < item.价格" @click="purchase(name)">
              购买 · {{ item.价格 }} 积分
            </button>
          </div>
        </article>
      </div>
      <div v-else class="shop-list">
        <p v-if="!ownedEntries.length" class="shop-empty">目前没有持有技能。</p>
        <article v-for="[name, item] in ownedEntries" :key="name" class="shop-card">
          <button
            type="button"
            class="shop-heading entry-toggle"
            :aria-expanded="expandedName === name"
            @click="toggleEntry(name)"
          >
            <InventoryIcon :svg="item.图标" kind="技能" />
            <div>
              <strong>{{ name }}</strong
              ><small>{{ item.适用评级 }}</small>
            </div>
            <span class="entry-chevron" aria-hidden="true">{{ expandedName === name ? '⌃' : '⌄' }}</span>
          </button>
          <div v-if="expandedName === name" class="entry-details">
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
          </div>
        </article>
      </div>
      <p v-if="error" class="shop-error" role="alert">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMagicGirlStatStore } from '../../store/StatStore';
import { refreshQuote } from './skillShop';
import InventoryIcon from '../data/InventoryIcon.vue';
import RefreshFeedback from '../witch/RefreshFeedback.vue';

const store = useMagicGirlStatStore();
const tab = ref<'shop' | 'owned'>('shop');
const busy = ref(false);
const error = ref('');
const confirmSale = ref<string | null>(null);
const expandedName = ref('');
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
function toggleEntry(name: string) {
  expandedName.value = expandedName.value === name ? '' : name;
  confirmSale.value = null;
}
watch(tab, () => {
  expandedName.value = '';
  confirmSale.value = null;
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
