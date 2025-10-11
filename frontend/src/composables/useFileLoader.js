import { ref } from 'vue'
import useModelLoader from './useModelLoader.js'

export function useFileLoader(ctx) {
  const fileInput = ref(null)
  
  // Pass controller getters to avoid initialization order issues
  const loaderCtx = {
    ...ctx,
    timelineController: ctx.timelineController,
    trackerController: ctx.trackerController
  }
  
  const loader = useModelLoader(loaderCtx)

  function openFile() {
    ctx.logToServer?.({ event: 'import' })
    fileInput.value && fileInput.value.click()
    ctx.menuOpen && (ctx.menuOpen.value = false)
  }

  return { fileInput, openFile, ...loader }
}
