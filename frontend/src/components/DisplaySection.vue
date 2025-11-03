<template>
  <div class="row">
    <label class="checkbox">
      <input type="checkbox" v-model="showGridLocal" />
      <span>{{ displayTexts.grid }}</span>
    </label>
  </div>
  <div class="row">
    <label class="checkbox">
      <input type="checkbox" v-model="showLightMarkerLocal" />
      <span>{{ displayTexts.lightMarker }}</span>
    </label>
    <label>
      <span>{{ displayTexts.markerColor }}</span>
      <input type="color" v-model="markerColorLocal" />
    </label>
  </div>
  <div class="row">
    <label class="checkbox">
      <input type="checkbox" v-model="allBonesVisible" />
      <span>{{ displayTexts.bones }}</span>
    </label>
  </div>
  <div class="row">
    <label class="checkbox">
      <input type="checkbox" v-model="allBoneNamesVisible" />
      <span>{{ displayTexts.boneNames }}</span>
    </label>
  </div>
  <div class="row">
    <label class="checkbox">
      <input type="checkbox" v-model="showPhysicalBonesLocal" />
      <span>{{ displayTexts.physicalBones }}</span>
    </label>
  </div>
  <div class="row">
    <label class="checkbox">
      <input type="checkbox" v-model="showOtherBonesLocal" />
      <span>{{ displayTexts.otherBones }}</span>
    </label>
  </div>
  <div class="row">
    <label class="checkbox">
      <input type="checkbox" v-model="showExtendedBonesLocal" />
      <span>{{ displayTexts.extendedBones }}</span>
    </label>
  </div>
  <div class="row">
    <label class="checkbox">
      <input type="checkbox" v-model="showColliderNodesLocal" />
      <span>{{ displayTexts.colliderNodes }}</span>
    </label>
  </div>
  <div class="row">
    <label class="checkbox">
      <input type="checkbox" v-model="showNonDeformingBonesLocal" />
      <span>{{ displayTexts.nonDeformingBones }}</span>
    </label>
  </div>
  <div class="row">
    <label class="checkbox">
      <input type="checkbox" v-model="highlightConstraintLocal" />
      <span>{{ displayTexts.highlightConstraint }}</span>
    </label>
  </div>
  <div class="row">
    <label class="stretch">
      {{ displayTexts.boneDotSize }}
      <input type="range" min="0.005" max="0.06" step="0.001" v-model.number="boneDotSizeLocal" />
    </label>
  </div>
  <div class="row">
    <label class="stretch">
      {{ displayTexts.boneLabelScale }}
      <input
        type="range"
        min="0.05"
        max="2.0"
        step="0.05"
        v-model.number="boneLabelScaleLocal"
      />
    </label>
  </div>
  <hr />
  <div class="row">
    <h4 style="margin: 0.5rem 0 0.25rem; font-size: 0.9rem;">{{ displayTexts.outlineSettings }}</h4>
  </div>
  <div class="row">
    <label class="stretch">
      <span>{{ displayTexts.targetModel }}</span>
      <select v-model="selectedOutlineModelIndex" class="model-select" :disabled="!hasModels">
        <option v-for="(model, index) in models" :key="model.id" :value="index">
          {{ model.name }}
        </option>
      </select>
    </label>
  </div>
  <div class="row">
    <label class="stretch">
      {{ displayTexts.outlineWidth }}
      <input
        type="range"
        min="0"
        max="0.005"
        step="0.0001"
        v-model.number="outlineWidthLocal"
      />
    </label>
  </div>
  <div class="row">
    <label class="stretch">
      {{ displayTexts.outlineColor }}
      <input type="color" v-model="outlineColorLocal" style="width: 100%;" />
    </label>
  </div>
  <div class="row row--actions">
    <button
      type="button"
      class="btn-outline-reset"
      :disabled="!hasModels"
      @click="emit('reset-outline', selectedOutlineModelIndex)"
    >
      {{ displayTexts.reset }}
    </button>
  </div>

  <!-- Google AdSense広告 -->
  <GoogleAdUnit variant="square" ad-slot="display-section" />
</template>

<script setup>
import { computed, watch } from 'vue'
import { useI18n } from '../locales/index.js'
import GoogleAdUnit from './GoogleAdUnit.vue'

const props = defineProps({
  models: { type: Array, required: true },
  showGrid: { type: Boolean, default: true },
  showLightMarker: { type: Boolean, required: true },
  markerColor: { type: String, required: true },
  showPhysicalBones: { type: Boolean, required: true },
  showOtherBones: { type: Boolean, required: true },
  showExtendedBones: { type: Boolean, required: true },
  showColliderNodes: { type: Boolean, required: true },
  showNonDeformingBones: { type: Boolean, required: true },
  highlightConstraint: { type: Boolean, required: true },
  boneDotSize: { type: Number, required: true },
  boneLabelScale: { type: Number, required: true },
  outlineModelIndex: { type: Number, default: 0 },
  outlineWidth: { type: Number, default: 0.002 },
  outlineColor: { type: String, default: '#000000' }
})


// モデル選択時にそのモデルのアウトライン設定を読み込む
  // 親コンポーネントにモデル選択変更を通知し、

const emit = defineEmits([
  'update:showGrid',
  'update:showLightMarker',
  'update:markerColor',
  'update:showPhysicalBones',
  'update:showOtherBones',
  'update:showExtendedBones',
  'update:showColliderNodes',
  'update:showNonDeformingBones',
  'update:highlightConstraint',
  'update:boneDotSize',
  'update:boneLabelScale',
  'update:outlineModelIndex',
  'update:outlineWidth',
  'update:outlineColor',
  'toggle-all-bones',
  'toggle-all-bone-names',
  'reset-outline',
  'load-model-outline'
])

