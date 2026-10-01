<template>
  <main class="archive">
    <header class="archive-header">
      <span class="eyebrow">MAGICAL GIRL · NEW ENCOUNTER</span>
      <h1>新人物档案</h1>
      <p>故事里值得记住的人，会在这里留下记录。</p>
    </header>

    <p v-if="inputError" class="notice error" role="alert">{{ inputError }}</p>
    <p v-else-if="!characters.length" class="notice">本轮没有需要记录的新角色。</p>
    <template v-else>
      <nav v-if="characters.length > 1" class="character-list" aria-label="选择角色">
        <button
          v-for="character in characters"
          :key="character.名称"
          type="button"
          :class="{ active: selectedName === character.名称 }"
          :aria-pressed="selectedName === character.名称"
          @click="
            selectedName = character.名称;
            feedback = '';
          "
        >
          <span class="star">✦</span>{{ character.名称 }}
        </button>
      </nav>

      <article v-if="currentCharacter" class="profile">
        <div class="profile-top">
          <div>
            <span class="eyebrow"
              >人物观测 /
              {{ String(characters.findIndex(item => item.名称 === selectedName) + 1).padStart(2, '0') }}</span
            >
            <h2>{{ currentCharacter.名称 }}</h2>
            <p class="role-rating">当前评级：{{ currentCharacter.当前评级 || '未记录' }}</p>
            <div v-if="currentCharacter.身份.length" class="identity-list">
              <span v-for="(identity, index) in currentCharacter.身份" :key="index">{{ identity }}</span>
            </div>
          </div>
          <span class="seal" aria-hidden="true">✧</span>
        </div>

        <nav class="detail-tabs" aria-label="角色档案分页">
          <button
            v-for="tab in detailTabs"
            :key="tab"
            type="button"
            :class="{ active: currentDetailTab === tab }"
            :aria-pressed="currentDetailTab === tab"
            @click="currentDetailTab = tab"
          >
            {{ tab }}
          </button>
        </nav>
        <div class="profile-grid">
          <template v-if="currentDetailTab === '人物概览'">
            <section class="field">
              <h3>背景</h3>
              <p>{{ currentCharacter.背景 || '暂无记录' }}</p>
            </section>
            <section class="field">
              <h3>外貌</h3>
              <p>{{ currentCharacter.外貌 || '暂无记录' }}</p>
            </section>
          </template>
          <template v-else-if="currentDetailTab === '性格与状态'">
            <section class="field">
              <h3>性格</h3>
              <p>{{ currentCharacter.性格 || '暂无记录' }}</p>
            </section>
            <section class="field">
              <h3>身体状态</h3>
              <p v-if="currentCharacter.身体.特殊状态.length">
                特殊状态：{{ currentCharacter.身体.特殊状态.join('、') }}
              </p>
              <ul>
                <li v-for="part in ['小穴', '口穴', '菊穴', '胸部']" :key="part">
                  {{ part }}：{{ currentCharacter.身体[part].当前状态 || '暂无记录' }}； 开发程度：{{
                    currentCharacter.身体[part].开发程度 || '暂无记录'
                  }}
                </li>
              </ul>
            </section>
          </template>
          <section v-else class="field full-width">
            <h3>能力描述</h3>
            <ul v-if="currentCharacter.能力描述.length">
              <li v-for="(ability, index) in currentCharacter.能力描述" :key="index">{{ ability }}</li>
            </ul>
            <p v-else>暂无记录</p>
          </section>
        </div>

        <footer class="profile-footer">
          <div class="record-info">
            <span>名称检索词：{{ currentCharacter.名称检索词.join('、') || '暂无记录' }}</span>
            <span>收录区域：{{ currentMapIndex || '未定位' }}</span>
          </div>
          <button type="button" class="record-button" :disabled="isRecorded || isSaving" @click="recordCharacter">
            {{ isRecorded ? '已收录' : isSaving ? '正在收录…' : '收录人物' }}
          </button>
        </footer>
        <p v-if="feedback" class="feedback" role="status">{{ feedback }}</p>
      </article>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { MvuUtil } from '@/Utils/MvuUtil';
import { completeMinorRole, loadMinorStageTemplates } from '../手机界面/store/minorStages';

