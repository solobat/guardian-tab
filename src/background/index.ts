import { getMainDomain, isTypoSimilar } from '../utils/domain'
import { shouldCheckUrl } from '../utils/url'

/**
 * 安全导航保护：
 * - onBeforeNavigate：导航发起时快速检查（网络请求发出前拦截）
 * - onCommitted：兜底检查最终 URL，堵住 HTTP 重定向绕过白名单的漏洞
 * - 可选 Google Safe Browsing：开启后对访问域名做云端威胁检测（默认关闭）
 * - 被拦截时跳转至拦截警告页（blocked.html），而非静默跳回新标签页
 */

interface BypassEntry {
  domain: string
  expireAt: number
}

interface SecuritySettings {
  safeBrowsingEnabled?: boolean
  safeBrowsingApiKey?: string
}

interface SbCacheEntry {
  flagged: boolean
  at: number
}

const BLOCKED_PAGE = chrome.runtime.getURL('blocked.html')
const BYPASS_KEY = 'nav-bypass'
const BYPASS_DURATION = 10 * 60 * 1000 // 用户选择"仍然访问"后的放行窗口
const HANDLED_DEBOUNCE = 5000 // 同一 tab 短时间内的防抖，避免双事件重复处理

const SECURITY_SETTINGS_KEY = 'security-settings'
const SB_CACHE_KEY = 'sb-cache'
const SB_CACHE_TTL = 30 * 60 * 1000 // 威胁检测结果缓存 30 分钟
const SB_API = 'https://safebrowsing.googleapis.com/v4/threatMatches:find'

// 缓存的导航数据
let cachedNavigations: any[] = []
let lastUpdateTime = 0

// tabId -> 最近一次处理时间（防抖）
const recentlyHandled = new Map<number, number>()

// 安全设置缓存
let securitySettings: SecuritySettings = {}

// Safe Browsing 进行中的查询（按主域去重）
const sbInflight = new Map<string, Promise<boolean>>()

// 预加载导航数据
const preloadNavigationData = async () => {
  try {
    const navigations = await getNavigationData()
    cachedNavigations = navigations
    lastUpdateTime = Date.now()
    console.log('导航数据已预加载:', navigations.length, '个项目')
  } catch (error) {
    console.error('预加载导航数据失败:', error)
  }
}

// 获取导航数据，优先使用缓存
const getNavigationData = async () => {
  if (cachedNavigations.length > 0 && Date.now() - lastUpdateTime < 5000) {
    return cachedNavigations
  }

  try {
    const data = await chrome.storage.local.get('navigation-storage')
    let navigations: any[] = []

    if (data['navigation-storage']) {
      try {
        const parsedData = JSON.parse(data['navigation-storage'])
        navigations = parsedData.state?.navigations || []
        cachedNavigations = navigations
        lastUpdateTime = Date.now()
      } catch (error) {
        console.error('解析导航数据失败:', error)
      }
    }

    return navigations
  } catch (error) {
    console.error('获取导航数据失败:', error)
    return cachedNavigations
  }
}

const loadSecuritySettings = async () => {
  try {
    const data = await chrome.storage.local.get(SECURITY_SETTINGS_KEY)
    securitySettings = (data[SECURITY_SETTINGS_KEY] || {}) as SecuritySettings
  } catch {
    securitySettings = {}
  }
}

/** 检查用户是否放行了该域名（chrome.storage.session，仅内存、SW 重启不丢失） */
const isBypassed = async (domain: string): Promise<boolean> => {
  try {
    const result = await chrome.storage.session.get(BYPASS_KEY)
    const entries: BypassEntry[] = Array.isArray(result[BYPASS_KEY]) ? result[BYPASS_KEY] : []
    const now = Date.now()
    const fresh = entries.filter((e) => e.expireAt > now)
    if (fresh.length !== entries.length) {
      await chrome.storage.session.set({ [BYPASS_KEY]: fresh })
    }
    return fresh.some((e) => e.domain === domain)
  } catch (error) {
    console.error('检查放行状态失败:', error)
    return false
  }
}

/**
 * Google Safe Browsing 威胁检测（仅启用时调用）。
 * - 按主域缓存 30 分钟，避免重复查询
 * - 同域并发查询去重
 * - 查询失败视为安全（fail-open），避免网络问题影响正常浏览
 */
