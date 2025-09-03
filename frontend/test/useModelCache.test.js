import { describe, it, expect, vi } from 'vitest'
import { useModelCache } from '../src/composables/useModelCache.js'

describe('useModelCache', () => {
  it('skips caching when total file size exceeds limit', async () => {
    const { cacheFiles } = useModelCache()
    const mockFile = {
      name: 'large.pmx',
      size: 101 * 1024 * 1024,
      arrayBuffer: vi.fn(async () => new ArrayBuffer(1)),
      type: 'model',
      webkitRelativePath: ''
    }
    const result = await cacheFiles([[mockFile]])
    expect(result).toBe(false)
    expect(mockFile.arrayBuffer).not.toHaveBeenCalled()
  })
})
