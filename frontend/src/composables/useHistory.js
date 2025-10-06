import { ref } from 'vue'

// Generic history manager using snapshot read/apply functions
// Usage: const history = useHistory({ read, apply, limit: 100 })
// - read(): returns a serializable snapshot of current app state
// - apply(state): applies a snapshot to the app
export function useHistory({ read, apply, limit = 100 } = {}) {
  if (typeof read !== 'function' || typeof apply !== 'function') {
    throw new Error('useHistory requires read() and apply() functions')
  }

  const undoStack = ref([])
  const redoStack = ref([])
  const canUndo = ref(false)
  const canRedo = ref(false)
  const lastLabel = ref('')

  function updateFlags() {
    canUndo.value = undoStack.value.length > 0
    canRedo.value = redoStack.value.length > 0
  }

  function push(label = '') {
    try {
      const snap = read()
      if (!snap) return
      undoStack.value.push(snap)
      if (undoStack.value.length > limit) undoStack.value.shift()
      redoStack.value = []
      lastLabel.value = label
      updateFlags()
    } catch {}
  }

  function undo() {
    if (!canUndo.value) return
    try {
      const current = read()
      const prev = undoStack.value.pop()
      if (!prev) return
      redoStack.value.push(current)
      apply(prev)
    } finally {
      updateFlags()
    }
  }

  function redo() {
    if (!canRedo.value) return
    try {
      const current = read()
      const next = redoStack.value.pop()
      if (!next) return
      undoStack.value.push(current)
      apply(next)
    } finally {
      updateFlags()
    }
  }

  function clear() {
    undoStack.value = []
    redoStack.value = []
    updateFlags()
  }

  return {
    canUndo,
    canRedo,
    lastLabel,
    push,
    undo,
    redo,
    clear
  }
}
