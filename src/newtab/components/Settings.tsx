import React, { useState, useEffect } from 'react'
import { useTokenStore } from '../../store/token'
import { useNavigationStore } from '../../store/navigation'
import { Token } from '../../types/token'
import { Navigation } from '../../types/navigation'
import { SettingsIcon, DeleteIcon } from '../../assets/icons'
import TokenSettings from './settings/TokenSettings'
import NavigationSettings from './settings/NavigationSettings'
import { eventBus } from '../../utils/eventBus'

const Settings: React.FC = () => {
  const { tokens, addToken, removeToken, updateToken } = useTokenStore()
  const { navigations, addNavigation, removeNavigation, updateNavigation } = useNavigationStore()

  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('tokens')
  const [editingItem, setEditingItem] = useState<{ id: string, type: 'token' | 'navigation' } | null>(null)

  // Token 表单状态
  const [newToken, setNewToken] = useState<Partial<Token>>({
    name: '',
    symbol: '',
    icon: '',
  })

  // Navigation 表单状态
  const [newNavigation, setNewNavigation] = useState<Partial<Navigation>>({
    name: '',
    url: '',
    icon: '',
  })

  // 当名称或符号变化时，自动生成图标URL
  useEffect(() => {
    if (newToken.name && newToken.symbol) {
      // 获取格式化的符号（小写）
      const formattedSymbol = newToken.symbol.toLowerCase()
      // 构建图标URL
      const iconUrl = `https://cryptologos.cc/logos/${newToken.name.toLowerCase()}-${formattedSymbol}-logo.png`
      setNewToken(prev => ({ ...prev, icon: iconUrl }))
    }
  }, [newToken.name, newToken.symbol])

  useEffect(() => {
    const handleOpenSettings = (data: { 
      tab: 'tokens' | 'navigations',
      itemId: string 
    }) => {
      setIsOpen(true)
      setActiveTab(data.tab)
      setEditingItem({ 
        id: data.itemId, 
        type: data.tab === 'tokens' ? 'token' : 'navigation' 
      })
    }

    eventBus.on('openSettings', handleOpenSettings)
    return () => eventBus.off('openSettings', handleOpenSettings)
  }, [])

  // 当对话框关闭时重置编辑状态
  useEffect(() => {
    if (!isOpen) {
      setEditingItem(null)
    }
  }, [isOpen])

  const handleAddToken = () => {
    if (newToken.name && newToken.symbol) {
      addToken({
        id: Date.now().toString(),
        name: newToken.name,
        symbol: newToken.symbol,
        icon: newToken.icon || '',
      })
      setNewToken({ name: '', symbol: '', icon: '' })
    }
  }

  const handleAddNavigation = () => {
    if (newNavigation.name && newNavigation.url) {
      addNavigation({
        id: Date.now().toString(),
        name: newNavigation.name,
        url: newNavigation.url,
        icon: newNavigation.icon || '',
        clickCount: 0,
        createdAt: Date.now(),
      })
      setNewNavigation({ name: '', url: '', icon: '' })
    }
  }

  // 尝试从URL获取favicon
  const handleNavigationNameOrUrlChange = (field: string, value: string) => {
    const updatedNavigation = { ...newNavigation, [field]: value }
    
    // 如果URL已填写且图标为空，尝试获取favicon
    if (field === 'url' && value && !newNavigation.icon) {
      try {
        const url = new URL(value)
        const faviconUrl = `${url.protocol}//${url.hostname}/favicon.ico`
        updatedNavigation.icon = faviconUrl
      } catch (e) {
        // URL格式不正确，忽略
      }
    }
    
    setNewNavigation(updatedNavigation)
  }

  return (
    <>
      <button
        className="btn btn-circle btn-sm absolute bottom-4 right-4 z-10"
        onClick={() => setIsOpen(true)}
        title="设置"
      >
        <SettingsIcon />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">设置</h2>
              <button className="btn btn-sm btn-circle" onClick={() => setIsOpen(false)}>
                ✕
              </button>
            </div>

            <div className="tabs tabs-boxed mb-4">
              <a
                className={`tab ${activeTab === 'tokens' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('tokens')}
              >
                代币
              </a>
              <a
                className={`tab ${activeTab === 'navigations' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('navigations')}
              >
                导航
              </a>
            </div>

            {activeTab === 'tokens' && (
              <TokenSettings editingTokenId={editingItem?.type === 'token' ? editingItem.id : undefined} />
            )}
            {activeTab === 'navigations' && (
              <NavigationSettings editingNavId={editingItem?.type === 'navigation' ? editingItem.id : undefined} />
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default Settings
