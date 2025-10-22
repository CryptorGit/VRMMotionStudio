import { openDB } from '../utils/openDB.js'

export function useModelCache() {
  const DB_NAME = 'mmd-viewer'
  const DB_STORE = 'model'
  const LOCAL_KEY = 'mmd-viewer-model'
  const CACHE_RECORD_VERSION = 2
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

  async function ensureArrayBuffer(data) {
    if (!data) return new ArrayBuffer(0)
    if (data instanceof ArrayBuffer) return data.slice(0)
    if (ArrayBuffer.isView(data)) {
      const view = data
      return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
    }
    if (data instanceof Blob) {
      try {
        const buffer = await data.arrayBuffer()
        return buffer.slice(0)
      } catch (error) {
        devLog({ event: 'cache:blob-read:error', message: String(error?.message || error) })
        return new ArrayBuffer(0)
      }
    }
    if (typeof data === 'string') {
      try {
        return await base64ToArrayBuffer(data)
      } catch (error) {
        devLog({ event: 'cache:base64:error', message: String(error?.message || error) })
        return new ArrayBuffer(0)
      }
    }
    return new ArrayBuffer(0)
  }

  async function normalizeCachedFile(record, { base64 = false } = {}) {
    if (!record) return null
    try {
      const buffer = base64 ? await base64ToArrayBuffer(record.data) : await ensureArrayBuffer(record.data)
      return {
        version: Number(record.version) || 1,
        name: record.name || 'model.vrm',
        path: record.path || record.name || 'model.vrm',
        type: record.type || 'application/octet-stream',
        size: buffer?.byteLength ?? Number(record.size) ?? 0,
        data: buffer
      }
    } catch (error) {
      devLog({ event: 'cache:normalize:error', message: String(error?.message || error) })
      return null
    }
  }

  async function serializeListsForLocalStorage(lists) {
    return Promise.all(
      lists.map(list =>
        Promise.all(
          list.map(async record => ({
            ...record,
            data: await arrayBufferToBase64(await ensureArrayBuffer(record.data))
          }))
        )
      )
    )
  }

  function getDB() {
    if (useLocal) return Promise.resolve(null)
    if (!dbPromise) {
      if (typeof indexedDB === 'undefined') {
        useLocal = true
        return Promise.resolve(null)
      }
      dbPromise = openDB(DB_NAME, DB_STORE).catch(e => {
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
      try {
        const byteString = atob(base64)
        const buffer = new ArrayBuffer(byteString.length)
        const view = new Uint8Array(buffer)
        for (let i = 0; i < byteString.length; i++) {
          view[i] = byteString.charCodeAt(i)
        }
        resolve(buffer)
      } catch (error) {
        reject(error)
      }
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
            const cloned = buffer.slice(0)
            const record = {
              version: CACHE_RECORD_VERSION,
              name: f.name,
              // Preserve original relative path if present
              path: f.restoredPath || f.webkitRelativePath || f.name,
              type: f.type,
              size: cloned.byteLength,
              data: cloned
            }
            if (Number.isFinite(f.lastModified)) {
              record.lastModified = f.lastModified
            }
            return record
          })
        )
        dataLists.push(list)
      }
      devLog({
        event: 'cache:prepare',
        groups: dataLists.length,
        counts: dataLists.map(l => l.length),
        sizes: dataLists.map(l => l.map(x => x.size)),
        samples: dataLists.map(l => l.slice(0, 5).map(x => x.name))
      })
      if (useLocal) {
        const serializedLists = await serializeListsForLocalStorage(dataLists)
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(serializedLists))
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
        useLocal = true
        const serializedLists = await serializeListsForLocalStorage(dataLists)
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(serializedLists))
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
          parsed.map(async list => {
            const normalizedList = await Promise.all(
              (Array.isArray(list) ? list : []).map(item => normalizeCachedFile(item, { base64: true }))
            )
            return normalizedList.filter(Boolean)
          })
        )
        devLog({
          event: 'load:local',
          groups: restored.length,
          counts: restored.map(l => l.length),
          sizes: restored.map(l => l.map(x => x.size)),
          samples: restored.map(l => l.slice(0, 5).map(x => x.name))
        })
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
        const normalized = await Promise.all(
          result.map(async list => {
            const normalizedList = await Promise.all(
              (Array.isArray(list) ? list : []).map(item => normalizeCachedFile(item))
            )
            return normalizedList.filter(Boolean)
          })
        )
        devLog({
          event: 'load:idb',
          groups: normalized.length,
          counts: normalized.map(l => l.length),
          sizes: normalized.map(l => l.map(x => x.size)),
          samples: normalized.map(l => l.slice(0, 5).map(x => x && x.name))
        })
        return normalized
      } catch (dbErr) {
        useLocal = true
        try {
          const raw = localStorage.getItem(LOCAL_KEY)
          if (!raw) return []
          const parsed = JSON.parse(raw)
          const restored = await Promise.all(
            parsed.map(async list => {
              const normalizedList = await Promise.all(
                (Array.isArray(list) ? list : []).map(item => normalizeCachedFile(item, { base64: true }))
              )
              return normalizedList.filter(Boolean)
            })
          )
          devLog({
            event: 'load:idb-fallback-local',
            groups: restored.length,
            counts: restored.map(l => l.length),
            sizes: restored.map(l => l.map(x => x.size)),
            samples: restored.map(l => l.slice(0, 5).map(x => x.name))
          })
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
        }
      }
    } catch (e) {
    }
  }

  async function exportProjectToFile() {
    try {
      await getDB()
      let dataLists = []
      
      if (useLocal) {
        const raw = localStorage.getItem(LOCAL_KEY)
        if (!raw) {
          throw new Error('No cached data to export')
        }
        const parsed = JSON.parse(raw)
        dataLists = parsed
      } else {
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
        
        // Convert ArrayBuffer to base64 for JSON serialization
        dataLists = await Promise.all(
          result.map(async list => {
            return Promise.all(
              (Array.isArray(list) ? list : []).map(async item => ({
                ...item,
                data: await arrayBufferToBase64(await ensureArrayBuffer(item.data))
              }))
            )
          })
        )
      }
      
      const projectData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        app: 'StellarMotion Studio',
        cacheVersion: CACHE_RECORD_VERSION,
        models: dataLists
      }
      
      const jsonString = JSON.stringify(projectData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `project_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      devLog({ event: 'export:ok', groups: dataLists.length })
      return true
    } catch (e) {
      console.error('Failed to export project:', e)
      devLog({ event: 'export:error', message: String(e && e.message) })
      return false
    }
  }

  async function importProjectFromFile(file) {
    try {
      const text = await file.text()
      const projectData = JSON.parse(text)
      
      if (!projectData.models || !Array.isArray(projectData.models)) {
        throw new Error('Invalid project file format')
      }
      
      // Convert base64 data back to ArrayBuffer and normalize
      const dataLists = await Promise.all(
        projectData.models.map(async list => {
          const normalizedList = await Promise.all(
            (Array.isArray(list) ? list : []).map(async item => {
              const buffer = await base64ToArrayBuffer(item.data)
              return {
                version: item.version || CACHE_RECORD_VERSION,
                name: item.name,
                path: item.path || item.name,
                type: item.type,
                size: buffer.byteLength,
                data: buffer,
                lastModified: item.lastModified
              }
            })
          )
          return normalizedList.filter(Boolean)
        })
      )
      
      devLog({
        event: 'import:prepare',
        groups: dataLists.length,
        counts: dataLists.map(l => l.length),
        sizes: dataLists.map(l => l.map(x => x.size)),
        samples: dataLists.map(l => l.slice(0, 5).map(x => x.name))
      })
      
      await getDB()
      
      if (useLocal) {
        const serializedLists = await serializeListsForLocalStorage(dataLists)
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(serializedLists))
          devLog({ event: 'import:local:ok' })
          return dataLists
        } catch (lsErr) {
          console.error('Failed to import project to localStorage:', lsErr)
          devLog({ event: 'import:local:error', message: String(lsErr && lsErr.message) })
          throw lsErr
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
        devLog({ event: 'import:idb:ok' })
        return dataLists
      } catch (dbErr) {
        useLocal = true
        const serializedLists = await serializeListsForLocalStorage(dataLists)
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(serializedLists))
          devLog({ event: 'import:idb:fallback-local:ok' })
          return dataLists
        } catch (lsErr) {
          console.error('Failed to import project to localStorage:', lsErr)
          devLog({ event: 'import:idb:fallback-local:error', message: String(lsErr && lsErr.message) })
          throw lsErr
        }
      }
    } catch (e) {
      console.error('Failed to import project:', e)
      devLog({ event: 'import:error', message: String(e && e.message) })
      throw e
    }
  }

  return { cacheFiles, loadCachedFiles, deleteCachedFiles, getDB, exportProjectToFile, importProjectFromFile }
}
