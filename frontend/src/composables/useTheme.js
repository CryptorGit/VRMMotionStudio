import { onMounted, ref, watch } from 'vue'

const STORAGE_KEY = 'ui.theme'

export function useTheme(defaultTheme = 'dark') {
  const theme = ref(defaultTheme)

  function applyTheme(value) {
    const root = document.documentElement
    root.dataset.theme = value
  }

  function setTheme(value) {
    theme.value = value === 'light' ? 'light' : 'dark'
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  onMounted(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'dark' || saved === 'light') {
        theme.value = saved
      }
    } catch {}
    applyTheme(theme.value)
  })

  watch(theme, value => {
    applyTheme(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {}
  }, { immediate: false })

  return {
    theme,
    setTheme,
    toggleTheme
  }
}
