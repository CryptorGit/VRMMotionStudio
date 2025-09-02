export function useModelCache() {
  const DB_NAME = 'mmd-viewer'
  const DB_STORE = 'model'
  let dbPromise

  function getDB() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = () => {
          req.result.createObjectStore(DB_STORE)
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
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

  async function cacheFiles(modelFiles) {
    try {
      const dataLists = []
      for (const files of modelFiles) {
        const list = await Promise.all(
          files.map(async f => ({
            name: f.name,
            path: f.webkitRelativePath || f.name,
            type: f.type,
            data: await f.arrayBuffer()
          }))
        )
        dataLists.push(list)
      }
      const db = await getDB()
      const tx = db.transaction(DB_STORE, 'readwrite')
      const store = tx.objectStore(DB_STORE)
      await promisifyRequest(store.clear())
      for (let i = 0; i < dataLists.length; i++) {
        await promisifyRequest(store.put(dataLists[i], i))
      }
      await promisifyRequest(tx)
    } catch (e) {
      console.error('Failed to cache model:', e)
    }
  }

  async function loadCachedFiles() {
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
    } catch (e) {
      console.error('Failed to load cached model:', e)
      return []
    }
  }

  async function deleteCachedFiles(index) {
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
    } catch (e) {
      console.error('Failed to clear model cache:', e)
    }
  }

  return { cacheFiles, loadCachedFiles, deleteCachedFiles }
}
