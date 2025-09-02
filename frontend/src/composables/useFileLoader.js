import { ref } from 'vue'
import useModelLoader from './useModelLoader.js'

export function useFileLoader(ctx) {
  const fileInput = ref(null)
  const loader = useModelLoader(ctx)

  function openFile() {
    ctx.logToServer?.({ event: 'import' })
    fileInput.value && fileInput.value.click()
    ctx.menuOpen && (ctx.menuOpen.value = false)
  }

  return { fileInput, openFile, ...loader }
}
