<template>
  <MapExplorer
    class="world-map"
    :map="stat_data?.地图 ?? {}"
    :mode="mode"
    :current-location="stat_data?.世界?.地图索引 ?? ''"
    @select="$emit('select', $event)"
    @travel="travel"
    @delete="remove"
    ><template #hud
      ><div v-if="mode === 'gameplay'" class="hud">
        <strong v-if="isDanger" class="danger">⚠ DANGER ZONE</strong>
        <small>CURRENT LOCATION</small><b>{{ stat_data?.世界?.地点 }}</b
        ><span>{{ stat_data?.世界?.天气 }} / {{ stat_data?.世界?.季节 }}</span> <small>CHRONOS</small
        ><b>{{ formattedTime.clock }}</b
        ><span>{{ formattedTime.date }} {{ formattedTime.weekday }}</span>
      </div>
      <div v-else class="hud"><small>SELECTION MODE</small><b>选择出生地</b></div></template
    ></MapExplorer
  >
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { MvuUtil } from '@/Utils/MvuUtil';
import { findMapPath, mapTravelPath } from '@/创意工坊/scenario/map';
import MapExplorer from '@/尘史使徒/UI/components/map/MapExplorer.vue';
import { useWorldStatus } from '@/尘史使徒/UI/composables/map/useWorldStatus';
import { useStatStore } from '@/尘史使徒/UI/store/StatStore';
import { useUiStore } from '@/尘史使徒/UI/store/UIStore';
withDefaults(defineProps<{ mode?: 'gameplay' | 'selection' }>(), { mode: 'gameplay' });
defineEmits<{ select: [name: string] }>();
const { stat_data } = storeToRefs(useStatStore()),
  ui = useUiStore(),
  router = useRouter();
const { isDanger, formattedTime } = useWorldStatus(stat_data);
function travel(name: string) {
  if (name === stat_data.value?.世界?.地图索引) return;
  const route = mapTravelPath(stat_data.value?.地图 ?? {}, stat_data.value?.世界?.地图索引 ?? '', name);
  ui.setPendingInput(`<user>计划前往${name}，路径：${route.join(' -> ')}`);
  router.push('/选项');
}
async function remove(name: string, path: string[]) {
  const playerPath = findMapPath(stat_data.value?.地图 ?? {}, stat_data.value?.世界?.地图索引 ?? '');
  const targetPath = [...path, name];
  if (playerPath && targetPath.every((part, index) => playerPath[index] === part)) return;
  if (!confirm(`警告：确定要彻底删除 "${name}" 及其所有子区域吗？`)) return;
  const payload: any = { 地图: {} };
  let cursor = payload.地图;
  for (const crumb of path) {
    cursor[crumb] = { 子地图: {} };
    cursor = cursor[crumb].子地图;
  }
  cursor[name] = null;
  await MvuUtil.updateMvuDataByDiff(payload);
}
</script>
<style scoped>
.world-map {
  height: 100dvh;
}
.hud {
  position: absolute;
  right: 20px;
  bottom: 20px;
  display: grid;
  padding: 14px 28px;
  text-align: right;
  background: linear-gradient(90deg, transparent, #14161cf2);
  border-right: 3px solid #c5a059;
}
.hud small {
  color: #777;
}
.hud b {
  font-size: 22px;
}
.hud span {
  color: #c5a059;
}
.danger {
  color: #b03a48;
}
</style>
