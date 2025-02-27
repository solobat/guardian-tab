import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 预设壁纸列表
const DEFAULT_WALLPAPERS = [
  '/wallpapers/w1.jpeg',
  '/wallpapers/w2.jpeg',
  '/wallpapers/w3.jpeg',
  '/wallpapers/w4.jpeg',
]

interface WallpaperState {
  // 当前壁纸URL
  currentWallpaper: string | null
  // 自定义壁纸URL
  customWallpapers: string[]
  // 壁纸不透明度
  opacity: number
  // 壁纸亮度 (0-2, 1为正常)
  brightness: number
  // 壁纸对比度 (0-2, 1为正常)
  contrast: number
  // 是否启用壁纸
  enabled: boolean
  // 设置当前壁纸
  setWallpaper: (url: string | null) => void
  // 添加自定义壁纸
  addCustomWallpaper: (url: string) => void
  // 删除自定义壁纸
  removeCustomWallpaper: (url: string) => void
  // 设置不透明度
  setOpacity: (opacity: number) => void
  // 设置亮度
  setBrightness: (brightness: number) => void
  // 设置对比度
  setContrast: (contrast: number) => void
  // 启用/禁用壁纸
  setEnabled: (enabled: boolean) => void
  // 获取所有可用壁纸
  getAllWallpapers: () => string[]
  // 重置壁纸设置
  resetSettings: () => void
}

export const useWallpaperStore = create<WallpaperState>()(
  persist(
    (set, get) => ({
      currentWallpaper: DEFAULT_WALLPAPERS[0],
      customWallpapers: [],
      opacity: 0.2,
      brightness: 1.0,
      contrast: 1.0,
      enabled: true,
      
      setWallpaper: (url) => {
        set({ currentWallpaper: url })
      },
      
      addCustomWallpaper: (url) => {
        set((state) => ({
          customWallpapers: [...state.customWallpapers, url]
        }))
      },
      
      removeCustomWallpaper: (url) => {
        set((state) => ({
          customWallpapers: state.customWallpapers.filter(w => w !== url),
          // 如果删除的是当前壁纸，则重置为默认壁纸
          currentWallpaper: state.currentWallpaper === url 
            ? DEFAULT_WALLPAPERS[0] 
            : state.currentWallpaper
        }))
      },
      
      setOpacity: (opacity) => {
        set({ opacity })
      },
      
      setBrightness: (brightness) => {
        set({ brightness })
      },
      
      setContrast: (contrast) => {
        set({ contrast })
      },
      
      setEnabled: (enabled) => {
        set({ enabled })
      },
      
      getAllWallpapers: () => {
        return [...DEFAULT_WALLPAPERS, ...get().customWallpapers]
      },
      
      resetSettings: () => {
        set({
          opacity: 0.2,
          brightness: 1.0,
          contrast: 1.0
        })
      }
    }),
    {
      name: 'wallpaper-storage',
    }
  )
) 