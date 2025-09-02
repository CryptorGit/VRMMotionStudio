import { ref } from 'vue';
import { useModelCache } from './useModelCache.js';

export function useModelOperations() {
  const models = ref([]);
  const activeModelId = ref(null);
  const { saveModel, loadModel, deleteModel } = useModelCache();

  async function addModel(id, data) {
    await saveModel(id, data);
    models.value.push({ id, data });
  }

  async function removeModel(id) {
    await deleteModel(id);
    models.value = models.value.filter((m) => m.id !== id);
    if (activeModelId.value === id) {
      activeModelId.value = null;
    }
  }

  function toggleModel(id) {
    activeModelId.value = id;
  }

  return {
    models,
    activeModelId,
    addModel,
    removeModel,
    toggleModel,
    loadModel,
  };
}
