/*
 * A tab left open across a new deploy still points at code files the server has replaced, so a
 * lazy page or 3D view can no longer download. Reloading fetches the current version. It happens
 * once per minute at most, so a real outage shows an error rather than a reload loop.
 */
const KEY = 'stem-explorer:stale-reload'
const WINDOW_MS = 60_000

function recentlyReloaded(): boolean {
  try {
    return Date.now() - Number(sessionStorage.getItem(KEY) ?? 0) < WINDOW_MS
  } catch {
    return true
  }
}

export function installStaleBuildRecovery() {
  window.addEventListener('vite:preloadError', (event) => {
    if (recentlyReloaded()) return
    try {
      sessionStorage.setItem(KEY, String(Date.now()))
    } catch {
      return
    }
    event.preventDefault()
    window.location.reload()
  })
}

/** True when an error means that a code file could not be downloaded. */
export const isDownloadError = (error: Error) => /dynamically imported module|importing a module script|error loading dynamically|preload css|unable to preload/i.test(error.message)
