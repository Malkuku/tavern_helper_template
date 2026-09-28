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
              <h3>身体开发状态</h3>
              <ul v-if="currentCharacter.身体开发状态.length">
                <li v-for="(state, index) in currentCharacter.身体开发状态" :key="index">{{ state }}</li>
              </ul>
              <p v-else>暂无记录</p>
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
import { completeMinorRole, loadMinorCorruptionTemplate } from '../手机界面/store/minorCorruption';

// 世界书的 <MinorCharInfo> 捕获组：{ "角色": [{ "名称": "…", ... }] }。
const rawJson = $1 || {};
const listFields = ['名称检索词', '身份', '身体开发状态', '能力描述'];
const textFields = ['背景', '外貌', '性格'];
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
    const minorTemplate = await loadMinorCorruptionTemplate();
    if (SillyTavern.getCurrentChatId() !== chatId) throw new Error('聊天已切换，请在当前剧情重新收录');
    fetchGlobalData();
    if (!globalMvuData.value?.stat_data?.角色) throw new Error('当前楼层缺少角色数据');
    if (isRecorded.value) throw new Error('该角色已存在，原有档案不会被覆盖');

    const { 名称, 名称检索词, 身份, 当前评级, 背景, 外貌, 性格, 身体开发状态, 能力描述 } = currentCharacter.value;
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
              身体开发状态: [...身体开发状态],
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
  box-sizing: border-box;
  min-height: 100vh;
  padding: clamp(20px, 5vw, 52px);
  background: radial-gradient(circle at 92% 2%, #f6dce9 0, transparent 32%), #f9f7fb;
  color: #303047;
  font-family: 'Microsoft YaHei', sans-serif;
}
.archive-header,
.profile,
.character-list,
.notice {
  max-width: 900px;
  margin-right: auto;
  margin-left: auto;
}
.archive-header {
  margin-bottom: 28px;
}
.eyebrow {
  color: #9b688a;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
}
h1,
h2,
h3,
p,
ul {
  margin-top: 0;
}
h1 {
  margin: 10px 0;
  font-size: clamp(1.8rem, 4vw, 2.7rem);
  letter-spacing: 0.08em;
}
.archive-header p {
  margin-bottom: 0;
  color: #777589;
}
.character-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
button {
  font: inherit;
  cursor: pointer;
}
.character-list button {
  padding: 9px 15px;
  border: 1px solid #e9dbe6;
  border-radius: 999px;
  background: white;
  color: #68556d;
}
.character-list button.active {
  border-color: #c27fa7;
  background: #faeaf3;
  color: #823e6c;
}
.star {
  margin-right: 7px;
  color: #ce8aa8;
}
.profile {
  overflow: hidden;
  border: 1px solid #e8dce8;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 18px 55px #6b456414;
}
.profile-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 30px;
  background: linear-gradient(110deg, #fff 35%, #fff0f7);
}
.profile-top h2 {
  margin: 8px 0 12px;
  font-size: 1.8rem;
}
.seal {
  display: grid;
  flex: 0 0 64px;
  width: 64px;
  height: 64px;
  place-items: center;
  border: 1px solid #e8b8d1;
  border-radius: 50%;
  color: #bb729c;
  font-size: 2.2rem;
}
.identity-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.identity-list span {
  padding: 5px 9px;
  border-radius: 6px;
  background: #f7eaf2;
  color: #80516f;
  font-size: 0.78rem;
}
.detail-tabs {
  display: flex;
  border-top: 1px solid #eee5ee;
  border-bottom: 1px solid #eee5ee;
}
.detail-tabs button {
  flex: 1 1 0;
  min-width: 0;
  padding: 14px 8px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: #fff;
  color: #777589;
}
.detail-tabs button.active {
  border-bottom-color: #aa6592;
  background: #fcf4f9;
  color: #823e6c;
  font-weight: 700;
}
.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 20px 30px 30px;
}
.field {
  min-width: 0;
  padding: 18px;
  border: 1px solid #eee5ee;
  border-radius: 12px;
  background: #fcfafd;
}
.field.full-width {
  grid-column: 1 / -1;
}
.field h3 {
  margin-bottom: 10px;
  color: #995c86;
  font-size: 0.88rem;
  letter-spacing: 0.08em;
}
.field p,
.field li {
  margin-bottom: 0;
  line-height: 1.8;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.field ul {
  display: grid;
  gap: 7px;
  margin-bottom: 0;
  padding-left: 1.2em;
}
.field li::marker {
  color: #bf77a0;
}
.profile-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding: 18px 30px;
  border-top: 1px solid #eee5ee;
}
.record-info {
  display: grid;
  gap: 5px;
  color: #777589;
  font-size: 0.78rem;
  overflow-wrap: anywhere;
}
.record-button {
  flex: 0 0 auto;
  padding: 10px 20px;
  border: 0;
  border-radius: 8px;
  background: #aa6592;
  color: white;
  font-weight: 700;
}
.record-button:hover:not(:disabled) {
  background: #904f7a;
}
.record-button:disabled {
  background: #e7dce5;
  color: #777589;
  cursor: default;
}
button:focus-visible {
  outline: 2px solid #a34d88;
  outline-offset: 3px;
}
.feedback {
  margin: 0;
  padding: 0 30px 20px;
  color: #80516f;
}
.notice {
  padding: 26px;
  border: 1px dashed #dec7d7;
  border-radius: 12px;
  background: #fff;
  color: #777589;
}
.notice.error {
  color: #a3315e;
}
@media (max-width: 600px) {
  .profile-grid {
    grid-template-columns: 1fr;
    padding: 12px;
  }
  .detail-tabs button {
    padding: 12px 3px;
    font-size: 0.82rem;
  }
  .field.full-width {
    grid-column: auto;
  }
  .profile-top {
    padding: 20px;
  }
  .profile-footer {
    align-items: stretch;
    flex-direction: column;
    padding: 16px 20px;
  }
  .seal {
    flex-basis: 46px;
    width: 46px;
    height: 46px;
    font-size: 1.7rem;
  }
}
</style>
