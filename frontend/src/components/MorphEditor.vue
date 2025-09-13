<template>
  <div id="morph-editor">
    <div v-if="vrm">
      <template v-if="presentPresets && presentPresets.length">
        <div class="section-title">プリセット</div>
        <div
          v-for="p in presentPresets"
          :key="p.key"
          class="morph-row"
        >
          <label :for="p.key">{{ p.label }}</label>
          <input
            type="range"
            :id="p.key"
            min="0"
            max="1"
            step="0.01"
            :value="getVal(p.key)"
            @input="setVal(p.key, $event)"
          />
        </div>
      </template>
      <template v-if="customNames && customNames.length">
        <div class="section-title">カスタム</div>
        <div
          v-for="name in customNames"
          :key="`custom-${name}`"
          class="morph-row"
        >
          <label :for="`custom-${name}`">{{ name }}</label>
          <input
            type="range"
            :id="`custom-${name}`"
            min="0"
            max="1"
            step="0.01"
            :value="getVal(name)"
            @input="setVal(name, $event)"
          />
        </div>
      </template>
    </div>
    <div v-else>VRM が読み込まれていません</div>
  </div>
  </template>

<script setup>
import { computed, ref } from 'vue'
import { VRMExpressionPresetName } from '@pixiv/three-vrm'

const props = defineProps({
  mesh: Object
})

const vrm = computed(() => props.mesh?.userData?.vrm || null)

// 再取得トリガ（リロードボタン用・依存に含めて再計算させる）
const refreshTick = ref(0)

// VRMに実際に含まれるExpression名一覧
const expressionNames = computed(() => {
  refreshTick.value // 参照で依存に含める
  const em = vrm.value?.expressionManager
  if (!em) return []
  try {
    const list = em.getExpressionNames?.()
    if (Array.isArray(list)) return list.map(n => String(n))
  } catch {}
  try {
    const map = em._expressionMap || em.expressionMap
    if (map && typeof map.forEach === 'function') {
      const names = []
      map.forEach((_, k) => names.push(String(k)))
      return names
    }
  } catch {}
  return []
})

const presetLabels = {
  [VRMExpressionPresetName.A]: 'A',
  [VRMExpressionPresetName.I]: 'I',
  [VRMExpressionPresetName.U]: 'U',
  [VRMExpressionPresetName.E]: 'E',
  [VRMExpressionPresetName.O]: 'O',
  [VRMExpressionPresetName.Neutral]: 'Neutral',
  [VRMExpressionPresetName.Joy]: 'Joy',
  [VRMExpressionPresetName.Angry]: 'Angry',
  [VRMExpressionPresetName.Sorrow]: 'Sorrow',
  [VRMExpressionPresetName.Fun]: 'Fun'
}

const presetNameSet = computed(() => new Set(Object.values(VRMExpressionPresetName).map(String)))

// VRMに存在するプリセットのみ
const presentPresets = computed(() =>
  expressionNames.value
    .filter(n => presetNameSet.value.has(String(n)))
    .map(n => ({ key: n, label: presetLabels[n] || String(n) }))
)

// VRMに存在するカスタム名のみ
const customNames = computed(() =>
  expressionNames.value.filter(n => !presetNameSet.value.has(String(n)))
)

function getVal(key) {
  const em = vrm.value?.expressionManager
  if (!em) return 0
  const v = em.getValue?.(key)
  return typeof v === 'number' ? v : 0
}

function setVal(key, event) {
  const em = vrm.value?.expressionManager
  if (!em) return
  const value = parseFloat(event.target.value)
  em.setValue?.(key, value)
  em.update?.()
}

// Morph一覧を再取得（VRM切替や外部更新時用）
defineExpose({
  reloadMorphs: () => {
    refreshTick.value++
  }
})
</script>

<style scoped>
#morph-editor {
  width: 100%;
  padding: 10px;
}
.section-title {
  font-weight: bold;
  margin: 8px 0 4px;
}
.morph-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.morph-row label {
  width: 80px;
  font-size: 0.9em;
}
.morph-row input {
  flex: 1;
}
</style>
