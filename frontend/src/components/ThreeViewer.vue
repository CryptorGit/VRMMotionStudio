<script setup>
import { useModelLoader } from '../composables/useModelLoader.js';

const { models, addModel, removeModel, toggleModel, applyPose, exportPose } = useModelLoader();
</script>

<template>
  <div class="viewer">
    <!-- Viewer placeholder -->
  </div>
</template>
