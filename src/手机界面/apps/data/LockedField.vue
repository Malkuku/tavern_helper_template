<template>
  <section class="data-card locked-field">
    <div class="item-heading">
      <h3>{{ field }}</h3>
      <span v-if="unlocked" class="unlock-mark">已解锁</span>
      <span v-else class="lock-mark">未解锁</span>
    </div>
    <slot v-if="unlocked" />
    <template v-else>
      <p class="lock-caption">解锁后可查看这项角色档案。</p>
      <button class="unlock-button" type="button" :disabled="busy || balance < price" @click="unlock">
        {{ busy ? '解锁中…' : `花费 ${price} 恶堕积分解锁` }}
      </button>
      <p v-if="balance < price" class="lock-balance">当前 {{ balance }} 点，积分不足</p>
    </template>
    <p v-if="error" class="data-error" role="alert">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMagicGirlStatStore } from '../../store/StatStore';
import { unlockPrice, type CharacterKind } from './profileUnlock';

const props = defineProps<{ kind: CharacterKind; characterKey: string; field: string }>();
const statStore = useMagicGirlStatStore();
const busy = ref(false);
const error = ref('');
const price = computed(() => unlockPrice(props.kind, props.field) ?? 0);
const balance = computed(() => statStore.statData?.角色?.user?.恶堕积分 ?? 0);
const unlocked = computed(() =>
  (statStore.statData?.手机?.档案解锁?.[props.kind]?.[props.characterKey] ?? []).includes(props.field),
);
async function unlock() {
  busy.value = true;
  error.value = '';
  try {
    await statStore.unlockCharacterInfo(props.kind, props.characterKey, props.field);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '解锁失败，请重试。';
  } finally {
    busy.value = false;
  }
}
</script>
