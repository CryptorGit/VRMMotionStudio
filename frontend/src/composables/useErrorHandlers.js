export function useErrorHandlers({ handleError, handleUnhandledRejection }) {
  function setup() {
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
  }

  function cleanup() {
    window.removeEventListener('error', handleError)
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  }

  return { setup, cleanup }
}



