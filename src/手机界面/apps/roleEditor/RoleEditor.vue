<template>
  <div class="phone-role-editor">
    <header class="pre-head"><span>角色档案</span><button type="button" @click="reload">刷新</button></header>
    <div class="pre-scroll">
      <div v-if="error" class="pre-notice error" role="alert">{{ error }}</div>
      <div v-if="notice" class="pre-notice" role="status">{{ notice }}</div>

      <template v-if="!draft">
        <section class="pre-intro">
          <h1>角色编辑器</h1>
          <p>编辑角色资源并保存到主世界书。加入和替换会写入当前剧情。</p>
        </section>
        <div class="pre-create">
          <select v-model="newType" aria-label="新角色类型">
            <option value="主要角色">主要角色</option>
            <option value="次要角色">次要角色</option>
            <option value="user">主角版本</option>
          </select>
          <button type="button" @click="startNew">＋ 新建角色</button>
        </div>
        <div v-if="loading" class="pre-empty">正在读取角色资源…</div>
        <div v-else-if="!rows.length" class="pre-empty">主世界书中还没有角色资源</div>
        <button v-for="row in rows" :key="row.id" type="button" class="pre-row" @click="openRole(row.id)">
          <RoleAvatar
            :src="row.asset.meta?.avatar"
            :seed="row.asset.key"
            :fallback-style="row.asset.meta?.avatarStyle"
            :theme-color="row.asset.meta?.color"
          />
          <span class="pre-row-main"
            ><strong>{{ row.asset.key === 'user' ? '主角' : row.asset.key }}</strong>
            <small>{{ row.asset.type }} · {{ row.asset.author || '未署名版本' }}</small>
            <em>{{ row.asset.desc || '暂无简介' }}</em></span
          >
          <span class="pre-row-arrow">›</span>
        </button>
      </template>

      <template v-else>
        <button type="button" class="pre-back" @click="backToList">‹ 角色资源</button>
        <div class="pre-hero">
          <RoleAvatar
            :src="draft.meta?.avatar"
            :seed="draft.key"
            :fallback-style="draft.meta?.avatarStyle"
            :theme-color="draft.meta?.color"
          />
          <div>
            <span>{{ draft.type }} · {{ activeId ? '编辑版本' : '新角色' }}</span
            ><strong>{{ draft.key || '未命名角色' }}</strong>
          </div>
        </div>
        <div class="pre-actions">
          <button type="button" class="primary" :disabled="busy" @click="requestSave">保存资源</button>
          <button v-if="activeId" type="button" :disabled="busy || dirty" @click="requestRuntime">
            {{ runtimeExists ? '替换当前角色' : '加入当前剧情' }}
          </button>
        </div>
        <p v-if="dirty && activeId" class="pre-hint">先保存资源，再加入或替换当前剧情。</p>

        <section class="pre-card">
          <h2>角色身份</h2>
          <label
            >身份键<input v-model.trim="draft.key" :disabled="draft.type === 'user'" placeholder="角色名称"
          /></label>
          <label>作者<input v-model="draft.author" placeholder="署名" /></label>
          <label>版本说明<textarea v-model="draft.desc" rows="2" placeholder="这个版本的特点"></textarea></label>
        </section>

        <section class="pre-card">
          <h2>头像与对话主题</h2>
          <label>图片地址<input v-model="draft.meta!.avatar" placeholder="图片 URL 或资源路径" /></label>
          <label class="pre-upload"
            >上传头像<input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              @change="chooseAvatar"
          /></label>
          <label
            >主题颜色<span class="pre-color"
              ><input v-model="draft.meta!.color" type="color" /><input
                v-model="draft.meta!.color"
                pattern="#[0-9a-fA-F]{6}" /></span
          ></label>
          <label
            >无图片时的头像样式<select v-model="draft.meta!.avatarStyle">
              <option value="auto">根据角色名称</option>
              <option v-for="style in 6" :key="style" :value="String(style - 1)">样式 {{ style }}</option>
            </select></label
          >
          <p class="pre-hint">头像会用于角色档案与默认微信账号；主题颜色会用于角色对话框。</p>
        </section>

        <section class="pre-card">
          <div class="pre-section-title">
            <h2>角色内容</h2>
            <button type="button" @click="toggleFullData">{{ fullData ? '返回常用字段' : '编辑完整数据' }}</button>
          </div>
          <template v-if="fullData">
            <p class="pre-hint">完整数据必须符合角色类型结构。保存前会校验全部字段。</p>
            <textarea v-model="dataJson" class="pre-json" spellcheck="false" aria-label="完整角色数据 JSON"></textarea>
          </template>
          <template v-else-if="draft.type === 'user'">
            <label>基础信息<textarea v-model="draft.data.基础信息" rows="5"></textarea></label>
            <label>当前评级<input v-model="draft.data.当前评级" /></label>
            <label>初始金钱<input v-model.number="draft.data.金钱" type="number" /></label>
            <label>初始恶堕积分<input v-model.number="draft.data.恶堕积分" type="number" /></label>
          </template>
          <template v-else-if="draft.type === '主要角色'">
            <label>基础信息<textarea v-model="draft.data.基础信息" rows="4"></textarea></label>
            <label>性格<textarea v-model="draft.data.性格" rows="4"></textarea></label>
            <label>背景<textarea v-model="draft.data.背景" rows="4"></textarea></label>
            <label>核心创伤<textarea v-model="draft.data.核心创伤" rows="4"></textarea></label>
            <label>整体印象<textarea v-model="draft.data.外貌.整体印象" rows="3"></textarea></label>
            <label>日常外貌<textarea v-model="draft.data.外貌.日常外貌" rows="3"></textarea></label>
            <label>核心能力<textarea v-model="draft.data.魔法少女能力.核心能力" rows="4"></textarea></label>
            <label class="pre-check"><input v-model="draft.data.在场" type="checkbox" />初始在场</label>
          </template>
          <template v-else>
            <label>名称<input v-model="draft.data.名称" /></label>
            <label>简介<textarea v-model="draft.data.简介" rows="4"></textarea></label>
            <label>能力描述<textarea v-model="draft.data.能力描述" rows="4"></textarea></label>
            <label v-for="field in personalityFields" :key="field"
              >{{ field }}<textarea v-model="draft.data.性格[field]" rows="2"></textarea>
            </label>
            <label class="pre-check"><input v-model="draft.data.在场" type="checkbox" />初始在场</label>
          </template>
        </section>
      </template>
    </div>

    <div v-if="dialog" class="pre-dialog-mask" @click.self="cancelDialog">
      <section class="pre-dialog" role="dialog" aria-modal="true" :aria-label="dialog.title">
        <h2>{{ dialog.title }}</h2>
        <p>{{ dialog.body }}</p>
        <ul v-if="dialog.fields.length">
          <li v-for="field in dialog.fields" :key="field">{{ field }}</li>
        </ul>
        <div>
          <button type="button" @click="cancelDialog">取消</button
          ><button type="button" class="primary" :disabled="busy" @click="confirmDialog">{{ dialog.action }}</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { klona } from 'klona';
