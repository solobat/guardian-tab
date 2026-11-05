import { useState, useEffect } from 'react'
import { ThemeToggleButton } from '../newtab/components/ThemeToggle'
import './Popup.css'
import { useDarkMode } from '../hooks/store/useTheme'

const links = [
  {
    name: '项目地址',
    url: 'https://github.com/solobat/guardian-tab',
  },
  {
    name: '隐私权政策',
    url: 'https://github.com/solobat/guardian-tab/blob/main/privacy/index.html',
  },
]
export const Popup = () => {
  const { darkMode, toggleDarkMode } = useDarkMode()
  const [protectedCount, setProtectedCount] = useState(0)
  const version = chrome.runtime.getManifest().version

  useEffect(() => {
    chrome.storage.local.get('navigation-storage').then((data) => {
      const navigations = data['navigation-storage']?.state?.navigations
      setProtectedCount(Array.isArray(navigations) ? navigations.length : 0)
    })
  }, [])

  return (
    <div
      className={`p-6 min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Guardian Tab</h1>
        <ThemeToggleButton darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      </div>

      <div className={`mb-6 rounded-lg px-4 py-3 text-sm ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <p className="font-medium">🛡️ 安全导航保护已启用</p>
        <p className={darkMode ? 'text-gray-400 mt-1' : 'text-gray-600 mt-1'}>
          白名单域名：{protectedCount} 个 · 其余访问将被拦截
        </p>
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
        <p>版本: {version}</p>
        <p>作者: tomasy</p>
      </footer>
    </div>
  )
}

export default Popup
