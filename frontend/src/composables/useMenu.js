import { ref } from 'vue'

export function useMenu({ fileInput, settingsSidebar, logToServer }) {
  const menuOpen = ref(false)

  function toggleMenu() {
    logToServer({ event: 'menu' })
    menuOpen.value = !menuOpen.value
  }

  function openFile() {
    logToServer({ event: 'import' })
    fileInput.value && fileInput.value.click()
    menuOpen.value = false
  }

  function openSidebarSection(section) {
    if (settingsSidebar.value) {
      settingsSidebar.value.visibleSections[section] = !settingsSidebar.value.visibleSections[section]
    }
    menuOpen.value = false
  }

  return { menuOpen, toggleMenu, openFile, openSidebarSection }
}
