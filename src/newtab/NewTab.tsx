import React, { useEffect, useState } from 'react'
import './NewTab.css'
import { useDarkMode } from '../hooks/store/useTheme'
import { ConfirmProvider } from '../hooks/context/ConfirmContext'
import { cleanupMarketRefresh, initializeMarketRefresh } from '../store/market'
import TokenList from './components/TokenList'
import CustomNavigation from './components/CustomNavigation'
import { useTokenStore } from '../store/token'
import { useNavigationStore } from '../store/navigation'
import { useWallpaperStore } from '../store/wallpaper'
import { MoonIcon, SunIcon } from '../assets/icons'
import Settings from './components/Settings'
import WallpaperSelector from './components/WallpaperSelector'

export const NewTab: React.FC = () => {
  const { darkMode, toggleDarkMode, theme } = useDarkMode()
  const { tokens, fetchTokens } = useTokenStore()
  const { navigations, fetchNavigations } = useNavigationStore()
  const { currentWallpaper, opacity, brightness, contrast, enabled } = useWallpaperStore()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const init = async () => {
      initializeMarketRefresh()
      await fetchNavigations()
      await fetchTokens()
      setIsReady(true)
    }
    
    init()

    return () => {
      cleanupMarketRefresh()
    }
  }, [])

  // 计算内容区域的背景样式
  const getContentStyle = () => {
    // 如果启用了壁纸，使用半透明背景
    if (enabled && currentWallpaper) {
      return darkMode 
        ? 'bg-base-100 bg-opacity-70' // 暗模式下稍微更透明
        : 'bg-base-100 bg-opacity-90'; // 亮模式下稍微不那么透明
    }
    // 如果没有壁纸，使用完全不透明的背景
    return 'bg-base-100';
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    )
  }

  return (
    <ConfirmProvider>
      <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
        {/* 壁纸背景 */}
        {enabled && currentWallpaper && (
          <div 
            className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0"
            style={{ 
              backgroundImage: `url(${currentWallpaper})`,
              opacity: opacity,
              filter: `brightness(${brightness}) contrast(${contrast})`
            }}
          />
        )}
        
        <div className={`${getContentStyle()} text-base-content min-h-screen p-4 relative z-10 transition-colors duration-300`}>
          <div className="flex justify-end mb-4">
            <button 
              className="btn btn-circle btn-sm" 
              onClick={toggleDarkMode}
            >
              {darkMode ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          
          <div className="container mx-auto">
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">市场</h2>
              <TokenList tokens={tokens} />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-4">导航</h2>
              <CustomNavigation navigations={navigations} />
            </div>
          </div>
          <Settings />
          <WallpaperSelector />
        </div>
      </div>
    </ConfirmProvider>
  )
}

export default NewTab
