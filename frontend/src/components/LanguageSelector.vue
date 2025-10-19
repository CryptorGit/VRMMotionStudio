<template>
  <div class="language-selector">
    <button 
      class="language-toggle" 
      @click="showMenu = !showMenu"
      :title="currentLocaleLabel"
      @blur="handleBlur"
    >
      <span class="language-code">{{ currentLocaleTag }}</span>
      <span class="language-name">{{ currentLocaleLabel }}</span>
      <Icon icon="mdi:chevron-down" class="chevron" :class="{ open: showMenu }" />
    </button>
    
    <Transition name="dropdown">
      <div v-if="showMenu" class="language-menu">
        <button
          v-for="lang in menuLocales"
          :key="lang.code"
          class="language-option"
          :class="{ active: locale === lang.code }"
          @click="selectLanguage(lang.code)"
        >
          <span class="option-tag">{{ lang.tag }}</span>
          <span class="option-name">{{ labelFor(lang.code, lang.fallbackName) }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useI18n } from '../locales/index.js'

const { locale, setLocale, availableLocales, t } = useI18n()
const showMenu = ref(false)

const menuLocales = computed(() => availableLocales.value || [])
const languageNames = computed(() => t.value?.languages || {})

const currentLocaleData = computed(() => {
  const locales = menuLocales.value
  return locales.find(l => l.code === locale.value) || locales[0] || { code: 'en', fallbackName: 'English', tag: 'EN' }
})

const labelFor = (code, fallback) => languageNames.value[code] || fallback || code.toUpperCase()

const currentLocaleLabel = computed(() => labelFor(currentLocaleData.value.code, currentLocaleData.value.fallbackName))
const currentLocaleTag = computed(() => currentLocaleData.value.tag)

const selectLanguage = (code) => {
  setLocale(code)
  showMenu.value = false
}

const handleBlur = () => {
  setTimeout(() => {
    showMenu.value = false
  }, 200)
}
</script>

<style scoped>
.language-selector {
  position: relative;
}

.language-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(30, 33, 42, 0.78);
  color: rgba(255, 255, 255, 0.92);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.language-toggle:hover {
  background: rgba(40, 43, 52, 0.85);
  border-color: rgba(255, 255, 255, 0.2);
}

.language-code {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
  background: rgba(92, 140, 255, 0.18);
  color: rgba(210, 220, 255, 0.92);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.language-name {
  font-size: 0.85rem;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.chevron {
  font-size: 1.1rem;
  transition: transform 0.2s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

.language-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 180px;
  padding: 0.5rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(24, 26, 32, 0.98);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 1000;
}

.language-option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.55rem 0.8rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.language-option:hover {
  background: rgba(92, 140, 255, 0.15);
  color: rgba(255, 255, 255, 0.95);
}

.language-option.active {
  background: rgba(92, 140, 255, 0.22);
  color: rgba(255, 255, 255, 0.98);
  font-weight: 600;
}

.option-name {
  flex: 1;
  letter-spacing: 0.01em;
}

.option-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.2rem;
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
  background: rgba(92, 140, 255, 0.18);
  color: rgba(220, 230, 255, 0.9);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
}

/* Dropdown transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
