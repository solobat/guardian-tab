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
  // Bing壁纸相关
  useBingDaily: boolean              // 是否使用Bing每日壁纸
  bingWallpaper: string | null       // 当前Bing壁纸URL
  favoriteWallpapers: string[]       // 收藏的壁纸
  // 新增方法
  setUseBingDaily: (enabled: boolean) => void
  updateBingWallpaper: () => Promise<void>
  addToFavorites: (url: string) => void
  removeFromFavorites: (url: string) => void
  downloadWallpaper: (url: string) => void
  lastUpdateDate: string | null      // 添加最后更新日期字段
}

// Bing壁纸API
const BING_API = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1'

export const useWallpaperStore = create<WallpaperState>()(
  persist(
    (set, get) => ({
      currentWallpaper: DEFAULT_WALLPAPERS[0],
      customWallpapers: [],
      opacity: 0.2,
      brightness: 1.0,
      contrast: 1.0,
      enabled: true,
      
      useBingDaily: false,
      bingWallpaper: null,
      favoriteWallpapers: [],
      lastUpdateDate: null,
      
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
      
      setUseBingDaily: async (enabled) => {
        set({ useBingDaily: enabled })
        if (enabled) {
          await get().updateBingWallpaper()
        }
      },

      updateBingWallpaper: async () => {
        try {
          const today = new Date().toISOString().split('T')[0]
          // 如果今天已经更新过，则跳过
          if (get().lastUpdateDate === today) {
            return
          }

          const response = await fetch(BING_API)
          const data = await response.json()
          const bingUrl = `https://www.bing.com${data.images[0].url}`
          set({ 
            bingWallpaper: bingUrl,
            currentWallpaper: get().useBingDaily ? bingUrl : get().currentWallpaper,
            lastUpdateDate: today
          })
        } catch (error) {
          console.error('获取Bing壁纸失败:', error)
        }
      },

      addToFavorites: (url) => {
        set((state) => ({
          favoriteWallpapers: [...state.favoriteWallpapers, url]
        }))
      },

      removeFromFavorites: (url) => {
        set((state) => ({
          favoriteWallpapers: state.favoriteWallpapers.filter(w => w !== url)
        }))
      },

      downloadWallpaper: async (url) => {
        try {
          const response = await fetch(url)
          const blob = await response.blob()
          const downloadUrl = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = downloadUrl
          link.download = `wallpaper-${Date.now()}.jpg`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(downloadUrl)
        } catch (error) {
          console.error('下载壁纸失败:', error)
        }
      },

      getAllWallpapers: () => {
        const state = get()
        const wallpapers = new Set([
          ...DEFAULT_WALLPAPERS,
          ...state.customWallpapers,
          ...state.favoriteWallpapers
        ])
        return Array.from(wallpapers)
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

// 修改自动更新逻辑
if (typeof window !== 'undefined') {
  const store = useWallpaperStore.getState()
  
  // 页面加载时检查是否需要更新
  if (store.useBingDaily) {
    store.updateBingWallpaper()
  }
} 