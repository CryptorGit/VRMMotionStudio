<template>
  <div class="section">
    <h3 @click="expanded = !expanded">
      <i
        class="toggle-icon"
        :class="expanded ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'"
      ></i>
  表示とツール（仮）
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
          <input type="checkbox" v-model="allBonesVisible" />
        </label>
        <label>
          ボーン名表示
          <input type="checkbox" v-model="allBoneNamesVisible" />
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
          ボーン名表示サイズ（大きさ）
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
        <label>
          バーチャルトラッカー
          <input type="checkbox" v-model="virtualTrackersEnabledLocal" />
        </label>
        <button type="button" @click="$emit('reset-virtual-trackers')">位置リセット</button>
      </div>
      <div class="row">
        <label>
          トラッカー名表示
          <input type="checkbox" v-model="showVirtualTrackerLabelsLocal" />
        </label>
        <label class="stretch">
          トラッカーサイズ
          <input type="range" min="0.02" max="0.25" step="0.005" v-model.number="virtualTrackerSizeLocal" />
        </label>
      </div>
      <div class="row">
        <label class="stretch">
          トラッカー名表示サイズ
          <input type="range" min="0.2" max="3.0" step="0.05" v-model.number="virtualTrackerLabelScaleLocal" />
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
  , virtualTrackersEnabled: { type: Boolean, default: false }
  , showVirtualTrackerLabels: { type: Boolean, default: true }
  , virtualTrackerSize: { type: Number, default: 0.08 }
  , virtualTrackerLabelScale: { type: Number, default: 1.0 }
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
  , 'update:virtualTrackersEnabled'
  , 'reset-virtual-trackers'
  , 'update:showVirtualTrackerLabels'
  , 'update:virtualTrackerSize'
  , 'update:virtualTrackerLabelScale'
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
const virtualTrackersEnabledLocal = computed({
  get: () => props.virtualTrackersEnabled,
  set: v => emit('update:virtualTrackersEnabled', v)
})
const showVirtualTrackerLabelsLocal = computed({
  get: () => props.showVirtualTrackerLabels,
  set: v => emit('update:showVirtualTrackerLabels', v)
})
const virtualTrackerSizeLocal = computed({
  get: () => props.virtualTrackerSize,
  set: v => emit('update:virtualTrackerSize', v)
})
const virtualTrackerLabelScaleLocal = computed({
  get: () => props.virtualTrackerLabelScale,
  set: v => emit('update:virtualTrackerLabelScale', v)
})
// ボーン名スライダーは単一レンジに統一

function onToggleAllBones(v) {
  emit('toggle-all-bones', !!v)
}
function onToggleAllBoneNames(v) {
  emit('toggle-all-bone-names', !!v)
}

// Reflect per-model state in master toggles so UI stays in sync after restore
const allBonesVisible = computed({
  get: () => (props.models?.length ? props.models.every(m => !!m.bonesVisible) : false),
  set: v => emit('toggle-all-bones', !!v)
})
const allBoneNamesVisible = computed({
  get: () => (props.models?.length ? props.models.every(m => !!m.boneNameVisible) : false),
  set: v => emit('toggle-all-bone-names', !!v)
})
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
