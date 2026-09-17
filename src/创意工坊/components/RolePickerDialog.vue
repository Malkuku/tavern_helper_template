<template>
  <div v-if="open" class="picker-backdrop" @click.self="cancel">
    <section class="picker" role="dialog" aria-modal="true" aria-labelledby="role-picker-title">
      <header>
        <div><p>CAST LIBRARY</p><h2 id="role-picker-title">组建角色阵容</h2></div>
        <button type="button" aria-label="关闭" @click="cancel">×</button>
      </header>
      <div class="toolbar">
        <input v-model="query" type="search" placeholder="搜索角色、作者或简介" />
        <div class="types">
          <button v-for="value in roleTypes" :key="value" type="button" :class="{ active: type === value }" @click="type = value">
            {{ value || '全部' }}
          </button>
        </div>
      </div>
      <div class="picker-body">
        <div class="identity-list">
          <button
            v-for="group in filteredGroups"
            :key="group.identity"
            type="button"
            class="identity-card"
            :class="{ active: focusedIdentity === group.identity, selected: selectedIdentity(group.identity) }"
            @click="focusedIdentity = group.identity"
          >
            <RoleAvatar class="avatar" :src="group.items[0].entry.meta?.avatar" :alt="group.title" :seed="group.items[0].entry.key" :fallback-style="group.items[0].entry.meta?.avatarStyle" />
            <span><strong>{{ group.title }}</strong><small>{{ group.type }} · {{ group.items.length }} 个版本</small><em>{{ group.summary }}</em></span>
            <b>{{ selectedIdentity(group.identity) ? '已选' : '选择' }}</b>
          </button>
          <p v-if="!filteredGroups.length" class="empty">没有符合条件的角色。</p>
        </div>
        <aside v-if="focused" class="detail">
          <div class="portrait">
            <RoleAvatar class="detail-avatar" :src="focused.items[0].entry.meta?.avatar" :alt="focused.title" :seed="focused.items[0].entry.key" :fallback-style="focused.items[0].entry.meta?.avatarStyle" />
            <div><p>{{ focused.type }}</p><h3>{{ focused.title }}</h3><span>{{ focused.summary }}</span></div>
          </div>
          <h4>选择版本</h4>
          <button
            v-for="item in focused.items"
            :key="item.id"
            type="button"
            class="version-card"
            :class="{ active: selected.includes(item.id) }"
            @click="choose(item.id)"
          >
            <span><strong>{{ item.entry.author || '未署名版本' }}</strong><small>{{ item.entry.desc || roleSummary(item.entry) }}</small></span>
            <b>{{ selected.includes(item.id) ? '✓ 已选择' : '选择此版本' }}</b>
          </button>
          <button v-if="selectedIdentity(focused.identity) && focused.type !== 'user'" type="button" class="remove" @click="removeIdentity(focused.identity)">从阵容移除</button>
        </aside>
        <aside v-else class="detail empty">选择左侧角色查看版本与档案摘要。</aside>
      </div>
      <footer>
        <div class="selection"><span>当前阵容</span><b>{{ selected.length }} 人</b><small>{{ selectedNames }}</small></div>
        <button type="button" @click="cancel">取消</button><button type="button" class="primary" @click="confirm">确认阵容</button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import RoleAvatar from '../../尘史使徒/UI/components/common/RoleAvatar.vue';
import { normalizeRoleSelection } from '../assets/model';
import { assetTitle } from '../assets/presentation';
import type { ScenarioSourceBundle, TypedCollectionEntry } from '../scenario/types';

