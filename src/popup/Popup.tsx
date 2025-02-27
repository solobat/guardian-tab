import { useState, useEffect } from 'react'
import { ThemeToggleButton } from '../newtab/components/ThemeToggle'
import './Popup.css'
import { useDarkMode } from '../hooks/store/useTheme'

const links = [
  {
    name: '项目地址',
    url: 'https://github.com/solobat/tangor',
  },
]
export const Popup = () => {
  const { darkMode, toggleDarkMode } = useDarkMode()

  return (
    <div
      className={`p-6 min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Tangor</h1>
        <ThemeToggleButton darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      </div>
      <nav className="space-y-4">
        {links.map((item, index) => (
          <a
            key={index}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`block py-2 px-4 rounded-lg transition-colors duration-200 ${
              darkMode
                ? 'text-blue-400 hover:bg-gray-800 hover:text-blue-300'
                : 'text-blue-600 hover:bg-gray-200 hover:text-blue-800'
            } underline`}
          >
            {item.name}
          </a>
        ))}
      </nav>
      <footer className="mt-8 text-sm text-gray-500">
        <p>版本: 1.0.0</p>
        <p>作者: tomasy</p>
      </footer>
    </div>
  )
}

export default Popup
