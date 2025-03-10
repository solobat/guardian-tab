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

// 添加备份到 localStorage 的函数
const backupToLocalStorage = (navigations: Navigation[]) => {
  try {
    if (navigations && navigations.length > 0) {
      localStorage.setItem('navigation-backup', JSON.stringify(navigations))
      console.log('导航数据已备份到 localStorage')
    }
  } catch (error) {
    console.error('备份导航数据到 localStorage 失败:', error)
  }
}

// 从 localStorage 恢复备份的函数
const restoreFromLocalStorage = (): Navigation[] => {
  try {
    const backup = localStorage.getItem('navigation-backup')
    if (backup) {
      const navigations = JSON.parse(backup)
      if (Array.isArray(navigations) && navigations.length > 0) {
        console.log('从 localStorage 恢复了导航数据备份')
        return navigations
      }
    }
  } catch (error) {
    console.error('从 localStorage 恢复备份失败:', error)
  }
  return []
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      navigations: [],
      loading: false,
      initialized: false,
      editingNavigation: null,
      
      addNavigation: (navigation) => {
        set((state) => {
          const newNavigations = [...state.navigations, { ...navigation, id: Date.now().toString() }]
          // 添加导航后备份到 localStorage
          backupToLocalStorage(newNavigations)
          return { navigations: newNavigations }
        })
      },
      
      removeNavigation: (id) => {
        set((state) => {
          const newNavigations = state.navigations.filter((nav) => nav.id !== id)
          // 删除导航后备份到 localStorage
          backupToLocalStorage(newNavigations)
          return { navigations: newNavigations }
        })
      },
      
      updateNavigation: (id, updates) => {
        set((state) => {
          const newNavigations = state.navigations.map((nav) =>
            nav.id === id ? { ...nav, ...updates } : nav
          )
          // 更新导航后备份到 localStorage
          backupToLocalStorage(newNavigations)
          return {
            navigations: newNavigations,
            editingNavigation: null,
          }
        })
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
            // 备份到 localStorage
            backupToLocalStorage(storedNavigations)
          } else {
            // 如果 Chrome 存储中没有数据，尝试从 localStorage 恢复
            const backupNavigations = restoreFromLocalStorage()
            
            if (backupNavigations.length > 0) {
              // 如果 localStorage 中有备份，使用备份数据
              set({
                navigations: backupNavigations,
                initialized: true
              })
              // 同时将备份数据同步到 Chrome 存储
              chrome.storage.local.set({
                'navigation-storage': JSON.stringify({
                  state: { navigations: backupNavigations }
                })
              })
            } else if (navigations.length > 0) {
              // 如果当前状态中有数据，保留当前数据
              set({ initialized: true })
              // 备份当前数据到 localStorage
              backupToLocalStorage(navigations)
            }
          }
        } catch (error) {
          console.error('获取导航数据失败:', error)
          // 发生错误时，尝试从 localStorage 恢复
          const backupNavigations = restoreFromLocalStorage()
          
          if (backupNavigations.length > 0) {
            // 如果有备份，使用备份数据
            set({
              navigations: backupNavigations,
              initialized: true,
              loading: false
            })
            return
          }
          
          // 如果没有备份但当前状态中有数据，则保留当前数据
          if (navigations.length > 0) {
            set({ initialized: true })
          }
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
          
          // 重新排序后备份到 localStorage
          backupToLocalStorage(newNavigations)
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
          
          // 添加额外的安全检查，确保数据不会被清空
          if (!state.navigations || state.navigations.length === 0) {
            // 如果 rehydrate 后导航为空，尝试从存储中重新获取
            setTimeout(async () => {
              try {
                const storageData = await chrome.storage.local.get('navigation-storage')
                if (storageData['navigation-storage']) {
                  const parsedData = JSON.parse(storageData['navigation-storage'])
                  const storedNavigations = parsedData.state?.navigations || []
                  
                  if (storedNavigations.length > 0) {
                    // 使用 useNavigationStore.setState 而不是 set 函数
                    useNavigationStore.setState({
                      navigations: storedNavigations,
                      initialized: true
                    })
                    // 备份到 localStorage
                    backupToLocalStorage(storedNavigations)
                  } else {
                    // 如果 Chrome 存储中没有数据，尝试从 localStorage 恢复
                    const backupNavigations = restoreFromLocalStorage()
                    if (backupNavigations.length > 0) {
                      useNavigationStore.setState({
                        navigations: backupNavigations,
                        initialized: true
                      })
                      // 同时将备份数据同步到 Chrome 存储
                      chrome.storage.local.set({
                        'navigation-storage': JSON.stringify({
                          state: { navigations: backupNavigations }
                        })
                      })
                    }
                  }
                } else {
                  // 如果 Chrome 存储中没有数据，尝试从 localStorage 恢复
                  const backupNavigations = restoreFromLocalStorage()
                  if (backupNavigations.length > 0) {
                    useNavigationStore.setState({
                      navigations: backupNavigations,
                      initialized: true
                    })
                    // 同时将备份数据同步到 Chrome 存储
                    chrome.storage.local.set({
                      'navigation-storage': JSON.stringify({
                        state: { navigations: backupNavigations }
                      })
                    })
                  }
                }
              } catch (error) {
                console.error('恢复导航数据失败:', error)
                // 尝试从 localStorage 恢复
                const backupNavigations = restoreFromLocalStorage()
                if (backupNavigations.length > 0) {
                  useNavigationStore.setState({
                    navigations: backupNavigations,
                    initialized: true
                  })
                }
              }
            }, 100)
          } else {
            // 如果有数据，备份到 localStorage
            backupToLocalStorage(state.navigations)
          }
        }
      }
    }
  )
)

// 添加定期备份功能
if (typeof window !== 'undefined') {
  // 每5分钟备份一次数据到 localStorage
  setInterval(() => {
    const { navigations } = useNavigationStore.getState()
    if (navigations && navigations.length > 0) {
      backupToLocalStorage(navigations)
    }
  }, 5 * 60 * 1000)
  
  // 页面加载时检查是否需要从备份恢复
  window.addEventListener('load', () => {
    setTimeout(() => {
      const { navigations } = useNavigationStore.getState()
      if (!navigations || navigations.length === 0) {
        const backupNavigations = restoreFromLocalStorage()
        if (backupNavigations.length > 0) {
          useNavigationStore.setState({
            navigations: backupNavigations,
            initialized: true
          })
          // 同时将备份数据同步到 Chrome 存储
          if (chrome && chrome.storage) {
            chrome.storage.local.set({
              'navigation-storage': JSON.stringify({
                state: { navigations: backupNavigations }
              })
            })
          }
        }
      }
    }, 1000) // 延迟1秒，确保其他初始化已完成
  })
}

// 添加一个监听器，在存储变化时更新所有打开的 newtab 页面
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes['navigation-storage']) {
      try {
        const newValue = changes['navigation-storage'].newValue
        if (newValue) {
          const parsedData = JSON.parse(newValue)
          const storedNavigations = parsedData.state?.navigations || []
          
          // 只有当当前状态为空但存储中有数据时才更新
          const currentState = useNavigationStore.getState()
          if ((!currentState.navigations || currentState.navigations.length === 0) && 
              storedNavigations.length > 0) {
            useNavigationStore.setState({
              navigations: storedNavigations,
              initialized: true
            })
          }
        }
      } catch (error) {
        console.error('处理存储变化失败:', error)
      }
    }
  })
} 