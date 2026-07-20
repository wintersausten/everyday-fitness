const SEEN_KEY = 'everyday-fitness:welcomeSeen:v1'

/** UI-only "has the welcome modal been dismissed" flag. Not user data — trivial pref, localStorage is fine. */
export function hasSeenWelcome(): boolean {
  return localStorage.getItem(SEEN_KEY) === '1'
}

export function markWelcomeSeen(): void {
  localStorage.setItem(SEEN_KEY, '1')
}
