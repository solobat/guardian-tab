import React, { useState, useRef } from 'react'
import { useWallpaperStore } from '../../store/wallpaper'
import { WallpaperIcon } from '../../assets/icons'

// 壁纸操作按钮组件
const WallpaperActions: React.FC<{
  wallpaper: string
  size?: 'sm' | 'xs'
  className?: string
}> = ({ wallpaper, size = 'xs', className = '' }) => {
  const { favoriteWallpapers, addToFavorites, removeFromFavorites, downloadWallpaper } = useWallpaperStore()
  
  const btnClass = `btn btn-${size} btn-circle btn-ghost bg-base-100 bg-opacity-50 hover:bg-opacity-75 ${className}`
  
  return (
    <div className="flex gap-1">
      {!favoriteWallpapers.includes(wallpaper) ? (
        <button 
          className={btnClass}
          onClick={(e) => {
            e.stopPropagation()
            addToFavorites(wallpaper)
          }}
          title="收藏壁纸"
        >
          ♡
        </button>
      ) : (
        <button 
          className={`${btnClass} text-error`}
          onClick={(e) => {
            e.stopPropagation()
            removeFromFavorites(wallpaper)
          }}
          title="取消收藏"
        >
          ♥
        </button>
      )}
      <button 
        className={btnClass}
        onClick={(e) => {
          e.stopPropagation()
          downloadWallpaper(wallpaper)
        }}
        title="下载壁纸"
      >
        ↓
      </button>
    </div>
  )
}

// Bing每日壁纸组件
const BingDailyWallpaper: React.FC = () => {
  const { 
    bingWallpaper, 
    currentWallpaper, 
    brightness, 
    contrast,
    setWallpaper 
  } = useWallpaperStore()

  if (!bingWallpaper) return null

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium flex items-center gap-2">
        <span className="text-accent">必应每日壁纸</span>
        {currentWallpaper === bingWallpaper && (
          <span className="text-xs text-primary">(当前使用中)</span>
        )}
      </div>
      <div className="relative">
        <div 
          className={`
            aspect-[21/9] w-full bg-cover bg-center rounded-lg cursor-pointer 
            hover:opacity-90 transition-opacity
            ${currentWallpaper === bingWallpaper ? 'ring-2 ring-primary' : 'ring-1 ring-accent'}
          `}
          style={{ 
            backgroundImage: `url(${bingWallpaper})`,
            filter: `brightness(${brightness}) contrast(${contrast})`
          }}
          onClick={() => setWallpaper(bingWallpaper)}
        />
        <div className="absolute top-2 right-2">
          <WallpaperActions wallpaper={bingWallpaper} size="sm" />
        </div>
      </div>
    </div>
  )
}

// 普通壁纸项组件
const WallpaperItem: React.FC<{
  wallpaper: string
  isBingWallpaper?: boolean
}> = ({ wallpaper, isBingWallpaper }) => {
  const { currentWallpaper, brightness, contrast, setWallpaper } = useWallpaperStore()

  return (
    <div className="relative">
      <div 
        className={`aspect-video bg-cover bg-center rounded cursor-pointer hover:opacity-80 ${
          currentWallpaper === wallpaper ? 'ring-2 ring-primary' : ''
        }`}
        style={{ 
          backgroundImage: `url(${wallpaper})`,
          filter: `brightness(${brightness}) contrast(${contrast})`
        }}
        onClick={() => setWallpaper(wallpaper)}
      />
      
      {isBingWallpaper && (
        <div className="absolute top-1 left-1 bg-accent bg-opacity-75 text-accent-content text-xs px-1.5 py-0.5 rounded-full">
          必应
        </div>
      )}
      
      <div className="absolute top-1 right-1">
        <WallpaperActions wallpaper={wallpaper} />
      </div>
    </div>
  )
}

