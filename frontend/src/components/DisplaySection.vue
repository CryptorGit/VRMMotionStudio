<template>
  <div class="section">
    <h3 @click="expanded = !expanded">
      <i
        class="toggle-icon"
        :class="expanded ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'"
      ></i>
      表示管理
      <span class="spacer"></span>
      <i class="fa-solid fa-times close-icon" @click.stop="$emit('hide')"></i>
    </h3>
    <div v-show="expanded" class="section-content">
      <div class="row">
        <label>
          ライトマーカー表示
          <input type="checkbox" v-model="showLightMarkerLocal" />
        </label>
        <label>
          マーカー色
          <input type="color" v-model="markerColorLocal" />
        </label>
      </div>
      <div class="row">
        <label>
          ボーン表示（人型）
          <input type="checkbox" @change="onToggleAllBones($event.target.checked)" />
        </label>
        <label>
          ボーン名表示
          <input type="checkbox" @change="onToggleAllBoneNames($event.target.checked)" />
        </label>
      </div>
      <div class="row">
        <label>
          ボーン表示（物理）
          <input type="checkbox" v-model="showPhysicalBonesLocal" />
        </label>
        <label>
          ボーン表示（その他）
          <input type="checkbox" v-model="showOtherBonesLocal" />
        </label>
      </div>
      <div class="row">
        <label>
          ボーン表示（拡張）
          <input type="checkbox" v-model="showExtendedBonesLocal" />
        </label>
        <label>
          ボーン表示（コライダー）
          <input type="checkbox" v-model="showColliderNodesLocal" />
        </label>
      </div>
      <div class="row">
        <label>
          ボーン表示（非変形）
          <input type="checkbox" v-model="showNonDeformingBonesLocal" />
        </label>
        <label>
          制約ハイライト
          <input type="checkbox" v-model="highlightConstraintLocal" />
        </label>
      </div>
      <div class="row">
        <label class="stretch">
          ボーンサイズ（太さ）
          <input type="range" min="0.005" max="0.06" step="0.001" v-model.number="boneDotSizeLocal" />
        </label>
      </div>
      <div class="row">
        <label class="stretch">
          ボーン名表示（大きさ）
          <input
            type="range"
            :min="boneLabelSmallRangeLocal ? 0.02 : 0.2"
            :max="boneLabelSmallRangeLocal ? 0.2 : 2.0"
            :step="boneLabelSmallRangeLocal ? 0.01 : 0.05"
            v-model.number="boneLabelScaleLocal"
          />
        </label>
      </div>
      <div class="row">
        <label>
          小さいレンジ
          <input type="checkbox" v-model="boneLabelSmallRangeLocal" />
        </label>
      </div>
    </div>
  </div>
  </template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  models: { type: Array, required: true },
  showLightMarker: { type: Boolean, required: true },
  markerColor: { type: String, required: true },
  showPhysicalBones: { type: Boolean, required: true },
  showOtherBones: { type: Boolean, required: true },
  showExtendedBones: { type: Boolean, required: true },
  showColliderNodes: { type: Boolean, required: true },
  showNonDeformingBones: { type: Boolean, required: true },
  highlightConstraint: { type: Boolean, required: true },
  boneDotSize: { type: Number, required: true },
  boneLabelScale: { type: Number, required: true }
})
const emit = defineEmits([
  'hide',
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
  'toggle-all-bones',
  'toggle-all-bone-names'
])

const expanded = ref(false)

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
// UI-only toggle for smaller label scale range
const boneLabelSmallRangeLocal = ref(false)

watch(boneLabelSmallRangeLocal, v => {
  // Clamp current value into the active range boundary when toggled
  if (v && boneLabelScaleLocal.value > 0.2) {
    boneLabelScaleLocal.value = 0.2
  }
  if (!v && boneLabelScaleLocal.value < 0.2) {
    boneLabelScaleLocal.value = 0.2
  }
})

function onToggleAllBones(v) {
  emit('toggle-all-bones', !!v)
}
function onToggleAllBoneNames(v) {
  emit('toggle-all-bone-names', !!v)
}
</script>

<style scoped>
.section h3 {
  margin: 0;
  padding: 0.5rem;
  background: #ddd;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.section h3 .toggle-icon { margin-right: 0.5rem; }
.section h3 .spacer { flex: 1; }
.section h3 .close-icon { margin-left: 0.5rem; cursor: pointer; }
.section-content { padding: 0.5rem; }
.row { display: flex; gap: 1rem; align-items: center; margin-bottom: 0.5rem; }
.row label { display: flex; align-items: center; gap: 0.5rem; }
.row .stretch { flex: 1; display: flex; justify-content: space-between; }
</style>
