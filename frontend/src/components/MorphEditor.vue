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
          <span class="morph-percent">{{ (getVal(p.key) * 100).toFixed(0) }}%</span>
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
          <span class="morph-percent">{{ (getVal(name) * 100).toFixed(0) }}%</span>
        </div>
      </template>
      <template v-if="hasShapeKeys">
        <div class="section-title">
          <span>シェイプキー</span>
          <div class="section-actions">
            <button type="button" class="btn-icon" @click="updateShapeKeys" title="更新">
              <Icon icon="mdi:refresh" />
            </button>
            <button type="button" class="btn-icon" @click="resetAllShapeKeys" title="すべてリセット">
              <Icon icon="mdi:restore" />
            </button>
          </div>
        </div>
        <div
          v-for="group in shapeKeyGroups"
          :key="group.key"
          class="shape-group"
        >
          <h4 class="shape-group__title">{{ group.label }}</h4>
          <div
            v-for="item in group.items"
            :key="`shape-${item.name}`"
            class="morph-item"
          >
            <div class="morph-item__header">
              <label :for="`shape-${item.name}`" class="morph-item__label">
                {{ item.label }}
              </label>
              <button 
                type="button" 
                class="btn-reset" 
                @click="resetShapeKey(item.name)"
                title="リセット"
              >
                <Icon icon="mdi:restore" />
                <span>リセット</span>
              </button>
            </div>
            <div class="morph-item__slider">
              <input
                type="range"
                :id="`shape-${item.name}`"
                min="-1"
                max="1"
                step="0.01"
                :value="getShapeKeyVal(item.name)"
                @input="setShapeKeyVal(item.name, $event)"
              />
              <span class="morph-item__value">{{ (getShapeKeyVal(item.name) * 100).toFixed(0) }}%</span>
            </div>
          </div>
        </div>
      </template>
    </div>
    <div v-else>VRM が読み込まれていません</div>
  </div>
  </template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
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

const expressionNameSet = computed(() => new Set(expressionNames.value.map(name => String(name).toLowerCase())))

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
  // 強制再描画で % 表示更新
  refreshTick.value++
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
  refreshTick.value++
}

function resetShapeKey(name) {
  const root = vrm.value?.scene || props.mesh || null
  if (!root) return
  setShapeKeyValue(root, name, 0)
  // バーの位置を更新するために再描画をトリガー
  refreshTick.value++
}

function resetAllShapeKeys() {
  const root = vrm.value?.scene || props.mesh || null
  if (!root) return
  const groups = shapeKeyGroups.value || []
  groups.forEach(group => {
    group.items.forEach(item => {
      setShapeKeyValue(root, item.name, 0)
    })
  })
  // バーの位置を更新するために再描画をトリガー
  refreshTick.value++
}

function updateShapeKeys() {
  refreshTick.value++
  const root = vrm.value?.scene || props.mesh || null
  if (root) clearShapeKeyCache(root)
}

watch(vrm, newVrm => {
  const root = newVrm?.scene || null
  if (root) {
    ensureShapeKeyOverrides(root)
    clearShapeKeyCache(root)
  }
})

// Morph一覧を再取得（VRM切替や外部更新時用）
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
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 0.85rem;
  margin: 1rem 0 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.section-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  padding: 0.35rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.24);
  color: rgba(255, 255, 255, 1);
}

.morph-row {
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
  gap: 0.75rem;
}

.morph-row label {
  min-width: 6rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

.morph-row input[type="range"] {
  flex: 1;
}

.morph-percent {
  min-width: 3rem;
  text-align: right;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.55);
  font-variant-numeric: tabular-nums;
}

.shape-group {
  margin-bottom: 1.5rem;
}

.shape-group__title {
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.morph-item {
  margin-bottom: 1rem;
}

.morph-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.morph-item__label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.btn-reset {
  padding: 0.3rem 0.6rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.btn-reset:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.95);
}

.morph-item__slider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.morph-item__slider input[type="range"] {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  transition: background 0.2s ease;
}

.morph-item__slider input[type="range"]:hover {
  background: rgba(255, 255, 255, 0.16);
}

.morph-item__slider input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--accent, #42a5f5);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.morph-item__slider input[type="range"]::-webkit-slider-thumb:hover {
  background: color-mix(in srgb, var(--accent, #42a5f5) 100%, white 20%);
  transform: scale(1.15);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
}

.morph-item__slider input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--accent, #42a5f5);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.morph-item__slider input[type="range"]::-moz-range-thumb:hover {
  background: color-mix(in srgb, var(--accent, #42a5f5) 100%, white 20%);
  transform: scale(1.15);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
}

.morph-item__value {
  min-width: 3rem;
  text-align: right;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  font-variant-numeric: tabular-nums;
}
</style>