const props = defineProps<{ open: boolean; modelValue: string[]; source: ScenarioSourceBundle }>();
const emit = defineEmits<{ cancel: []; 'update:modelValue': [value: string[]] }>();
const query = ref(''), type = ref(''), selected = ref<string[]>([]), focusedIdentity = ref('');
const roleTypes = ['', 'user', '主要角色', '次要角色'];
const identityOf = (role: TypedCollectionEntry) => role.type === 'user' ? 'user' : `${role.type}\u0000${role.key}`;
const groups = computed(() => {
  const map = new Map<string, { id: string; entry: TypedCollectionEntry }[]>();
  for (const [id, entry] of Object.entries(props.source.registries.角色)) {
    const identity = identityOf(entry);
    map.set(identity, [...(map.get(identity) ?? []), { id, entry }]);
  }
  return [...map.entries()].map(([identity, items]) => ({
    identity, items, type: items[0].entry.type, title: assetTitle('角色', items[0].entry),
    summary: roleSummary(items[0].entry),
    terms: items.map(item => `${assetTitle('角色', item.entry)} ${item.entry.author} ${item.entry.desc}`).join(' ').toLowerCase(),
  }));
});
const filteredGroups = computed(() => groups.value.filter(group => (!type.value || group.type === type.value) && group.terms.includes(query.value.toLowerCase())));
const focused = computed(() => groups.value.find(group => group.identity === focusedIdentity.value));
const selectedNames = computed(() => selected.value.map(id => assetTitle('角色', props.source.registries.角色[id])).join('、') || '尚未选择');
watch(() => props.open, open => {
  if (!open) return;
  selected.value = normalizeRoleSelection(props.modelValue, props.source.registries.角色);
  const first = selected.value[0] ? identityOf(props.source.registries.角色[selected.value[0]]) : groups.value[0]?.identity;
  focusedIdentity.value = first ?? '';
}, { immediate: true });
function roleSummary(role: TypedCollectionEntry) {
  const data = role.data as Record<string, any>;
  return String(role.type === '次要角色' ? data.简介 : data.当前身份 || data.外貌概括 || role.desc || '暂无角色简介');
}
function selectedIdentity(identity: string) { return selected.value.some(id => identityOf(props.source.registries.角色[id]) === identity); }
function choose(id: string) {
  const identity = identityOf(props.source.registries.角色[id]);
  selected.value = [...selected.value.filter(current => identityOf(props.source.registries.角色[current]) !== identity), id];
}
function removeIdentity(identity: string) { selected.value = selected.value.filter(id => identityOf(props.source.registries.角色[id]) !== identity); }
function cancel() { emit('cancel'); }
function confirm() { emit('update:modelValue', selected.value); }
</script>

<style scoped>
.picker-backdrop{position:fixed;inset:0;z-index:21000;display:grid;place-items:center;padding:22px;background:#050607e8;backdrop-filter:blur(10px)}
.picker{display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;width:min(1180px,100%);height:min(88dvh,850px);overflow:hidden;color:#eee7d8;background:#111416;border:1px solid #82704b;box-shadow:0 32px 100px #000}
.picker>header,.toolbar,.picker>footer{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 20px;border-bottom:1px solid #34383a}.picker>header h2,.picker>header p{margin:0}.picker>header p{color:#cbb477;font-size:10px;letter-spacing:.18em}.picker>header>button{font-size:24px}.toolbar input{max-width:420px}.types{display:flex;gap:6px;flex-wrap:wrap}.types .active{color:#17130c!important;background:#cbb477!important}.picker-body{display:grid;grid-template-columns:minmax(340px,.9fr) minmax(420px,1.1fr);min-height:0}.identity-list{display:grid;align-content:start;gap:8px;overflow:auto;padding:14px;border-right:1px solid #34383a}.identity-card{display:grid!important;grid-template-columns:auto 1fr auto;gap:13px;align-items:center;text-align:left!important;background:#181c1e!important}.identity-card.active{border-color:#cbb477!important;background:#22241f!important}.identity-card.selected{box-shadow:inset 3px 0 #72b58a}.identity-card>span{display:grid;gap:3px;min-width:0}.identity-card small,.identity-card em{overflow:hidden;color:#a9a293;font-style:normal;text-overflow:ellipsis;white-space:nowrap}.avatar{--avatar-size:54px}.detail{overflow:auto;padding:24px;background:radial-gradient(circle at 80% 0,rgba(203,180,119,.1),transparent 35%)}.portrait{display:flex;align-items:center;gap:18px;margin-bottom:24px}.portrait h3,.portrait p{margin:0}.portrait p{color:#cbb477}.portrait span{color:#b8b09f}.detail-avatar{--avatar-size:92px}.detail h4{color:#cbb477}.version-card{display:flex!important;align-items:center;justify-content:space-between;width:100%;margin:8px 0;padding:14px!important;text-align:left!important}.version-card span{display:grid;gap:5px}.version-card small{color:#aaa}.version-card.active{border-color:#72b58a!important;background:#1e2b24!important}.remove{margin-top:18px;color:#efb0a7!important}.picker>footer{border-top:1px solid #34383a;border-bottom:0}.selection{display:grid;gap:2px;min-width:0;margin-right:auto}.selection small{max-width:600px;overflow:hidden;color:#aaa;text-overflow:ellipsis;white-space:nowrap}.empty{color:#9d9689}
@media(max-width:760px){.picker-backdrop{align-items:stretch;padding:0}.picker{width:100%;height:100dvh}.toolbar{align-items:stretch;flex-direction:column}.picker-body{display:block;overflow:auto}.identity-list{overflow:visible;border-right:0}.detail{overflow:visible;border-top:1px solid #34383a}.picker>footer{padding-bottom:calc(14px + env(safe-area-inset-bottom))}.selection small{max-width:180px}}
</style>