const { t } = useI18n()
const displayTexts = computed(() => t.value?.display ?? {})

const hasModels = computed(() => Array.isArray(props.models) && props.models.length > 0)

const clampModelIndex = (value) => {
  const length = props.models?.length || 0
  if (!length) return 0
  const max = length - 1
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.min(Math.max(0, Math.trunc(numeric)), max)
}

const selectedOutlineModelIndex = computed({
  get: () => clampModelIndex(props.outlineModelIndex ?? 0),
  set: value => emit('update:outlineModelIndex', clampModelIndex(value))
})

watch(
  () => props.models?.length || 0,
  (len) => {
    if (!len) {
      if ((props.outlineModelIndex ?? 0) !== 0) {
        emit('update:outlineModelIndex', 0)
      }
      return
    }
    const current = props.outlineModelIndex ?? 0
    const clamped = clampModelIndex(current)
    if (clamped !== current) {
      emit('update:outlineModelIndex', clamped)
      return
    }
    emit('load-model-outline', clamped)
  },
  { immediate: true }
)

watch(selectedOutlineModelIndex, (newIndex) => {
  if (!hasModels.value) return
  emit('load-model-outline', clampModelIndex(newIndex))
})

const showGridLocal = computed({
  get: () => props.showGrid,
  set: v => emit('update:showGrid', v)
})

const showLightMarkerLocal = computed({
  get: () => props.showLightMarker,
  set: v => emit('update:showLightMarker', v)
})
const markerColorLocal = computed({
  get: () => props.markerColor,
  set: v => emit('update:markerColor', v)
})
const showPhysicalBonesLocal = computed({
  get: () => props.showPhysicalBones,
  set: v => emit('update:showPhysicalBones', v)
})
const showOtherBonesLocal = computed({
  get: () => props.showOtherBones,
  set: v => emit('update:showOtherBones', v)
})
const showExtendedBonesLocal = computed({
  get: () => props.showExtendedBones,
  set: v => emit('update:showExtendedBones', v)
})
const showColliderNodesLocal = computed({
  get: () => props.showColliderNodes,
  set: v => emit('update:showColliderNodes', v)
})
const showNonDeformingBonesLocal = computed({
  get: () => props.showNonDeformingBones,
  set: v => emit('update:showNonDeformingBones', v)
})
const highlightConstraintLocal = computed({
  get: () => props.highlightConstraint,
  set: v => emit('update:highlightConstraint', v)
})
const boneDotSizeLocal = computed({
  get: () => props.boneDotSize,
  set: v => emit('update:boneDotSize', v)
})
const boneLabelScaleLocal = computed({
  get: () => props.boneLabelScale,
  set: v => emit('update:boneLabelScale', v)
})
const outlineWidthLocal = computed({
  get: () => props.outlineWidth,
  set: v => emit('update:outlineWidth', v)
})
const outlineColorLocal = computed({
  get: () => props.outlineColor,
  set: v => emit('update:outlineColor', v)
})

const allBonesVisible = computed({
  get: () => (props.models?.length ? props.models.every(model => !!model.bonesVisible) : false),
  set: v => emit('toggle-all-bones', !!v)
})
const allBoneNamesVisible = computed({
  get: () => (props.models?.length ? props.models.every(model => !!model.boneNameVisible) : false),
  set: v => emit('toggle-all-bone-names', !!v)
})
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
}

label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  color: var(--text-muted, rgba(240, 245, 255, 0.8));
}

label.checkbox {
  flex: 1 1 auto;
}

label.checkbox span {
  flex: 1 1 auto;
}

label.checkbox input[type='checkbox'] {
  margin: 0;
}

label.stretch {
  flex: 1 1 100%;
  flex-direction: column;
  align-items: flex-start;
}

input[type='range'] {
  width: 100%;
}

.row--actions {
  justify-content: flex-end;
}

.btn-outline-reset {
  background: var(--control-surface, rgba(48, 54, 70, 0.85));
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 6px;
  color: inherit;
  padding: 0.35rem 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.btn-outline-reset:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-outline-reset:not(:disabled):hover,
.btn-outline-reset:not(:disabled):focus-visible {
  background: var(--control-surface-hover, rgba(58, 64, 81, 0.95));
  border-color: rgba(100, 160, 255, 0.45);
  color: #fff;
  outline: none;
}

button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 6px;
  color: inherit;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
}

button:hover,
button:focus-visible {
  background: var(--control-surface-hover, rgba(58, 64, 81, 0.95));
  outline: none;
}

hr {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 0.5rem 0;
}

.model-select {
  width: 100%;
  appearance: none;
  padding: 0.45rem 2.25rem 0.45rem 0.75rem;
  border-radius: 6px;
  border: 1px solid rgba(140, 168, 235, 0.35);
  background: var(--control-surface, rgba(48, 54, 70, 0.9));
  color: rgba(240, 244, 255, 0.9);
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  background-image: linear-gradient(45deg, transparent 50%, rgba(140, 168, 235, 0.9) 50%),
    linear-gradient(135deg, rgba(140, 168, 235, 0.9) 50%, transparent 50%);
  background-position: calc(100% - 18px) calc(50% - 3px), calc(100% - 13px) calc(50% - 3px);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
}

.model-select:hover,
.model-select:focus {
  outline: none;
  border-color: rgba(140, 168, 235, 0.65);
  background: var(--control-surface-hover, rgba(58, 64, 81, 0.95));
}
</style>


