import { MAX_SAVED, type StoreFailure } from './explorationStore'

/** Plain-language messages for failed library operations. Each one says whether anything changed. */
export function storeFailureText(action: 'save' | 'rename' | 'remove' | 'clear' | 'import', reason: StoreFailure): string {
  const what = {
    save: 'The exploration was not saved',
    rename: 'The name was not changed',
    remove: 'The entry was not removed',
    clear: 'History was not cleared',
    import: 'Nothing was imported',
  }[action]
  switch (reason) {
    case 'quota':
      return `${what}: this browser reports its storage is full. Your existing entries are unchanged. Free space by clearing other data for this site in your browser settings, then try again.`
    case 'write-failed':
      return `${what}: the browser refused to update storage. Your existing entries are unchanged. Try again, or check whether site data is allowed for this site.`
    case 'unreadable':
      return `${what}: the saved list on this browser is damaged and could not be read, so it was left untouched.`
    case 'unavailable':
      return `${what}: this browser is blocking local storage. Everything else still works; use Copy link to keep a view.`
    case 'limit':
      return `${what}: you already have ${MAX_SAVED} saved explorations, the maximum. Remove some first.`
    case 'not-found':
      return `${what}: the entry no longer exists (it may have been removed in another tab).`
    default:
      return `${what}.`
  }
}