import RoleAvatar from '../../../尘史使徒/UI/components/common/RoleAvatar.vue';
import {
  applyPhoneRoleToRuntime,
  getPhoneRuntimeRoles,
  loadPhoneRoleAssets,
  savePhoneRoleAsset,
  validateRoleAsset,
  type PhoneRoleAsset,
  type PhoneRoleRegistry,
  type PhoneRoleType,
} from './roleAssets';

const emit = defineEmits<{ dirty: [value: boolean]; leave: [] }>();
const registry = ref<PhoneRoleRegistry>({});
const runtime = ref<Record<string, any>>({});
const activeId = ref('');
const draft = ref<PhoneRoleAsset | null>(null);
const originalJson = ref('');
const loading = ref(false);
const busy = ref(false);
const error = ref('');
const notice = ref('');
const newType = ref<PhoneRoleType>('主要角色');
const fullData = ref(false);
const dataJson = ref('');
const personalityFields = ['社交表现', '行动逻辑', '思维习惯', '人际距离', '道德底色'] as const;
type Dialog = { kind: 'save' | 'runtime' | 'discard'; title: string; body: string; action: string; fields: string[] };
const dialog = ref<Dialog | null>(null);
const leaving = ref(false);
const refreshing = ref(false);
const rows = computed(() => Object.entries(registry.value).map(([id, asset]) => ({ id, asset })));
const dirty = computed(
  () =>
    !!draft.value &&
    (JSON.stringify(draft.value) !== originalJson.value ||
      (fullData.value && dataJson.value !== JSON.stringify(draft.value.data, null, 2))),
);
watch(dirty, value => emit('dirty', value), { immediate: true });
const runtimeExists = computed(() => {
  const asset = draft.value;
  if (!asset) return false;
  return asset.type === 'user'
    ? !!runtime.value.user && Object.keys(runtime.value.user).length > 0
    : Object.hasOwn(runtime.value[asset.type] ?? {}, asset.key);
});

