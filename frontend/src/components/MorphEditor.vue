<template>
  <div id="morph-editor">
    <div v-if="vrm">
      <template v-if="presets && presets.length">
        <div class="section-title">プリセット</div>
        <div
          v-for="p in presets"
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
    <div v-else>VRM 表情がありません</div>
  </div>
  </template>

<script setup>
import { computed } from 'vue'
import { VRMExpressionPresetName } from '@pixiv/three-vrm'

const props = defineProps({
  mesh: Object
})

const vrm = computed(() => props.mesh?.userData?.vrm || null)

const presets = [
  { key: VRMExpressionPresetName.A, label: 'あ' },
  { key: VRMExpressionPresetName.I, label: 'い' },
  { key: VRMExpressionPresetName.U, label: 'う' },
  { key: VRMExpressionPresetName.E, label: 'え' },
  { key: VRMExpressionPresetName.O, label: 'お' },
  { key: VRMExpressionPresetName.Neutral, label: 'Neutral' },
  { key: VRMExpressionPresetName.Joy, label: 'Joy' },
  { key: VRMExpressionPresetName.Angry, label: 'Angry' },
  { key: VRMExpressionPresetName.Sorrow, label: 'Sorrow' },
  { key: VRMExpressionPresetName.Fun, label: 'Fun' }
]

const customNames = computed(() => {
  const em = vrm.value?.expressionManager
  if (!em) return []
  const presetSet = new Set(presets.map(p => String(p.key)))
  const names = new Set()
  try {
    // v2: try known collections
    const maybeList = em.expressions || em._expressions || []
    if (Array.isArray(maybeList)) {
      maybeList.forEach(e => {
        const n = e?.name || e?.expressionName || e?.presetName
        if (n && !presetSet.has(String(n))) names.add(String(n))
      })
    }
  } catch {}
  try {
    const map = em._expressionMap || em.expressionMap
    if (map && typeof map.forEach === 'function') {
      map.forEach((_, k) => { if (!presetSet.has(String(k))) names.add(String(k)) })
    }
  } catch {}
  try {
    const keys = em?.getExpressionNames?.()
    if (Array.isArray(keys)) keys.forEach(k => { if (!presetSet.has(String(k))) names.add(String(k)) })
  } catch {}
  return Array.from(names)
})

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

// API 互換のため（呼び出し元から参照される）
defineExpose({ reloadMorphs: () => {} })
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

