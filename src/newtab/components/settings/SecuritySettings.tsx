import React, { useEffect, useState } from 'react'

const SECURITY_SETTINGS_KEY = 'security-settings'
const SB_ORIGIN = 'https://safebrowsing.googleapis.com/*'

interface SecuritySettingsState {
  safeBrowsingEnabled: boolean
  safeBrowsingApiKey: string
}

const SecuritySettings: React.FC = () => {
  const [enabled, setEnabled] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    chrome.storage.local.get(SECURITY_SETTINGS_KEY).then((data) => {
      const s = (data[SECURITY_SETTINGS_KEY] || {}) as SecuritySettingsState
      setEnabled(Boolean(s.safeBrowsingEnabled))
      setApiKey(s.safeBrowsingApiKey || '')
      setLoaded(true)
    })
  }, [])

  const handleSave = async () => {
    setError('')

    if (enabled) {
      // Safe Browsing 为可选权限：开启时必须先获得用户授权（用户点击即手势，直接申请）
      try {
        const granted = await chrome.permissions.request({ origins: [SB_ORIGIN] })
        if (!granted) {
          setError('未授予 Safe Browsing 访问权限，功能不会生效')
          return
        }
      } catch (e) {
        setError('权限申请失败，请重试')
        return
      }
    } else {
      // 关闭功能时释放权限
      try {
        await chrome.permissions.remove({ origins: [SB_ORIGIN] })
      } catch {
        // 忽略
      }
    }

    await chrome.storage.local.set({
      [SECURITY_SETTINGS_KEY]: {
        safeBrowsingEnabled: enabled,
        safeBrowsingApiKey: apiKey.trim(),
      },
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* 本地防护（自动生效） */}
      <div>
        <h3 className="font-semibold mb-2">本地防护（默认开启，无需配置）</h3>
        <ul className="text-sm opacity-80 space-y-1 list-disc list-inside">
          <li>导航白名单拦截：访问不在白名单中的网站时弹出拦截页</li>
          <li>钓鱼域名检测：识别与白名单域名相似的 typo 域名（如 gooogle.com、g00gle.com）</li>
          <li>页面链接扫描：自动扫描网页中的可疑外链并提示，点击可疑链接时二次确认</li>
        </ul>
        <p className="text-xs opacity-50 mt-2">
          以上检测全部在本地完成，不会向任何服务器发送您的浏览数据
        </p>
      </div>

      {/* 可选：Google Safe Browsing */}
      <div>
        <h3 className="font-semibold mb-2">Google Safe Browsing 实时检测（可选，默认关闭）</h3>

        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text">启用 Google Safe Browsing 威胁检测</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={enabled}
              disabled={!loaded}
              onChange={(e) => setEnabled(e.target.checked)}
            />
          </label>
        </div>

        <div className="form-control mb-3">
          <label className="label">
            <span className="label-text">API Key</span>
          </label>
          <input
            type="password"
            className="input input-bordered"
            placeholder="输入你的 Google Safe Browsing API Key"
            value={apiKey}
            disabled={!enabled || !loaded}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <label className="label">
            <span className="label-text-alt">
              获取方式：Google Cloud Console → Safety → Safe Browsing API → 创建凭据
            </span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!loaded}>
            保存
          </button>
          {saved && <span className="text-success text-sm">已保存</span>}
          {error && <span className="text-error text-sm">{error}</span>}
        </div>

        <div className="alert alert-warning mt-3 text-sm">
          <div>
            启用后，每次访问新域名时会将该域名发送至 Google Safe Browsing API 进行威胁检测
            （结果缓存 30 分钟）。首次开启时浏览器会请求该服务的访问权限；关闭后会释放该权限。
            这是可选功能，不启用也能获得上述全部本地防护。
          </div>
        </div>
      </div>
    </div>
  )
}

export default SecuritySettings
