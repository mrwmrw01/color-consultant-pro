/**
 * Recent Colors Management
 * Stores and retrieves recently used colors from localStorage
 */

const RECENT_COLORS_KEY = 'color-consultant-recent-colors'
const MAX_RECENT_COLORS = 10

export interface RecentColor {
  id: string
  name: string
  colorCode: string
  manufacturer: string
  hexColor?: string
  timestamp: number
}

/**
 * Get all recent colors from localStorage
 */
export function getRecentColors(): RecentColor[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(RECENT_COLORS_KEY)
    if (!stored) return []

    const colors: RecentColor[] = JSON.parse(stored)
    // Sort by most recent first
    return colors.sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error('Error reading recent colors from localStorage:', error)
    return []
  }
}

/**
 * Add a color to recent colors list
 * Automatically manages the list to keep only the most recent MAX_RECENT_COLORS
 */
export function addRecentColor(color: Omit<RecentColor, 'timestamp'>): void {
  if (typeof window === 'undefined') return

  try {
    const existing = getRecentColors()

    // Remove if already exists (we'll re-add it with new timestamp)
    const filtered = existing.filter(c => c.id !== color.id)

    // Add new color to the front
    const updated: RecentColor[] = [
      { ...color, timestamp: Date.now() },
      ...filtered
    ].slice(0, MAX_RECENT_COLORS) // Keep only MAX_RECENT_COLORS

    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Error saving recent color to localStorage:', error)
  }
}

/**
 * Clear all recent colors
 */
export function clearRecentColors(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(RECENT_COLORS_KEY)
  } catch (error) {
    console.error('Error clearing recent colors:', error)
  }
}

/**
 * Check if a color is in recent colors
 */
export function isRecentColor(colorId: string): boolean {
  const recent = getRecentColors()
  return recent.some(c => c.id === colorId)
}