// 世界书的 <MinorCharInfo> 捕获组：{ "角色": [{ "名称": "…", ... }] }。
const rawJson = $1 || {};
const listFields = ['名称检索词', '身份', '能力描述'];
const textFields = ['背景', '外貌', '性格'];
const bodyParts = ['小穴', '口穴', '菊穴', '胸部'];
const validBody = body =>
  body &&
  typeof body === 'object' &&
  !Array.isArray(body) &&
  Array.isArray(body.特殊状态) &&
  body.特殊状态.every(state => typeof state === 'string') &&
  bodyParts.every(part => ['当前状态', '特征', '开发程度'].every(field => typeof body[part]?.[field] === 'string'));
const source = rawJson && typeof rawJson === 'object' && !Array.isArray(rawJson) ? rawJson.角色 : null;
const isValidCharacter = character =>
  character &&
  typeof character === 'object' &&
  !Array.isArray(character) &&
  typeof character.名称 === 'string' &&
  character.名称.trim() !== '' &&
  listFields.every(
    field => Array.isArray(character[field]) && character[field].every(item => typeof item === 'string'),
  ) &&
  textFields.every(field => typeof character[field] === 'string') &&
  validBody(character.身体) &&
  (character.当前评级 === undefined || typeof character.当前评级 === 'string');
const inputError =
  !Array.isArray(source) ||
  source.some(character => !isValidCharacter(character)) ||
  new Set(source.map(character => character.名称)).size !== source.length
    ? '角色数据格式不符合次要角色生成规则，无法收录。'
    : '';
const characters = inputError ? [] : source;
const selectedName = ref(characters[0]?.名称 ?? '');
const detailTabs = ['人物概览', '性格与状态', '能力档案'];
const currentDetailTab = ref(detailTabs[0]);
const globalMvuData = ref(null);
const isSaving = ref(false);
const feedback = ref('');
watch(selectedName, () => {
  currentDetailTab.value = detailTabs[0];
});

const currentCharacter = computed(() => characters.find(character => character.名称 === selectedName.value));
const currentMapIndex = computed(() => {
  const index = globalMvuData.value?.stat_data?.世界?.地图索引;
  return typeof index === 'string' ? index : '';
});
const isRecorded = computed(() => {
  const roles = globalMvuData.value?.stat_data?.角色;
  return Boolean(roles?.次要角色?.[selectedName.value] || roles?.主要角色?.[selectedName.value]);
});

function fetchGlobalData() {
  try {
    globalMvuData.value = Mvu.getMvuData({ type: 'message', message_id: -1 });
  } catch (error) {
    globalMvuData.value = null;
    feedback.value = `读取当前角色数据失败：${String(error)}`;
  }
}

