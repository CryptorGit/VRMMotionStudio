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
    return new Promise((resolve, reject) => {
      const blob = new Blob([buffer])
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result
        if (typeof result === 'string') {
          resolve(result.split(',')[1])
        } else {
          reject(new Error('Failed to convert arrayBuffer to base64'))
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  }

  function base64ToArrayBuffer(base64) {
    return new Promise((resolve, reject) => {
      const byteString = atob(base64)
      const uint8Array = Uint8Array.from(byteString, c => c.charCodeAt(0))
      const blob = new Blob([uint8Array])
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(blob)
    })
  }

  async function cacheFiles(modelFiles) {
    try {
      await getDB()
      let totalSize = 0
      for (const files of modelFiles) {
        for (const f of files) {
          totalSize += f.size || 0
        }
      }
      const MAX_CACHE_SIZE = 100 * 1024 * 1024
      if (totalSize > MAX_CACHE_SIZE) {
        console.warn('Model files exceed cache size limit, skipping cache')
        return false
      }

      const dataLists = []
      for (const files of modelFiles) {
        const list = await Promise.all(
          files.map(async f => {
            const buffer = await f.arrayBuffer()
            return {
              name: f.name,
              path: f.webkitRelativePath || f.name,
              type: f.type,
              data: useLocal ? await arrayBufferToBase64(buffer) : buffer
            }
          })
        )
        dataLists.push(list)
      }
      if (useLocal) {
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(dataLists))
          return true
        } catch (lsErr) {
          console.error('Failed to cache model to localStorage:', lsErr)
          return false
        }
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
        return Promise.all(
          parsed.map(list =>
            Promise.all(
              list.map(async f => ({ ...f, data: await base64ToArrayBuffer(f.data) }))
            )
          )
        )
      }
      try {
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
      } catch (dbErr) {
        console.warn('IndexedDB read failed, falling back to localStorage', dbErr)
        useLocal = true
        try {
          const raw = localStorage.getItem(LOCAL_KEY)
          if (!raw) return []
          const parsed = JSON.parse(raw)
          return Promise.all(
            parsed.map(list =>
              Promise.all(
                list.map(async f => ({ ...f, data: await base64ToArrayBuffer(f.data) }))
              )
            )
          )
        } catch (lsErr) {
          console.error('Failed to load cached model from localStorage:', lsErr)
          return []
        }
      }
    } catch (e) {
      console.error('Failed to load cached model:', e)
      return []
    }
  }

  async function deleteCachedFiles(index) {
    try {
      await getDB()
      if (useLocal) {
        try {
          if (index === undefined) {
            localStorage.removeItem(LOCAL_KEY)
          } else {
            const raw = localStorage.getItem(LOCAL_KEY)
            if (!raw) return
            const parsed = JSON.parse(raw)
            parsed.splice(index, 1)
            localStorage.setItem(LOCAL_KEY, JSON.stringify(parsed))
          }
        } catch (lsErr) {
          console.error('Failed to clear model cache in localStorage:', lsErr)
        }
        return
      }
      try {
        const db = await getDB()
        const tx = db.transaction(DB_STORE, 'readwrite')
        const store = tx.objectStore(DB_STORE)
        if (index === undefined) {
          store.clear()
        } else {
          store.delete(index)
        }
        await promisifyRequest(tx)
      } catch (dbErr) {
        console.warn('IndexedDB delete failed, falling back to localStorage', dbErr)
        useLocal = true
        try {
          if (index === undefined) {
            localStorage.removeItem(LOCAL_KEY)
          } else {
            const raw = localStorage.getItem(LOCAL_KEY)
            if (!raw) return
            const parsed = JSON.parse(raw)
            parsed.splice(index, 1)
            localStorage.setItem(LOCAL_KEY, JSON.stringify(parsed))
          }
        } catch (lsErr) {
          console.error('Failed to clear model cache in localStorage:', lsErr)
        }
      }
    } catch (e) {
      console.error('Failed to clear model cache:', e)
    }
  }

  return { cacheFiles, loadCachedFiles, deleteCachedFiles, getDB }
}