const isThreat = async (url: string): Promise<boolean> => {
  if (!securitySettings.safeBrowsingEnabled || !securitySettings.safeBrowsingApiKey) return false

  let domain = ''
  try {
    domain = getMainDomain(new URL(url).hostname)
  } catch {
    return false
  }
  if (!domain) return false

  // 缓存命中
  try {
    const result = await chrome.storage.session.get(SB_CACHE_KEY)
    const cache = (result[SB_CACHE_KEY] || {}) as Record<string, SbCacheEntry>
    const entry = cache[domain]
    if (entry && Date.now() - entry.at < SB_CACHE_TTL) {
      return entry.flagged
    }
  } catch {
    // 缓存不可用时继续查询
  }

  // 并发去重
  const inflight = sbInflight.get(domain)
  if (inflight) return inflight

  const promise = (async () => {
    let flagged = false
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4000)
      const resp = await fetch(
        `${SB_API}?key=${encodeURIComponent(securitySettings.safeBrowsingApiKey || '')}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client: { clientId: 'guardian-tab', clientVersion: '1.0.0' },
            threatInfo: {
              threatTypes: [
                'MALWARE',
                'SOCIAL_ENGINEERING',
                'UNWANTED_SOFTWARE',
                'POTENTIALLY_HARMFUL_APPLICATION',
              ],
              platformTypes: ['ANY_PLATFORM'],
              threatEntryTypes: ['URL'],
              threatEntries: [{ url }],
            },
          }),
          signal: controller.signal,
        },
      )
      clearTimeout(timer)
      if (resp.ok) {
        const data = await resp.json()
        flagged = Array.isArray(data.matches) && data.matches.length > 0
        if (flagged) {
          console.log(`Safe Browsing 检测到威胁: ${url}`)
        }
      }
    } catch (error) {
      console.error('Safe Browsing 查询失败:', error)
    }

    // 写缓存
    try {
      const result = await chrome.storage.session.get(SB_CACHE_KEY)
      const cache = (result[SB_CACHE_KEY] || {}) as Record<string, SbCacheEntry>
      cache[domain] = { flagged, at: Date.now() }
      await chrome.storage.session.set({ [SB_CACHE_KEY]: cache })
    } catch {
      // 忽略缓存写入失败
    }
    return flagged
  })()

  sbInflight.set(domain, promise)
  try {
    return await promise
  } finally {
    sbInflight.delete(domain)
  }
}

/** 跳转到拦截警告页（带防抖，避免 onBeforeNavigate 与 onCommitted 双触发重复跳转） */
const redirectToBlocked = (tabId: number, url: string, reason: string, similarTo: string) => {
  const now = Date.now()
  if (now - (recentlyHandled.get(tabId) || 0) < HANDLED_DEBOUNCE) return
  recentlyHandled.set(tabId, now)

  const params = new URLSearchParams({ url, reason })
  if (similarTo) params.set('similarTo', similarTo)

  chrome.tabs.update(tabId, { url: `${BLOCKED_PAGE}?${params.toString()}` }).catch(() => {
    // tab 可能在检查期间被关闭，忽略
  })
}

/** 对一次导航进行安全检查，不通过则跳转到拦截警告页 */
const checkAndBlock = async (tabId: number, url: string, frameId: number) => {
  // 只检查主框架导航
  if (frameId !== 0) return
  if (!shouldCheckUrl(url)) return

  let targetDomain = ''
  try {
    targetDomain = getMainDomain(new URL(url).hostname)
  } catch {
    return
  }
  if (!targetDomain) return

  // 用户已放行（"仍然访问"）→ 不再拦截
  if (await isBypassed(targetDomain)) return

  // 可选：Safe Browsing 威胁检测（对白名单内域名同样生效）
  if (securitySettings.safeBrowsingEnabled && securitySettings.safeBrowsingApiKey) {
    if (await isThreat(url)) {
      console.log(`拦截导航到: ${url}（Safe Browsing 判定为威胁）`)
      redirectToBlocked(tabId, url, 'safebrowsing', '')
      return
    }
  }

  // 白名单检查
  const navigations = await getNavigationData()
  const allowedDomains = new Set<string>()
  for (const nav of navigations) {
    try {
      const domain = getMainDomain(new URL(nav.url).hostname)
      if (domain) allowedDomains.add(domain)
    } catch {
      // 忽略无效导航项
    }
  }
  if (allowedDomains.has(targetDomain)) return

  // 钓鱼 typo 域名检测：与白名单域名高度相似
  let similarTo = ''
  for (const domain of allowedDomains) {
    if (isTypoSimilar(targetDomain, domain)) {
      similarTo = domain
      break
    }
  }

  console.log(
    `拦截导航到: ${url}，主域名 ${targetDomain} 不在允许列表中${
      similarTo ? `，且与白名单域名 ${similarTo} 高度相似` : ''
    }`,
  )

  redirectToBlocked(tabId, url, 'allowlist', similarTo)
}

// 监听导航事件：发起时快速检查
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  checkAndBlock(details.tabId, details.url, details.frameId)
})

// 监听提交事件：兜底检查重定向后的最终 URL
chrome.webNavigation.onCommitted.addListener((details) => {
  checkAndBlock(details.tabId, details.url, details.frameId)
})

// 监听存储变化：导航数据或安全设置更新时刷新缓存
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes['navigation-storage']) {
      console.log('导航数据已更新，重新加载导航数据')
      preloadNavigationData()
    }
    if (changes[SECURITY_SETTINGS_KEY]) {
      loadSecuritySettings()
    }
  }
})

// 初始化
preloadNavigationData()
loadSecuritySettings()
