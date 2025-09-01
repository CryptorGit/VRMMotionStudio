import { ref, onUnmounted } from 'vue'

export function useResizableSidebar(initialWidth = 300) {
  const width = ref(initialWidth)
  const isResizing = ref(false)
  let moveListener = null
  let upListener = null

  function startResize(e) {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width.value
    isResizing.value = true
    document.body.style.userSelect = 'none'
    let frameId
    moveListener = function (ev) {
      if (frameId) cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        const delta = startX - ev.clientX
        width.value = Math.max(150, startWidth + delta)
      })
    }
    upListener = function () {
      document.removeEventListener('mousemove', moveListener)
      document.removeEventListener('mouseup', upListener)
      if (frameId) cancelAnimationFrame(frameId)
      document.body.style.userSelect = ''
      isResizing.value = false
      moveListener = null
      upListener = null
    }
    document.addEventListener('mousemove', moveListener)
    document.addEventListener('mouseup', upListener)
  }

  onUnmounted(() => {
    if (moveListener) {
      document.removeEventListener('mousemove', moveListener)
      moveListener = null
    }
    if (upListener) {
      document.removeEventListener('mouseup', upListener)
      upListener = null
    }
  })

  return { width, isResizing, startResize }
}
