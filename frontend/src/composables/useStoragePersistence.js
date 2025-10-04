import { ref } from 'vue'

const RESULT_STORAGE_KEY = 'mmd.storage.persist.result'

function readSession(key) {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSession(key, value) {
  try {
    sessionStorage.setItem(key, value)
  } catch {}
}

export function useStoragePersistence() {
  const supported = ref(typeof navigator !== 'undefined' && !!navigator.storage)
  const persisted = ref(false)
  const quota = ref(0)
  const usage = ref(0)
  const lastResult = ref(readSession(RESULT_STORAGE_KEY) || 'unknown')
  const lastError = ref(null)

  async function updateEstimate() {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      quota.value = 0
      usage.value = 0
      return
    }
    try {
      const estimate = await navigator.storage.estimate()
      quota.value = estimate?.quota || 0
      usage.value = estimate?.usage || 0
    } catch (error) {
      quota.value = 0
      usage.value = 0
      lastError.value = error
    }
  }

  async function ensurePersistentStorage(options = {}) {
    if (typeof navigator === 'undefined' || !navigator.storage) {
      supported.value = false
      persisted.value = false
      lastResult.value = 'unsupported'
      writeSession(RESULT_STORAGE_KEY, lastResult.value)
      await updateEstimate()
      return false
    }

    const storage = navigator.storage
    supported.value = typeof storage.persist === 'function'
    if (!supported.value) {
      persisted.value = false
      lastResult.value = 'unsupported'
      writeSession(RESULT_STORAGE_KEY, lastResult.value)
      await updateEstimate()
      return false
    }

    try {
      const already = typeof storage.persisted === 'function'
        ? await storage.persisted()
        : false
      if (already) {
        persisted.value = true
        lastResult.value = 'granted'
        writeSession(RESULT_STORAGE_KEY, lastResult.value)
        await updateEstimate()
        return true
      }

      const previous = !options.force ? readSession(RESULT_STORAGE_KEY) : null
      if (previous === 'denied') {
        persisted.value = false
        lastResult.value = 'denied'
        await updateEstimate()
        return false
      }

      const granted = await storage.persist()
      persisted.value = granted
      lastResult.value = granted ? 'granted' : 'denied'
      writeSession(RESULT_STORAGE_KEY, lastResult.value)
      await updateEstimate()
      return granted
    } catch (error) {
      persisted.value = false
      lastResult.value = 'error'
      lastError.value = error
      writeSession(RESULT_STORAGE_KEY, lastResult.value)
      await updateEstimate()
      return false
    }
  }

  return {
    supported,
    persisted,
    quota,
    usage,
    lastResult,
    lastError,
    ensurePersistentStorage,
    updateEstimate
  }
}


