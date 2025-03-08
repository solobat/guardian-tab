import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Navigation } from '../types/navigation'

// 创建一个适配器，使用 chrome.storage.local 代替 localStorage
const chromeStorageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const result = await chrome.storage.local.get(name)
      return result[name] || null
    } catch (error) {
      console.error('从存储中获取数据失败:', error)
      return null
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await chrome.storage.local.set({ [name]: value })
    } catch (error) {
      console.error('保存数据到存储失败:', error)
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await chrome.storage.local.remove(name)
    } catch (error) {
      console.error('从存储中删除数据失败:', error)
    }
  }
}

interface NavigationState {
  navigations: Navigation[]
  loading: boolean
  initialized: boolean
  editingNavigation: Navigation | null
  addNavigation: (navigation: Navigation) => void
  removeNavigation: (id: string) => void
  updateNavigation: (id: string, updates: Partial<Navigation>) => void
  fetchNavigations: () => Promise<void>
  isAllowedDomain: (url: string) => boolean
  reorderNavigations: (sourceIndex: number, destinationIndex: number) => void
  setEditingNavigation: (navigation: Navigation | null) => void
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      navigations: [],
      loading: false,
      initialized: false,
      editingNavigation: null,
      
      addNavigation: (navigation) => {
        set((state) => ({
          navigations: [...state.navigations, { ...navigation, id: Date.now().toString() }],
        }))
      },
      
      removeNavigation: (id) => {
        set((state) => ({
          navigations: state.navigations.filter((nav) => nav.id !== id),
        }))
      },
      
      updateNavigation: (id, updates) => {
        set((state) => ({
          navigations: state.navigations.map((nav) =>
            nav.id === id ? { ...nav, ...updates } : nav
          ),
          editingNavigation: null,
        }))
      },
      
      fetchNavigations: async () => {
        const { navigations, initialized } = get()
        
        // 如果已经初始化过且有导航数据，则不再重新加载
        if (initialized && navigations.length > 0) {
          return
        }
        
        set({ loading: true })
        
        try {
          // 尝试从存储中获取导航数据
          const storageData = await chrome.storage.local.get('navigation-storage')
          let storedNavigations: Navigation[] = []
          
          if (storageData['navigation-storage']) {
            try {
              const parsedData = JSON.parse(storageData['navigation-storage'])
              storedNavigations = parsedData.state?.navigations || []
            } catch (error) {
              console.error('解析导航数据失败:', error)
            }
          }
          
          // 如果存储中有数据，使用存储的数据
          if (storedNavigations.length > 0) {
            set({
              navigations: storedNavigations,
              initialized: true
            })
          }
        } catch (error) {
          console.error('获取导航数据失败:', error)
        } finally {
          set({ loading: false })
        }
      },
      
      isAllowedDomain: (url) => {
        try {
          const { navigations } = get()
          const urlObj = new URL(url)
          return navigations.some((nav) => {
            const navUrlObj = new URL(nav.url)
            return urlObj.hostname === navUrlObj.hostname
          })
        } catch (error) {
          console.error('Invalid URL:', error)
          return false
        }
      },
      
      // 重新排序导航
      reorderNavigations: (sourceIndex, destinationIndex) => {
        set((state) => {
          const newNavigations = [...state.navigations]
          const [removed] = newNavigations.splice(sourceIndex, 1)
          newNavigations.splice(destinationIndex, 0, removed)
          
          return { navigations: newNavigations }
        })
      },
      
      setEditingNavigation: (navigation) => {
        set({ editingNavigation: navigation })
      },
    }),
    {
      name: 'navigation-storage',
      storage: createJSONStorage(() => chromeStorageAdapter),
      partialize: (state) => ({ 
        navigations: state.navigations,
        editingNavigation: undefined
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.initialized = true
        }
      }
    }
  )
) 