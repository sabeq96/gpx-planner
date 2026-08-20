import { useEffect } from 'react'
import { themeChange } from 'theme-change'

/**
 * Cycles data-theme between "light" and "dark" via theme-change, which also
 * persists the choice to localStorage. Before a choice is made, no data-theme
 * attribute is set at all, so daisyUI's `--prefersdark` CSS flag applies the
 * OS preference automatically — see src/index.css.
 */
export default function ThemeToggle() {
  useEffect(() => {
    themeChange(false)
  }, [])

  return (
    <button
      type="button"
      className="btn btn-ghost btn-circle text-lg"
      data-set-theme="light,dark"
      aria-label="Toggle light/dark theme"
      title="Toggle light/dark theme"
    >
      🌓
    </button>
  )
}
