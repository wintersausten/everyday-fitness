import { useEffect } from 'react'
import { useWeightStore } from '../store'

export const useTheme = () => {
  const { settings } = useWeightStore()

  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement
      const { theme } = settings

      // Remove existing theme classes
      root.classList.remove('theme-light', 'theme-dark', 'theme-system')

      if (theme === 'light') {
        root.classList.add('theme-light')
        root.setAttribute('data-theme', 'light')
      } else if (theme === 'dark') {
        root.classList.add('theme-dark')
        root.setAttribute('data-theme', 'dark')
      } else {
        // System theme
        root.classList.add('theme-system')
        root.setAttribute('data-theme', 'system')
      }
    }

    applyTheme()
  }, [settings.theme])

  return settings.theme
}