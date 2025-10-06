import { inject } from 'vue'

export const captionInjectionKey = Symbol('mmd-caption-toggle')

export function useCaptions() {
  const context = inject(captionInjectionKey, null)
  if (!context) {
    const fallback = message => (typeof message === 'string' ? message : '')
    return {
      showCaptions: true,
      tooltip: fallback
    }
  }

  return context
}