async function recordCharacter() {
  if (!currentCharacter.value || isSaving.value) return;
  const chatId = SillyTavern.getCurrentChatId();
  isSaving.value = true;
  feedback.value = '';
  try {
    fetchGlobalData();
    if (!globalMvuData.value?.stat_data?.角色) throw new Error('当前楼层缺少角色数据');
    if (isRecorded.value) throw new Error('该角色已存在，原有档案不会被覆盖');
    const minorTemplate = await loadMinorStageTemplates();
    if (SillyTavern.getCurrentChatId() !== chatId) throw new Error('聊天已切换，请在当前剧情重新收录');
    fetchGlobalData();
    if (!globalMvuData.value?.stat_data?.角色) throw new Error('当前楼层缺少角色数据');
    if (isRecorded.value) throw new Error('该角色已存在，原有档案不会被覆盖');

    const { 名称, 名称检索词, 身份, 当前评级, 背景, 外貌, 性格, 身体, 能力描述 } = currentCharacter.value;
    await MvuUtil.updateMvuDataByDiff({
      角色: {
        次要角色: {
          [名称]: completeMinorRole(
            {
              名称检索词: [...名称检索词],
              区域检索词: currentMapIndex.value ? [currentMapIndex.value] : [],
              在场: true,
              身份: [...身份],
              当前评级: 当前评级 ?? '',
              背景,
              外貌,
              性格,
              身体: structuredClone(身体),
              能力描述: [...能力描述],
            },
            minorTemplate,
          ),
        },
      },
    });
    fetchGlobalData();
    feedback.value = `${名称}已收录到当前剧情。`;
  } catch (error) {
    feedback.value = `收录失败：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  fetchGlobalData();
  addEventListener('mag_variable_update_ended', fetchGlobalData);
});
onUnmounted(() => removeEventListener('mag_variable_update_ended', fetchGlobalData));
</script>

<style scoped>
.archive {
  --archive-bg: #1c1322;
  --archive-surface: #27172b;
  --archive-line: #513249;
  --archive-text: #f8eef4;
  --archive-muted: #b49eae;
  --archive-accent: #f08bb7;
  box-sizing: border-box;
  width: min(100%, 720px);
  margin: 0 auto;
  padding: 8px;
  color: var(--archive-text);
  font:
    13px/1.6 -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    'Noto Sans SC',
    sans-serif;
  overflow-wrap: anywhere;
}
.archive * {
  box-sizing: border-box;
}
.archive-header {
  margin: 0 2px 12px;
}
.eyebrow {
  color: var(--archive-accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
}
h1,
h2,
h3,
p,
ul {
  margin-top: 0;
}
h1 {
  margin: 2px 0 0;
  font-size: 21px;
  line-height: 1.35;
  letter-spacing: 0.04em;
}
.archive-header p {
  margin-bottom: 0;
  color: var(--archive-muted);
  font-size: 12px;
}
.character-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
button {
  font: inherit;
  cursor: pointer;
}
.character-list button {
  padding: 5px 10px;
  border: 1px solid var(--archive-line);
  border-radius: 6px;
  background: var(--archive-bg);
  color: var(--archive-muted);
}
.character-list button.active {
  border-color: #a65780;
  background: #382033;
  color: var(--archive-text);
}
.star {
  margin-right: 5px;
  color: var(--archive-accent);
}
.profile {
  overflow: hidden;
  border: 1px solid var(--archive-line);
  border-radius: 12px;
  background: var(--archive-bg);
  box-shadow: 0 8px 24px #100b1640;
}
.profile-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  background: linear-gradient(110deg, var(--archive-bg) 35%, #382033);
}
.profile-top h2 {
  margin: 3px 0;
  font-size: 21px;
  line-height: 1.35;
}
.role-rating {
  margin-bottom: 4px;
  color: var(--archive-muted);
}
.seal {
  display: grid;
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid #a65780;
  border-radius: 50%;
  color: var(--archive-accent);
  font-size: 24px;
}
.identity-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.identity-list span {
  padding: 2px 7px;
  border: 1px solid var(--archive-line);
  border-radius: 4px;
  background: #382033;
  color: #f5b7d2;
  font-size: 11px;
}
.detail-tabs {
  display: flex;
  border-top: 1px solid var(--archive-line);
  border-bottom: 1px solid var(--archive-line);
}
.detail-tabs button {
  flex: 1 1 0;
  min-width: 0;
  padding: 8px 4px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--archive-muted);
}
.detail-tabs button.active {
  border-bottom-color: var(--archive-accent);
  background: #382033;
  color: var(--archive-text);
  font-weight: 700;
}
.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 12px;
}
.field {
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid var(--archive-line);
  border-radius: 8px;
  background: var(--archive-surface);
}
.field.full-width {
  grid-column: 1 / -1;
}
.field h3 {
  margin-bottom: 4px;
  color: var(--archive-accent);
  font-size: 12px;
  letter-spacing: 0.04em;
}
.field p,
.field li {
  margin-bottom: 0;
  line-height: 1.65;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.field ul {
  display: grid;
  gap: 4px;
  margin-bottom: 0;
  padding-left: 1.2em;
}
.field li::marker {
  color: var(--archive-accent);
}
.profile-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-top: 1px solid var(--archive-line);
}
.record-info {
  display: grid;
  gap: 2px;
  min-width: 0;
  color: var(--archive-muted);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.record-button {
  flex: 0 0 auto;
  padding: 7px 14px;
  border: 0;
  border-radius: 6px;
  background: #cc427e;
  color: #fff;
  font-weight: 700;
}
.record-button:hover:not(:disabled) {
  background: #df5b94;
}
.record-button:disabled {
  background: #382033;
  color: var(--archive-muted);
  cursor: default;
}
button:focus-visible {
  outline: 2px solid var(--archive-accent);
  outline-offset: 2px;
}
.feedback {
  margin: 0;
  padding: 0 12px 12px;
  color: #f5b7d2;
}
.notice {
  padding: 16px;
  border: 1px dashed var(--archive-line);
  border-radius: 8px;
  background: var(--archive-bg);
  color: var(--archive-muted);
}
.notice.error {
  color: #ff9dbb;
}
@media (max-width: 520px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
  .detail-tabs button {
    padding: 8px 2px;
    font-size: 12px;
  }
  .field.full-width {
    grid-column: auto;
  }
  .profile-top {
    padding: 12px;
  }
  .profile-footer {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
