import React, { useState, useEffect } from 'react'
import { SettingsIcon } from '../../assets/icons'
import TokenSettings from './settings/TokenSettings'
import NavigationSettings from './settings/NavigationSettings'
import SecuritySettings from './settings/SecuritySettings'

const Settings: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('tokens')

  // Esc 关闭弹窗
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

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
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-base-100 p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
              <a
                className={`tab ${activeTab === 'security' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                安全
              </a>
            </div>

            <p className="text-xs opacity-60 mb-4">
              提示：在首页点击「＋ 添加代币 / 添加导航」卡片可快速添加，悬停卡片可直接编辑或删除
            </p>

            {activeTab === 'tokens' && <TokenSettings />}
            {activeTab === 'navigations' && <NavigationSettings />}
            {activeTab === 'security' && <SecuritySettings />}
          </div>
        </div>
      )}
    </>
  )
}

export default Settings