function defaultData(type: PhoneRoleType): Record<string, any> {
  if (type === 'user') return { 基础信息: '', 当前评级: '', 金钱: 0, 恶堕积分: 0, 技能: {}, 物品: {} };
  if (type === '次要角色')
    return {
      名称: '',
      名称检索词: ['$all'],
      区域检索词: ['$all'],
      在场: false,
      简介: '',
      性格: Object.fromEntries(personalityFields.map(field => [field, ''])),
      能力描述: '',
    };
  const part = () => ({ 当前状态: '', 当前等级: 0, 累计经验: 0, 特征: '', 描述: {} });
  const stage = () => ({ 当前等级: 0, 累计经验: 0, 描述: {} });
  return {
    在场: false,
    是否变身魔法少女: false,
    名称检索词: ['$all'],
    区域检索词: ['$all'],
    基础信息: '',
    外貌: { 整体印象: '', 日常外貌: '', 魔法少女形态: { 正常: '', 恶堕: '' } },
    身体: { 特殊状态: [], 开发状态: { 小穴: part(), 口穴: part(), 菊穴: part(), 胸部: part() } },
    性格: '',
    背景: '',
    核心创伤: '',
    人设阶段: { 创伤稳定度: stage(), 好感度: stage(), 恶堕度: stage() },
    魔法少女能力: { 基础能力: '', 核心能力: '', 核心能力限制: {} },
  };
}
function setDraft(id: string, asset: PhoneRoleAsset | null) {
  activeId.value = id;
  draft.value = asset
    ? { ...klona(asset), meta: klona(asset.meta ?? { avatar: '', color: '#C9B485', avatarStyle: 'auto' }) }
    : null;
  originalJson.value = asset ? JSON.stringify(asset) : '';
  dataJson.value = asset ? JSON.stringify(asset.data, null, 2) : '';
  fullData.value = false;
  error.value = '';
  notice.value = '';
}
async function reload() {
  if (dirty.value) {
    refreshing.value = true;
    dialog.value = {
      kind: 'discard',
      title: '放弃未保存修改？',
      body: '刷新会丢弃当前草稿。',
      action: '放弃并刷新',
      fields: [],
    };
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    registry.value = await loadPhoneRoleAssets();
    runtime.value = await getPhoneRuntimeRoles();
    setDraft('', null);
  } catch (cause) {
    error.value = messageOf(cause);
  } finally {
    loading.value = false;
  }
}
function startNew() {
  const type = newType.value;
  const asset: PhoneRoleAsset = {
    author: '',
    key: type === 'user' ? 'user' : '',
    desc: '',
    type,
    meta: { avatar: '', color: '#C9B485', avatarStyle: 'auto' },
    data: defaultData(type),
  };
  setDraft('', asset);
}
function openRole(id: string) {
  setDraft(id, registry.value[id]);
}
function backToList() {
  if (dirty.value)
    dialog.value = {
      kind: 'discard',
      title: '放弃未保存修改？',
      body: '返回列表会丢弃当前草稿。',
      action: '放弃并返回',
      fields: [],
    };
  else setDraft('', null);
}
function requestLeave() {
  if (!dirty.value) {
    emit('leave');
    return;
  }
  leaving.value = true;
  dialog.value = {
    kind: 'discard',
    title: '放弃未保存修改？',
    body: '返回桌面会丢弃当前角色草稿。',
    action: '放弃并返回',
    fields: [],
  };
}
function toggleFullData() {
  if (!draft.value) return;
  if (fullData.value) {
    try {
      draft.value.data = JSON.parse(dataJson.value);
      fullData.value = false;
      error.value = '';
    } catch (cause) {
      error.value = `完整数据不是有效 JSON：${messageOf(cause)}`;
    }
  } else {
    dataJson.value = JSON.stringify(draft.value.data, null, 2);
    fullData.value = true;
  }
}
function candidate(): PhoneRoleAsset {
  if (!draft.value) throw new Error('没有待保存角色。');
  const next = klona(draft.value);
  if (fullData.value) {
    try {
      next.data = JSON.parse(dataJson.value);
    } catch (cause) {
      throw new Error(`完整数据不是有效 JSON：${messageOf(cause)}`);
    }
  }
  if (!next.key.trim()) throw new Error('请填写角色身份键。');
  if (next.type === '次要角色' && !next.data.名称) next.data.名称 = next.key;
  return validateRoleAsset(next);
}
function requestSave() {
  try {
    const next = candidate();
    const before = activeId.value ? registry.value[activeId.value] : undefined;
    const fields = before ? changedFields(before, next) : ['新建角色资源'];
    if (!fields.length) {
      notice.value = '没有需要保存的修改。';
      return;
    }
    dialog.value = {
      kind: 'save',
      title: '保存到主世界书',
      body: `将${next.key}的角色资源写入主世界书。当前剧情角色不会自动改变。`,
      action: '确认保存',
      fields,
    };
  } catch (cause) {
    error.value = messageOf(cause);
  }
}
function requestRuntime() {
  if (!draft.value || !activeId.value) return;
  if (dirty.value) {
    error.value = '请先保存角色资源，再加入或替换当前剧情。';
    return;
  }
  const before = draft.value.type === 'user' ? runtime.value.user : runtime.value[draft.value.type]?.[draft.value.key];
  const after = { ...draft.value.data, meta: draft.value.meta };
  const fields = before ? changedFields(before, after) : [];
  dialog.value = {
    kind: 'runtime',
    title: runtimeExists.value ? '替换当前角色' : '加入当前剧情',
    body: runtimeExists.value
      ? '当前角色的全部数据会被这个资源版本替换，微信头像也会同步。'
      : '角色会加入当前剧情，并生成对应微信账号与头像。',
    action: runtimeExists.value ? '确认替换' : '确认加入',
    fields,
  };
}
async function confirmDialog() {
  const action = dialog.value;
  if (!action) return;
  dialog.value = null;
  if (action.kind === 'discard') {
    if (leaving.value) {
      leaving.value = false;
      emit('leave');
    } else if (refreshing.value) {
      refreshing.value = false;
      setDraft('', null);
      await reload();
    } else setDraft('', null);
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    if (action.kind === 'save') {
      const next = candidate();
      const id = activeId.value || crypto.randomUUID();
      await savePhoneRoleAsset(id, next, activeId.value ? registry.value[id] : undefined);
      registry.value = await loadPhoneRoleAssets();
      setDraft(id, registry.value[id]);
      notice.value = '角色资源已保存到主世界书。';
    } else if (draft.value) {
      const latest = await loadPhoneRoleAssets();
      if (JSON.stringify(latest[activeId.value]) !== JSON.stringify(registry.value[activeId.value]))
        throw new Error('角色资源已被其他编辑修改，请刷新后再加入或替换。');
      const wasExisting = runtimeExists.value;
      await applyPhoneRoleToRuntime(draft.value, wasExisting);
      runtime.value = await getPhoneRuntimeRoles();
      notice.value = wasExisting ? '当前剧情角色已替换。' : '角色已加入当前剧情。';
    }
  } catch (cause) {
    error.value = messageOf(cause);
  } finally {
    busy.value = false;
  }
}
function chooseAvatar(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !draft.value) return;
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const context = canvas.getContext('2d');
      if (!context) {
        error.value = '无法处理头像图片。';
        return;
      }
      const side = Math.min(image.width, image.height);
      context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 256, 256);
      if (draft.value) draft.value.meta!.avatar = canvas.toDataURL('image/png');
    };
    image.onerror = () => {
      error.value = '头像不是可读取的图片。';
    };
    image.src = String(reader.result ?? '');
  };
  reader.onerror = () => {
    error.value = '无法读取头像文件。';
  };
  reader.readAsDataURL(file);
}
function messageOf(cause: unknown) {
  return cause instanceof Error ? cause.message : String(cause);
}
function changedFields(before: Record<string, any>, after: Record<string, any>): string[] {
  const changes: string[] = [];
  const walk = (left: any, right: any, path: string) => {
    if (JSON.stringify(left) === JSON.stringify(right)) return;
    if (isRecord(left) && isRecord(right)) {
      for (const key of new Set([...Object.keys(left), ...Object.keys(right)]))
        walk(left[key], right[key], path ? `${path}.${key}` : key);
    } else changes.push(`${path}：${short(left)} → ${short(right)}`);
  };
  walk(before, after, '');
  return changes;
}
function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function short(value: unknown): string {
  const text = value === undefined ? '未设置' : JSON.stringify(value);
  return text.length > 42 ? `${text.slice(0, 42)}…` : text;
}
function cancelDialog() {
  dialog.value = null;
  leaving.value = false;
  refreshing.value = false;
}

onMounted(reload);
defineExpose({ requestLeave });
</script>

<style src="./roleEditor.css"></style>
