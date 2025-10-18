import { onMounted, readonly, ref } from 'vue'

export function useTheme() {
  const theme = ref('dark')

  const applyTheme = () => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.dataset.theme = 'dark'
  }

  const setTheme = () => {
    theme.value = 'dark'
    applyTheme()
  }

  onMounted(setTheme)

  return {
    theme: readonly(theme),
    setTheme,
    toggleTheme: setTheme
  }
}
