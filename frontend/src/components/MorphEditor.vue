<template>
  <div id="morph-editor">
    <div v-if="vrm">
      <template v-if="presentPresets && presentPresets.length">
        <div class="section-title">繝励Μ繧ｻ繝・ヨ</div>
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
        <div class="section-title">繧ｫ繧ｹ繧ｿ繝</div>
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
      <template v-if="hasShapeKeys">
        <div class="section-title">繧ｷ繧ｧ繧､繝励く繝ｼ</div>
        <div
          v-for="group in shapeKeyGroups"
          :key="group.key"
          class="shape-group"
        >
          <h4 class="shape-group__title">{{ group.label }}</h4>
          <div
            v-for="item in group.items"
            :key="`shape-${item.name}`"
            class="morph-row morph-row--shape"
          >
            <label :for="`shape-${item.name}`">
              <span class="shape-label-main">{{ item.label }}</span>
            </label>
            <input
              type="range"
              :id="`shape-${item.name}`"
              min="-1"
              max="1"
              step="0.01"
              :value="getShapeKeyVal(item.name)"
              @input="setShapeKeyVal(item.name, $event)"
            />
          </div>
        </div>
      </template>
    </div>
    <div v-else>VRM 縺瑚ｪｭ縺ｿ霎ｼ縺ｾ繧後※縺・∪縺帙ｓ</div>
  </div>
  </template>

<script setup>
import { computed, ref, watch } from 'vue'
import { VRMExpressionPresetName } from '@pixiv/three-vrm'
import {
  describeShapeKeys,
  getShapeKeyValue,
  setShapeKeyValue,
  ensureShapeKeyOverrides,
  clearShapeKeyCache
} from '../utils/shapekeys.js'

const props = defineProps({
  mesh: Object
})

const vrm = computed(() => props.mesh?.userData?.vrm || null)

// 蜀榊叙蠕励ヨ繝ｪ繧ｬ・医Μ繝ｭ繝ｼ繝峨・繧ｿ繝ｳ逕ｨ繝ｻ萓晏ｭ倥↓蜷ｫ繧√※蜀崎ｨ育ｮ励＆縺帙ｋ・・
const refreshTick = ref(0)

// VRM縺ｫ螳滄圀縺ｫ蜷ｫ縺ｾ繧後ｋExpression蜷堺ｸ隕ｧ
const expressionNames = computed(() => {
  refreshTick.value // 蜿ら・縺ｧ萓晏ｭ倥↓蜷ｫ繧√ｋ
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

const expressionNameSet = computed(() => new Set(expressionNames.value.map(name => String(name).toLowerCase())))

// VRM縺ｫ蟄伜惠縺吶ｋ繝励Μ繧ｻ繝・ヨ縺ｮ縺ｿ
const presentPresets = computed(() =>
  expressionNames.value
    .filter(n => presetNameSet.value.has(String(n)))
    .map(n => ({ key: n, label: presetLabels[n] || String(n) }))
)

// VRM縺ｫ蟄伜惠縺吶ｋ繧ｫ繧ｹ繧ｿ繝蜷阪・縺ｿ
const customNames = computed(() =>
  expressionNames.value.filter(n => !presetNameSet.value.has(String(n)))
)

const shapeKeyGroups = computed(() => {
  refreshTick.value
  const root = vrm.value?.scene || props.mesh || null
  if (!root) return []
  ensureShapeKeyOverrides(root)
  const exclude = Array.from(expressionNameSet.value.values())
  return describeShapeKeys(root, { includeExpressions: false, exclude })
})

const hasShapeKeys = computed(() =>
  Array.isArray(shapeKeyGroups.value) && shapeKeyGroups.value.some(group => group.items.length)
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

function getShapeKeyVal(name) {
  const root = vrm.value?.scene || props.mesh || null
  if (!root) return 0
  return getShapeKeyValue(root, name)
}

function setShapeKeyVal(name, event) {
  const root = vrm.value?.scene || props.mesh || null
  if (!root) return
  const value = Number.parseFloat(event?.target?.value)
  if (!Number.isFinite(value)) return
  setShapeKeyValue(root, name, value)
}

watch(vrm, newVrm => {
  const root = newVrm?.scene || null
  if (root) {
    ensureShapeKeyOverrides(root)
    clearShapeKeyCache(root)
  }
})

// Morph荳隕ｧ繧貞・蜿門ｾ暦ｼ・RM蛻・崛繧・､夜Κ譖ｴ譁ｰ譎ら畑・・
defineExpose({
  reloadMorphs: () => {
    refreshTick.value++
    const root = vrm.value?.scene || props.mesh || null
    if (root) clearShapeKeyCache(root)
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
.morph-row--shape label {
  width: auto;
  min-width: 160px;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.shape-group {
  margin-bottom: 1rem;
}

.shape-group:last-of-type {
  margin-bottom: 0;
}

.shape-group__title {
  margin: 0 0 0.35rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(228, 233, 255, 0.82);
}

.shape-label-main {
  font-weight: 500;
}

.shape-label-sub {
  font-size: 0.7rem;
  opacity: 0.65;
  letter-spacing: 0.01em;
}
</style>


