import { ref } from 'vue'

export function useMenu({ settingsSidebar, logToServer }) {
  const menuOpen = ref(false)

  function toggleMenu() {
    logToServer({ event: 'menu' })
    menuOpen.value = !menuOpen.value
  }

  function openSidebarSection(section) {
    if (settingsSidebar.value) {
      settingsSidebar.value.visibleSections[section] = !settingsSidebar.value.visibleSections[section]
    }
    menuOpen.value = false
  }

  return { menuOpen, toggleMenu, openSidebarSection }
}


