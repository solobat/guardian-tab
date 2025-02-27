import React, { useState, useRef } from 'react'
import { useWallpaperStore } from '../../store/wallpaper'
import { WallpaperIcon } from '../../assets/icons'

const WallpaperSelector: React.FC = () => {
  const { 
    currentWallpaper, 
    opacity, 
    brightness,
    contrast,
    enabled, 
    setWallpaper, 
    setOpacity,
    setBrightness,
    setContrast,
    setEnabled,
    addCustomWallpaper,
    removeCustomWallpaper,
    getAllWallpapers,
    resetSettings
  } = useWallpaperStore()
  
  const [isOpen, setIsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        addCustomWallpaper(dataUrl)
        setWallpaper(dataUrl)
      }
      reader.readAsDataURL(file)
    }
  }
  
  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpacity(parseFloat(e.target.value))
  }
  
  const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrightness(parseFloat(e.target.value))
  }
  
  const handleContrastChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContrast(parseFloat(e.target.value))
  }
  
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">壁纸设置</h3>
              <button 
                className="btn btn-sm btn-circle"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>
            
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
                    onChange={handleOpacityChange}
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
                    onChange={handleBrightnessChange}
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
                    onChange={handleContrastChange}
                    className="range range-primary" 
                  />
                </div>
                
                <div className="mb-4">
                  <label className="label">
                    <span className="label-text">选择壁纸</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
                    <div 
                      className={`aspect-video bg-base-300 flex items-center justify-center rounded cursor-pointer hover:opacity-80 ${!currentWallpaper ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setWallpaper(null)}
                    >
                      <span className="text-xs">无壁纸</span>
                    </div>
                    
                    {getAllWallpapers().map((wallpaper, index) => (
                      <div 
                        key={index}
                        className={`aspect-video bg-cover bg-center rounded cursor-pointer hover:opacity-80 ${currentWallpaper === wallpaper ? 'ring-2 ring-primary' : ''}`}
                        style={{ 
                          backgroundImage: `url(${wallpaper})`,
                          filter: `brightness(${brightness}) contrast(${contrast})`
                        }}
                        onClick={() => setWallpaper(wallpaper)}
                      />
                    ))}
                  </div>
                </div>
                
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
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default WallpaperSelector 