// 壁纸控制组件
const WallpaperControls: React.FC = () => {
  const { 
    opacity, 
    brightness, 
    contrast,
    setOpacity,
    setBrightness,
    setContrast
  } = useWallpaperStore()

  return (
    <>
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">壁纸不透明度</span>
          <span className="label-text-alt">{Math.round(opacity * 100)}%</span>
        </label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05"
          value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
          className="range range-primary" 
        />
      </div>
      
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">壁纸亮度</span>
          <span className="label-text-alt">{Math.round(brightness * 100)}%</span>
        </label>
        <input 
          type="range" 
          min="0.5" 
          max="1.5" 
          step="0.05"
          value={brightness}
          onChange={(e) => setBrightness(parseFloat(e.target.value))}
          className="range range-primary" 
        />
      </div>
      
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">壁纸对比度</span>
          <span className="label-text-alt">{Math.round(contrast * 100)}%</span>
        </label>
        <input 
          type="range" 
          min="0.5" 
          max="1.5" 
          step="0.05"
          value={contrast}
          onChange={(e) => setContrast(parseFloat(e.target.value))}
          className="range range-primary" 
        />
      </div>
    </>
  )
}

// 底部操作按钮组件
const WallpaperFooterActions: React.FC = () => {
  const { 
    currentWallpaper,
    getAllWallpapers,
    removeCustomWallpaper,
    resetSettings
  } = useWallpaperStore()
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        useWallpaperStore.getState().addCustomWallpaper(dataUrl)
        useWallpaperStore.getState().setWallpaper(dataUrl)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="flex justify-between">
      <button 
        className="btn btn-sm btn-primary"
        onClick={() => fileInputRef.current?.click()}
      >
        上传壁纸
      </button>
      
      <button 
        className="btn btn-sm btn-secondary"
        onClick={resetSettings}
      >
        重置设置
      </button>
      
      {currentWallpaper && !getAllWallpapers().slice(0, 6).includes(currentWallpaper) && (
        <button 
          className="btn btn-sm btn-error"
          onClick={() => removeCustomWallpaper(currentWallpaper)}
        >
          删除当前壁纸
        </button>
      )}

      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  )
}

// 主组件
const WallpaperSelector: React.FC = () => {
  const { 
    useBingDaily,
    bingWallpaper,
    currentWallpaper,
    enabled,
    favoriteWallpapers,
    setEnabled,
    setWallpaper,
    getAllWallpapers,
  } = useWallpaperStore()
  
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button 
        className="btn btn-circle btn-sm absolute bottom-4 left-4 z-10"
        onClick={() => setIsOpen(true)}
        title="壁纸设置"
      >
        <WallpaperIcon />
      </button>
      
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 p-4 rounded-lg shadow-xl w-full max-w-md">
            {/* 标题栏 */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">壁纸设置</h3>
              <button 
                className="btn btn-sm btn-circle"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* 启用开关 */}
            <div className="form-control mb-4">
              <label className="label cursor-pointer">
                <span className="label-text">启用壁纸</span>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary" 
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
              </label>
            </div>

            {enabled && (
              <div className="space-y-4">
                {/* 壁纸调节控件 */}
                <WallpaperControls />

                {/* Bing每日壁纸 */}
                {useBingDaily && <BingDailyWallpaper />}

                {/* 壁纸列表 */}
                <div>
                  <div className="text-sm font-medium mb-2">所有壁纸</div>
                  <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
                    {/* 无壁纸选项 */}
                    <div 
                      className={`aspect-video bg-base-300 flex items-center justify-center rounded cursor-pointer hover:opacity-80 ${
                        !currentWallpaper ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setWallpaper(null)}
                    >
                      <span className="text-xs">无壁纸</span>
                    </div>
                    
                    {getAllWallpapers().map((wallpaper, index) => {
                      const isBingWallpaper = wallpaper === bingWallpaper
                      // 如果是当前的Bing壁纸且未收藏，则跳过（因为已在上方显示）
                      if (isBingWallpaper && !favoriteWallpapers.includes(wallpaper)) {
                        return null
                      }

                      return (
                        <WallpaperItem 
                          key={index}
                          wallpaper={wallpaper}
                          isBingWallpaper={isBingWallpaper}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* 底部按钮组 */}
                <WallpaperFooterActions />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default WallpaperSelector 