import { openDB } from '../utils/openDB.js'

export function useModelCache() {
  const DB_NAME = 'mmd-viewer'
  const DB_STORE = 'model'
  const LOCAL_KEY = 'mmd-viewer-model'
  let dbPromise
  let useLocal = false
  const devLog = (data) => {
    try {
      if (typeof fetch === 'function' && typeof window !== 'undefined') {
        // vite dev server endpoint installed by dev plugin
        fetch('/__dev__/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'cache', ...data })
        }).catch(() => {})
      }
    } catch {}
  }

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
      // Removed hard 100MB limit: allow caching large models

      const dataLists = []
      for (const files of modelFiles) {
        const list = await Promise.all(
          files.map(async f => {
            const buffer = await f.arrayBuffer()
            return {
              name: f.name,
              // Preserve original relative path if present
              path: f.restoredPath || f.webkitRelativePath || f.name,
              type: f.type,
              data: useLocal ? await arrayBufferToBase64(buffer) : new Blob([buffer], { type: f.type })
            }
          })
        )
        dataLists.push(list)
      }
      devLog({
        event: 'cache:prepare',
        groups: dataLists.length,
        counts: dataLists.map(l => l.length),
        samples: dataLists.map(l => l.slice(0, 5).map(x => x.name))
      })
      if (useLocal) {
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(dataLists))
          devLog({ event: 'cache:local:ok' })
          return true
        } catch (lsErr) {
          console.error('Failed to cache model to localStorage:', lsErr)
          devLog({ event: 'cache:local:error', message: String(lsErr && lsErr.message) })
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
        devLog({ event: 'cache:idb:ok' })
        return true
      } catch (dbErr) {
        console.warn('IndexedDB write failed, falling back to localStorage', dbErr)
        useLocal = true
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(dataLists))
          devLog({ event: 'cache:idb:fallback-local:ok' })
          return true
        } catch (lsErr) {
          console.error('Failed to cache model to localStorage:', lsErr)
          devLog({ event: 'cache:idb:fallback-local:error', message: String(lsErr && lsErr.message) })
          return false
        }
      }
    } catch (e) {
      console.error('Failed to cache model:', e)
      devLog({ event: 'cache:error', message: String(e && e.message) })
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
        const restored = await Promise.all(
          parsed.map(list =>
            Promise.all(
              list.map(async f => ({ ...f, data: await base64ToArrayBuffer(f.data) }))
            )
          )
        )
        devLog({ event: 'load:local', groups: restored.length, counts: restored.map(l => l.length), samples: restored.map(l => l.slice(0,5).map(x => x.name)) })
        return restored
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
        devLog({
          event: 'load:idb',
          groups: result.length,
          counts: result.map(l => (Array.isArray(l) ? l.length : -1)),
          samples: result.map(l => (Array.isArray(l) ? l.slice(0, 5).map(x => x && x.name) : []))
        })
        return result
      } catch (dbErr) {
        console.warn('IndexedDB read failed, falling back to localStorage', dbErr)
        useLocal = true
        try {
          const raw = localStorage.getItem(LOCAL_KEY)
          if (!raw) return []
          const parsed = JSON.parse(raw)
          const restored = await Promise.all(
            parsed.map(list =>
              Promise.all(
                list.map(async f => ({ ...f, data: await base64ToArrayBuffer(f.data) }))
              )
            )
          )
          devLog({ event: 'load:idb-fallback-local', groups: restored.length, counts: restored.map(l => l.length), samples: restored.map(l => l.slice(0,5).map(x => x.name)) })
          return restored
        } catch (lsErr) {
          console.error('Failed to load cached model from localStorage:', lsErr)
          devLog({ event: 'load:idb-fallback-local:error', message: String(lsErr && lsErr.message) })
          return []
        }
      }
    } catch (e) {
      console.error('Failed to load cached model:', e)
      devLog({ event: 'load:error', message: String(e && e.message) })
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
