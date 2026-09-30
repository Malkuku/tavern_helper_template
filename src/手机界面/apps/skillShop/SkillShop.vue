<template>
  <div class="skill-shop">
    <div class="shop-scroll">
      <section class="shop-intro">
        <span class="witch-eyebrow">EXCLUSIVE SKILLS</span>
        <h1>技能精选</h1>
        <p>探索专属能力，选择已有技能的新版本。</p>
        <button
          type="button"
          :disabled="busy || store.skillRefreshing || balance < refreshPrice || (directed && !preference.trim())"
          @click="refreshShop"
        >
          {{ store.skillRefreshing ? '刷新中…' : `刷新货架 · ${refreshPrice} 积分` }}
        </button>
        <label class="directed-refresh-toggle">
          <input v-model="directed" type="checkbox" :disabled="busy || store.skillRefreshing" />
          <span
            >定向刷新 <small>额外 {{ DIRECTED_REFRESH_SURCHARGE }} 积分</small></span
          >
        </label>
        <div v-if="directed" class="directed-refresh">
          <label for="skill-refresh-wish">想要什么技能？</label>
          <textarea
            id="skill-refresh-wish"
            v-model="preference"
            placeholder="描述希望出现的能力、用途或风格"
          ></textarea>
          <small>偏好会提高相关内容出现机会，不保证必出。</small>
        </div>
        <button v-if="store.skillRefreshing" class="cancel-refresh" type="button" @click="store.cancelSkillRefresh()">
          取消等待
        </button>
        <RefreshFeedback v-if="store.skillRefreshing" label="正在更新技能货架" />
        <p v-if="balance < refreshPrice" class="shop-error">积分不足，需要 {{ refreshPrice }} 点。</p>
        <p v-if="store.skillRefreshError" class="shop-error">{{ store.skillRefreshError }}</p>
      </section>

      <nav class="shop-tabs" aria-label="技能商店页面">
        <button type="button" :class="{ active: tab === 'shop' }" @click="tab = 'shop'">可购技能</button>
        <button type="button" :class="{ active: tab === 'owned' }" @click="tab = 'owned'">我的技能</button>
      </nav>

      <div v-if="tab === 'shop'" class="shop-list">
        <p v-if="!shopEntries.length" class="shop-empty">货架上还没有技能，刷新看看本周的新货。</p>
        <article
          v-for="[name, item] in shopEntries"
          :key="name"
          class="shop-card skill-offer"
          :class="[ratingVisualClass(item.评级), owned[name] ? 'skill-offer-upgrade' : 'skill-offer-new']"
        >
          <button
            type="button"
            class="shop-heading entry-toggle"
            :aria-expanded="expandedName === name"
            @click="toggleEntry(name)"
          >
            <InventoryIcon :svg="item.图标" kind="技能" />
            <div>
              <strong>{{ name }}</strong
              ><small class="witch-grade-label">{{ owned[name] ? '新版本' : '新技能' }} · {{ item.评级 }}</small>
            </div>
            <span class="entry-chevron" aria-hidden="true">{{ expandedName === name ? '⌃' : '⌄' }}</span>
          </button>
          <div v-if="expandedName === name" class="entry-details">
            <p>{{ item.描述 }}</p>
            <div class="shop-effect">{{ item.作用 }}</div>
            <button type="button" :disabled="busy || balance < item.价格" @click="purchase(name)">
              购买 · {{ item.价格 }} 积分
            </button>
          </div>
        </article>
      </div>
      <div v-else class="shop-list">
        <section class="skill-slot-panel">
          <strong>已启用 {{ enabledCount }} / {{ slots }} · 持有 {{ ownedEntries.length }}</strong>
          <button
            v-if="store.statData"
            class="unlock-button"
            type="button"
            :disabled="busy || balance < slotPrice"
            @click="unlockSlot"
          >
            解锁第 {{ slots + 1 }} 格 · {{ slotPrice }} 积分
          </button>
          <p v-if="balance < slotPrice" class="shop-error">解锁积分不足，需要 {{ slotPrice }} 点。</p>
          <p v-else-if="enabledCount >= slots" class="skill-slot-note">栏位已满，新购技能会先保持关闭。</p>
        </section>
        <p v-if="!ownedEntries.length" class="shop-empty">目前没有持有技能。</p>
        <article
          v-for="[name, item] in ownedEntries"
          :key="name"
          class="shop-card"
          :class="[ratingVisualClass(item.评级), !isSkillEnabled(item) && 'skill-disabled']"
        >
          <button
            type="button"
            class="shop-heading entry-toggle"
            :aria-expanded="expandedName === name"
            @click="toggleEntry(name)"
          >
            <InventoryIcon :svg="item.图标" kind="技能" />
            <div>
              <strong>{{ name }}</strong
              ><small class="witch-grade-label"
                >{{ item.评级 }} · {{ isSkillEnabled(item) ? '已启用' : '未启用' }}</small
              >
            </div>
            <span class="entry-chevron" aria-hidden="true">{{ expandedName === name ? '⌃' : '⌄' }}</span>
          </button>
          <label class="skill-enabled-checkbox">
            <input
              type="checkbox"
              :checked="isSkillEnabled(item)"
              :disabled="busy"
              :aria-label="`${isSkillEnabled(item) ? '关闭' : '启用'}技能${name}`"
              @click.prevent="toggleSkill(name, !isSkillEnabled(item))"
            />
            <span>启用</span>
          </label>
          <div v-if="expandedName === name" class="entry-details">
            <p>{{ item.描述 }}</p>
            <div class="shop-effect">{{ item.作用 }}</div>
            <small>累计价格 {{ item.价格 }} 积分</small>
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
import { enabledSkillCount, isSkillEnabled, nextSkillSlotPrice, refreshQuote, skillSlotCount } from './skillShop';
import { DIRECTED_REFRESH_SURCHARGE } from '../shopRefresh';
import InventoryIcon from '../data/InventoryIcon.vue';
import RefreshFeedback from '../witch/RefreshFeedback.vue';
import { ratingVisualClass } from '../witch/ratingVisual';

