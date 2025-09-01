import { ref } from 'vue'

export function useMenu({ settingsSidebar, logToServer }) {
  const menu = ref(null)
  const menuOpen = ref(false)

  function toggleMenu() {
    if (import.meta.env.DEV) console.log('Menu button clicked')
    logToServer({ event: 'menu' })
    menuOpen.value = !menuOpen.value
  }

  function openSidebarSection(section) {
    if (settingsSidebar.value) {
      const isVisible = settingsSidebar.value.visibleSections[section]
      if (isVisible) {
        settingsSidebar.value.visibleSections[section] = false
        settingsSidebar.value.expandedSections[section] = false
      } else {
        settingsSidebar.value.visibleSections[section] = true
        settingsSidebar.value.openSection(section)
      }
    }
    menuOpen.value = false
  }

  function handleDocumentClick(e) {
    if (menuOpen.value && menu.value && !menu.value.contains(e.target)) {
      menuOpen.value = false
    }
  }

  return { menu, menuOpen, toggleMenu, openSidebarSection, handleDocumentClick }
}
