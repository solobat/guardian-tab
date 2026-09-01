import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getMainDomain } from '../utils/domain'
import { getFaviconUrl } from '../utils/favicon'
import './index.css'

const BYPASS_KEY = 'nav-bypass'
const BYPASS_DURATION = 10 * 60 * 1000

interface Params {
  url: string
  similarTo: string
  reason: 'allowlist' | 'safebrowsing'
}

const getParams = (): Params => {
  const params = new URLSearchParams(window.location.search)
  return {
    url: params.get('url') || '',
    similarTo: params.get('similarTo') || '',
    reason: params.get('reason') === 'safebrowsing' ? 'safebrowsing' : 'allowlist',
  }
}

/** 将目标 URL 的主域名加入导航白名单 */
const addToAllowlist = async (targetUrl: string): Promise<boolean> => {
  try {
    const hostname = new URL(targetUrl).hostname
    const targetDomain = getMainDomain(hostname)
    if (!targetDomain) return false

    const data = await chrome.storage.local.get('navigation-storage')
    const navigations: any[] = data['navigation-storage']?.state?.navigations || []

    // 已存在同主域导航则不重复添加
    const exists = navigations.some((nav: any) => {
      try {
        return getMainDomain(new URL(nav.url).hostname) === targetDomain
      } catch {
        return false
      }
    })
    if (!exists) {
      const maxOrder = navigations.length
        ? Math.max(...navigations.map((nav: any) => nav.orderIndex ?? 0))
        : -1
      navigations.push({
        id: Date.now().toString(),
        name: hostname,
        url: targetUrl,
        icon: getFaviconUrl(targetUrl),
        clickCount: 0,
        createdAt: Date.now(),
        orderIndex: maxOrder + 1,
      })
      await chrome.storage.local.set({ 'navigation-storage': { state: { navigations } } })
    }
    return true
  } catch (error) {
    console.error('加入白名单失败:', error)
    return false
  }
}

/** 放行目标域名一段时间，避免后台再次拦截 */
const addBypass = async (targetUrl: string) => {
  const domain = getMainDomain(new URL(targetUrl).hostname)
  if (!domain) return
  const result = await chrome.storage.session.get(BYPASS_KEY)
  const entries: { domain: string; expireAt: number }[] = Array.isArray(result[BYPASS_KEY])
    ? result[BYPASS_KEY]
    : []
  entries.push({ domain, expireAt: Date.now() + BYPASS_DURATION })
  await chrome.storage.session.set({ [BYPASS_KEY]: entries })
}

/** 将当前 tab 导航到目标 URL */
const navigateTo = async (targetUrl: string) => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id != null) {
      await chrome.tabs.update(tab.id, { url: targetUrl })
      return
    }
  } catch (error) {
    console.error('导航失败:', error)
  }
  window.location.href = targetUrl
}

const BlockedPage: React.FC = () => {
  const [params] = useState<Params>(getParams)
  const [hostname, setHostname] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      setHostname(new URL(params.url).hostname)
    } catch {
      setHostname(params.url)
    }
  }, [params.url])

  const isSuspicious = Boolean(params.similarTo)
  const isSafebrowsing = params.reason === 'safebrowsing'
  const showDanger = isSuspicious || isSafebrowsing

  const goBack = async () => {
    if (window.history.length > 1) {
      window.history.back()
      return
    }
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id != null) await chrome.tabs.update(tab.id, { url: 'chrome://newtab/' })
    } catch {
      // 忽略
    }
  }

  const handleAllowlistAndVisit = async () => {
    setBusy(true)
    setError('')
    try {
      const ok = await addToAllowlist(params.url)
      if (!ok) {
        setError('加入白名单失败，请稍后在设置中手动添加')
        setBusy(false)
        return
      }
      await addBypass(params.url)
      await navigateTo(params.url)
    } catch {
      setError('操作失败，请稍后再试')
      setBusy(false)
    }
  }

  const handleVisitAnyway = async () => {
    setBusy(true)
    setError('')
    try {
      await addBypass(params.url)
      await navigateTo(params.url)
    } catch {
      setError('操作失败，请稍后再试')
      setBusy(false)
    }
  }

  return (
    <main className="blocked-page">
      <div className="blocked-card">
        <div
          className={`blocked-icon ${showDanger ? 'blocked-icon--danger' : 'blocked-icon--info'}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {showDanger ? (
              <>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </>
            ) : (
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            )}
          </svg>
        </div>

        <h1 className={`blocked-title ${showDanger ? 'blocked-title--danger' : ''}`}>
          {isSafebrowsing
            ? '访问被阻止：检测到安全威胁'
            : isSuspicious
              ? '警告：疑似钓鱼网站'
              : '访问已被 Guardian Tab 拦截'}
        </h1>

        <p className="blocked-desc">
          {isSafebrowsing ? (
            <>
              Google Safe Browsing 检测到域名 <strong>{hostname}</strong> 可能包含恶意软件、
              钓鱼内容或有害程序。继续访问可能导致账户信息泄露或设备受损。
            </>
          ) : isSuspicious ? (
            <>
              您正要访问的域名 <strong>{hostname}</strong> 与您安全白名单中的{' '}
              <strong>{params.similarTo}</strong> 高度相似，很可能是伪装成该网站的钓鱼站点。
              请仔细核对域名，谨慎操作。
            </>
          ) : (
            <>
              域名 <strong>{hostname}</strong> 不在您的安全导航白名单中。该网站未经您确认，
              已被安全导航保护拦截。
            </>
          )}
        </p>

        <code className="blocked-url">{params.url || '未知地址'}</code>

        {(isSuspicious || isSafebrowsing) && (
          <p className="blocked-warning">
            ⚠️ 恶意网站会伪装成知名网站或利用漏洞，骗取您的账号密码、钱包资产或植入病毒
          </p>
        )}

        <div className="blocked-actions">
          <button
            className={`blocked-btn ${isSafebrowsing ? 'blocked-btn--primary' : 'blocked-btn--ghost'}`}
            onClick={goBack}
            disabled={busy}
          >
            ← 返回上一页
          </button>
          {!isSafebrowsing && (
            <button
              className="blocked-btn blocked-btn--primary"
              onClick={handleAllowlistAndVisit}
              disabled={busy}
            >
              加入白名单并访问
            </button>
          )}
        </div>

        <button className="blocked-link" onClick={handleVisitAnyway} disabled={busy}>
          {isSafebrowsing
            ? '我了解风险，仍然访问（风险自负）'
            : isSuspicious
              ? '我了解风险，仍然访问'
              : '仍然访问（不推荐）'}
        </button>

        {error && <p className="blocked-error">{error}</p>}

        <p className="blocked-footer">Guardian Tab · 安全导航保护</p>
      </div>
    </main>
  )
}

const container = document.getElementById('app')
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <BlockedPage />
    </React.StrictMode>,
  )
}
