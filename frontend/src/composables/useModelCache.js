import { openDB } from '../utils/openDB.js'

export function useModelCache() {
  const DB_NAME = 'mmd-viewer'
  const DB_STORE = 'model'
  const LOCAL_KEY = 'mmd-viewer-model'
  let dbPromise
  let useLocal = false

  function getDB() {
    if (useLocal) return Promise.resolve(null)
    if (!dbPromise) {
      if (typeof indexedDB === 'undefined') {
        useLocal = true
        return Promise.resolve(null)
      }
      dbPromise = openDB(DB_NAME, DB_STORE).catch(e => {
        console.warn('IndexedDB unavailable, using localStorage', e)
        useLocal = true
        return null
      })
    }
    return dbPromise
  }

  function promisifyRequest(req, handler) {
    return new Promise((resolve, reject) => {
      const successEvent = 'onsuccess' in req ? 'onsuccess' : 'oncomplete'
      req[successEvent] = () => {
        if (handler) handler(resolve)
        else resolve(req.result)
      }
      req.onerror = () => reject(req.error)
    })
  }

  function arrayBufferToBase64(buffer) {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  function base64ToArrayBuffer(base64) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  async function cacheFiles(modelFiles) {
    try {
      await getDB()
      const dataLists = []
      for (const files of modelFiles) {
        const list = await Promise.all(
          files.map(async f => {
            const buffer = await f.arrayBuffer()
            return {
              name: f.name,
              path: f.webkitRelativePath || f.name,
              type: f.type,
              data: useLocal ? arrayBufferToBase64(buffer) : buffer
            }
          })
        )
        dataLists.push(list)
      }
      if (useLocal) {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(dataLists))
        return true
      }
      try {
        const db = await getDB()
        const tx = db.transaction(DB_STORE, 'readwrite')
        const store = tx.objectStore(DB_STORE)
        await promisifyRequest(store.clear())
        for (let i = 0; i < dataLists.length; i++) {
          await promisifyRequest(store.put(dataLists[i], i))
        }
        await promisifyRequest(tx)
        return true
      } catch (dbErr) {
        console.warn('IndexedDB write failed, falling back to localStorage', dbErr)
        useLocal = true
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(dataLists))
          return true
        } catch (lsErr) {
          console.error('Failed to cache model to localStorage:', lsErr)
          return false
        }
      }
    } catch (e) {
      console.error('Failed to cache model:', e)
      return false
    }
  }

  async function loadCachedFiles() {
    try {
      await getDB()
      if (useLocal) {
        const raw = localStorage.getItem(LOCAL_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return parsed.map(list =>
          list.map(f => ({ ...f, data: base64ToArrayBuffer(f.data) }))
        )
      }
      const db = await getDB()
      const tx = db.transaction(DB_STORE)
      const store = tx.objectStore(DB_STORE)
      const result = []
      const req = store.openCursor()
      await promisifyRequest(req, resolve => {
        const cursor = req.result
        if (cursor) {
          result.push(cursor.value)
          cursor.continue()
        } else {
          resolve()
        }
      })
      return result
    } catch (e) {
      console.error('Failed to load cached model:', e)
      return []
    }
  }

  async function deleteCachedFiles(index) {
    try {
      await getDB()
      if (useLocal) {
        if (index === undefined) {
          localStorage.removeItem(LOCAL_KEY)
        } else {
          const raw = localStorage.getItem(LOCAL_KEY)
          if (!raw) return
          const parsed = JSON.parse(raw)
          parsed.splice(index, 1)
          localStorage.setItem(LOCAL_KEY, JSON.stringify(parsed))
        }
        return
      }
      const db = await getDB()
      const tx = db.transaction(DB_STORE, 'readwrite')
      const store = tx.objectStore(DB_STORE)
      if (index === undefined) {
        store.clear()
      } else {
        store.delete(index)
      }
      await promisifyRequest(tx)
    } catch (e) {
      console.error('Failed to clear model cache:', e)
    }
  }

  return { cacheFiles, loadCachedFiles, deleteCachedFiles, getDB }
}
