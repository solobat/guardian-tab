import { useState, useEffect } from 'react'
import { SunIcon, MoonIcon } from '../../assets/icons'

export const ThemeToggleButton = ({
  darkMode,
  toggleDarkMode,
}: {
  darkMode: boolean
  toggleDarkMode: () => void
}) => (
  <button
    className={`btn btn-outline btn-xs ${darkMode ? 'text-white border-white' : ''}`}
    onClick={toggleDarkMode}
  >
    {darkMode ? <SunIcon /> : <MoonIcon />}
  </button>
)
