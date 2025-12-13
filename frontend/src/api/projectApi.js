/**
 * プロジェクトファイルのバックエンドアップロード用API
 */

// Base path for backend API.
// - Local dev: Vite proxies `/api/*` to `http://localhost:8081`.
// - Docker: Nginx exposes backend under `/api/*`.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * プロジェクトファイルをバックエンドにアップロード
 * @param {Blob} blob - アップロードするJSONファイルのBlob
 * @param {string} filename - ファイル名
 * @param {string} projectName - プロジェクト名（オプション）
 * @returns {Promise<Object>} アップロード結果
 */
export async function uploadProjectToBackend(blob, filename, projectName = '') {
  try {
    const formData = new FormData()
    formData.append('file', blob, filename)
    if (projectName) {
      formData.append('projectName', projectName)
    }

    const response = await fetch(`${API_BASE_URL}/projects/upload`, {
      method: 'POST',
      body: formData,
      // Content-Typeヘッダーは自動的に設定される（multipart/form-data）
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `アップロードに失敗しました (Status: ${response.status})`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('[ProjectAPI] Upload error:', error)
    throw error
  }
}

/**
 * バックエンドに保存されているプロジェクト一覧を取得
 * @returns {Promise<Array>} プロジェクト一覧
 */
export async function listProjectsFromBackend() {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/list`)

    if (!response.ok) {
      throw new Error(`プロジェクト一覧の取得に失敗しました (Status: ${response.status})`)
    }

    const result = await response.json()
    return result.projects || []
  } catch (error) {
    console.error('[ProjectAPI] List projects error:', error)
    throw error
  }
}

/**
 * バックエンド接続状態をチェック
 * @returns {Promise<boolean>} 接続可能ならtrue
 */
export async function checkBackendConnection() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3秒タイムアウト

    const response = await fetch(`${API_BASE_URL}/projects/list`, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    return response.ok
  } catch (error) {
    console.warn('[ProjectAPI] Backend connection check failed:', error.message)
    return false
  }
}
