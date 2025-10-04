<template>
  <section class="section">
    <header class="section__header">
      <h3>陦ｨ遉ｺ縺ｨ繝・・繝ｫ</h3>
    </header>
    <div class="section__content">
      <div class="row">
        <label class="checkbox">
          <input type="checkbox" v-model="showLightMarkerLocal" />
          <span>繝ｩ繧､繝医・繝ｼ繧ｫ繝ｼ陦ｨ遉ｺ</span>
        </label>
        <label>
          <span>繝槭・繧ｫ繝ｼ濶ｲ</span>
          <input type="color" v-model="markerColorLocal" />
        </label>
      </div>
      <div class="row">
        <label class="checkbox">
          <input type="checkbox" v-model="allBonesVisible" />
          <span>繝懊・繝ｳ陦ｨ遉ｺ・井ｺｺ蝙具ｼ・/span>
        </label>
      </div>
      <div class="row">
        <label class="checkbox">
          <input type="checkbox" v-model="allBoneNamesVisible" />
          <span>繝懊・繝ｳ蜷崎｡ｨ遉ｺ</span>
        </label>
      </div>
      <div class="row">
        <label class="checkbox">
          <input type="checkbox" v-model="showPhysicalBonesLocal" />
          <span>繝懊・繝ｳ陦ｨ遉ｺ・育黄逅・ｼ・/span>
        </label>
      </div>
      <div class="row">
        <label class="checkbox">
          <input type="checkbox" v-model="showOtherBonesLocal" />
          <span>繝懊・繝ｳ陦ｨ遉ｺ・医◎縺ｮ莉厄ｼ・/span>
        </label>
      </div>
      <div class="row">
        <label class="checkbox">
          <input type="checkbox" v-model="showExtendedBonesLocal" />
          <span>繝懊・繝ｳ陦ｨ遉ｺ・域僑蠑ｵ・・/span>
        </label>
      </div>
      <div class="row">
        <label class="checkbox">
          <input type="checkbox" v-model="showColliderNodesLocal" />
          <span>繝懊・繝ｳ陦ｨ遉ｺ・医さ繝ｩ繧､繝繝ｼ・・/span>
        </label>
      </div>
      <div class="row">
        <label class="checkbox">
          <input type="checkbox" v-model="showNonDeformingBonesLocal" />
          <span>繝懊・繝ｳ陦ｨ遉ｺ・磯撼螟牙ｽ｢・・/span>
        </label>
      </div>
      <div class="row">
        <label class="checkbox">
          <input type="checkbox" v-model="highlightConstraintLocal" />
          <span>蛻ｶ邏・ワ繧､繝ｩ繧､繝・/span>
        </label>
      </div>
      <div class="row">
        <label class="stretch">
          繝懊・繝ｳ陦ｨ遉ｺ繧ｵ繧､繧ｺ
          <input type="range" min="0.005" max="0.06" step="0.001" v-model.number="boneDotSizeLocal" />
        </label>
      </div>
      <div class="row">
        <label class="stretch">
          繝懊・繝ｳ蜷崎｡ｨ遉ｺ繧ｵ繧､繧ｺ・亥､ｧ縺阪＆・・
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
        <h4 style="margin: 0.5rem 0 0.25rem; font-size: 0.9rem;">VRM 繧｢繧ｦ繝医Λ繧､繝ｳ險ｭ螳・/h4>
      </div>
      <div class="row">
        <label class="stretch">
          繧｢繧ｦ繝医Λ繧､繝ｳ螟ｪ縺・
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
          繧｢繧ｦ繝医Λ繧､繝ｳ濶ｲ
          <input type="color" v-model="outlineColorLocal" style="width: 100%;" />
        </label>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

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
  boneLabelScale: { type: Number, required: true },
  outlineWidth: { type: Number, default: 0.002 },
  outlineColor: { type: String, default: '#000000' }
})

const emit = defineEmits([
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
  'update:outlineWidth',
  'update:outlineColor',
  'toggle-all-bones',
  'toggle-all-bone-names'
])

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
.section {
  background: rgba(36, 40, 52, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  overflow: hidden;
}

.section__header {
  padding: 0.75rem 0.85rem 0.4rem;
}

.section__header h3 {
  margin: 0;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
}

.section__content {
  padding: 0 0.85rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
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

button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 6px;
  color: inherit;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
}

button:hover,
button:focus-visible {
  background: color-mix(in srgb, var(--accent, #2d8cff) 25%, rgba(255, 255, 255, 0.1));
  outline: none;
}

hr {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 0.5rem 0;
}
</style>


