// stores/QuestStore.js
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useStatStore } from '@/尘史使徒/UI/store/StatStore';
import { useMessageStore } from '@/尘史使徒/UI/store/MessageStore'; // 引入 MessageStore
import { isMainlineMeta } from '@/创意工坊/scenario/mainlineLayout';

export const useQuestStore = defineStore('quest', () => {
  const statStore = useStatStore();
  const messageStore = useMessageStore(); // 获取消息仓库实例

  // --- 1. 布告栏数据 (新进委托) ---
  const questBoardData = ref({});

  // 核心逻辑移至此处：监听消息变化，自动解析
  watch(
    () => messageStore.message,
    newMsg => {
      if (!newMsg) return;

      // 正则匹配 <questVariable>...</questVariable>
      const regex =
        /<questVariable>((?:(?!<questVariable>)[\s\S])*?)<\/questVariable>(?![\s\S]*<questVariable>[\s\S]*<\/questVariable>)/i;
      const match = newMsg.match(regex);

      if (match && match[1]) {
        try {
          const jsonStr = match[1].trim();

          // 更新状态
          questBoardData.value = JSON.parse(jsonStr);
          console.log('[QuestStore] 检测到新委托，布告栏已更新');
        } catch (e) {
          console.error('[QuestStore] 解析任务数据失败:', e);
        }
      } else {
        questBoardData.value = {};
      }
    },
    { immediate: true },
  );

  // Action: 清空布告栏 (接取后调用)
  const clearQuestBoardData = () => {
    questBoardData.value = {};
  };

  // Getter: 是否有新任务待接取
  const hasBoardData = computed(() => {
    return questBoardData.value && Object.keys(questBoardData.value).length > 0;
  });

  // --- 2. 已接取任务 (来自 StatStore) ---
  const transformData = record => {
    if (!record) return [];
    return Object.entries(record).map(([key, value]) => ({
      title: key,
      ...value,
    }));
  };

  const mainQuests = computed(() =>
    transformData(
      Object.fromEntries(Object.entries(statStore.stat_data?.主线 ?? {}).filter(([key]) => key !== 'meta')),
    ),
  );
  const mainlineMeta = computed(() => {
    const meta = statStore.stat_data?.主线?.meta;
    return isMainlineMeta(meta) ? meta : null;
  });
  const tasks = computed(() => transformData(statStore.stat_data?.任务));
  const events = computed(() => transformData(statStore.stat_data?.事件));

  const activeCount = computed(() => mainQuests.value.length + tasks.value.length);

  return {
    questBoardData,
    hasBoardData,
    clearQuestBoardData,
    mainQuests,
    mainlineMeta,
    tasks,
    events,
    activeCount,
  };
});