const store = useMagicGirlStatStore();
const tab = ref<'shop' | 'owned'>('shop');
const busy = ref(false);
const error = ref('');
const preference = ref('');
const directed = ref(false);
const confirmSale = ref<string | null>(null);
const expandedName = ref('');
const balance = computed(() => store.statData?.角色.user.恶堕积分 ?? 0);
const shopEntries = computed(() => Object.entries(store.statData?.技能商店 ?? {}));
const owned = computed(() => store.statData?.角色.user.技能 ?? {});
const ownedEntries = computed(() => Object.entries(owned.value));
const enabledCount = computed(() => (store.statData ? enabledSkillCount(store.statData) : 0));
const slots = computed(() => (store.statData ? skillSlotCount(store.statData) : 6));
const slotPrice = computed(() => (store.statData ? nextSkillSlotPrice(store.statData) : 0));
const quote = computed(() => {
  try {
    return store.statData ? refreshQuote(store.statData) : { price: 0, count: 0, next: '' };
  } catch {
    return { price: Number.POSITIVE_INFINITY, count: 0, next: '' };
  }
});
const refreshPrice = computed(() => quote.value.price + (directed.value ? DIRECTED_REFRESH_SURCHARGE : 0));
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
  void run(() => store.refreshSkillShop(directed.value ? preference.value.trim() : undefined));
}
function purchase(name: string) {
  void run(() => store.purchaseSkill(name));
}
function unlockSlot() {
  void run(() => store.unlockSkillSlot());
}
function toggleSkill(name: string, enabled: boolean) {
  void run(() => store.setOwnedSkillEnabled(name, enabled));
}
function sell(name: string) {
  void run(async () => {
    await store.sellOwnedSkill(name);
    confirmSale.value = null;
  });
}
</script>

<style scoped>
.shop-card.skill-disabled {
  opacity: 0.62;
  filter: grayscale(0.65);
}
.skill-enabled-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  color: #f8eef4;
  cursor: pointer;
  font-size: 11px;
}
.skill-enabled-checkbox input {
  accent-color: #dc8eb2;
}
</style>
