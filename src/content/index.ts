import { getMainDomain, isTypoSimilar } from '../utils/domain'

/**
 * 网页链接扫描器（本地检测，无网络请求）：
 * - 扫描页面中的外链，识别与白名单域名相似的钓鱼域名，或链接文字含敏感诱导词的可疑链接
 * - 底部浮条提示检测结果
 * - 点击可疑链接时弹出确认框拦截
 */

// ---- 白名单缓存 ----
let allowedDomains = new Set<string>()

const loadAllowlist = async () => {
  try {
    const data = await chrome.storage.local.get('navigation-storage')
    const navigations: any[] = data['navigation-storage']?.state?.navigations || []
    const domains = new Set<string>()
    for (const nav of navigations) {
      try {
        const domain = getMainDomain(new URL(nav.url).hostname)
        if (domain) domains.add(domain)
      } catch {
        // 忽略无效项
      }
    }
    allowedDomains = domains
  } catch {
    // 读取失败时保留旧缓存
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes['navigation-storage']) {
    loadAllowlist()
  }
})

// ---- 敏感诱导词（链接文字中出现即视为可疑）----
const SENSITIVE_WORDS = [
  '登录',
  '登陆',
  '登入',
  '密码',
  '账户',
  '账号',
  '钱包',
  '私钥',
  '助记词',
  '验证',
  '领取',
  '空投',
  '奖励',
  '转账',
  '收款',
  '付款',
  '提现',
  '充值',
  '授权',
  '绑定',
  '更新',
  '客服',
  '冻结',
  '异常',
  '官方',
  '活动',
  '抽奖',
  '中奖',
  '优惠',
  '限时',
  '恢复',
  '安全中心',
  '认证',
  '解冻',
  '赠送',
  'login',
  'signin',
  'sign in',
  'password',
  'verify',
  'wallet',
  'airdrop',
  'reward',
  'claim',
  'bonus',
  'recover',
  'authenticate',
]

const textContainsSensitiveWord = (text: string): boolean => {
  const lower = text.toLowerCase()
  return SENSITIVE_WORDS.some((word) => lower.includes(word.toLowerCase()))
}

// ---- 链接判定 ----
interface FlaggedLink {
  href: string
  domain: string
  reason: 'typo' | 'keyword' | 'both'
  text: string
}

const getLinkDomain = (href: string): string | null => {
  try {
    const u = new URL(href)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return getMainDomain(u.hostname)
  } catch {
    return null
  }
}

const isSuspicious = (
  link: HTMLAnchorElement,
  domain: string,
  href: string,
): FlaggedLink | null => {
  // 本站或白名单内的域名不检查
  if (domain === getMainDomain(window.location.hostname)) return null
  if (allowedDomains.has(domain)) return null

  let typo = false
  for (const allowed of allowedDomains) {
    if (isTypoSimilar(domain, allowed)) {
      typo = true
      break
    }
  }

  const text = (link.textContent || link.getAttribute('aria-label') || '').trim().slice(0, 80)
  const keyword = textContainsSensitiveWord(text)

  if (!typo && !keyword) return null

  return {
    href,
    domain,
    reason: typo && keyword ? 'both' : typo ? 'typo' : 'keyword',
    text: text || href,
  }
}

// ---- UI ----
const Z = '2147483647'

const createBar = (): HTMLDivElement => {
  const el = document.createElement('div')
  el.style.cssText = `position:fixed;left:16px;bottom:16px;z-index:${Z};max-width:420px;
    background:#1a2233;color:#e7edf7;border:1px solid #ff7474;border-radius:10px;
    box-shadow:0 8px 30px rgba(0,0,0,.45);font:13px/1.5 -apple-system,BlinkMacSystemFont,
    'PingFang SC','Microsoft YaHei',sans-serif;padding:10px 14px;display:flex;
    flex-direction:column;gap:8px;`
  return el
}

const barTitle = (count: number): string =>
  `⚠️ Guardian Tab：检测到 ${count} 个可疑链接（可能为钓鱼网站）`

let barEl: HTMLDivElement | null = null
let flaggedLinks: FlaggedLink[] = []
let listExpanded = false

const renderBar = () => {
  if (flaggedLinks.length === 0) {
    barEl?.remove()
    barEl = null
    return
  }
  if (!barEl) {
    barEl = createBar()
    document.documentElement.appendChild(barEl)
  }

  const row = document.createElement('div')
  row.style.cssText = 'display:flex;align-items:center;gap:8px;'

  const title = document.createElement('span')
  title.style.cssText = 'flex:1;font-weight:600;'
  title.textContent = barTitle(flaggedLinks.length)

  const toggleBtn = document.createElement('button')
  toggleBtn.textContent = listExpanded ? '收起' : '查看'
  toggleBtn.style.cssText = `background:transparent;border:1px solid #79a8ff;color:#79a8ff;
    border-radius:6px;padding:2px 10px;cursor:pointer;font-size:12px;`

  const closeBtn = document.createElement('button')
  closeBtn.textContent = '×'
  closeBtn.style.cssText = `background:transparent;border:none;color:#9fb0c8;
    cursor:pointer;font-size:16px;line-height:1;padding:0 4px;`

  row.append(title, toggleBtn, closeBtn)
  barEl.innerHTML = ''
  barEl.appendChild(row)

  if (listExpanded) {
    const list = document.createElement('div')
    list.style.cssText =
      'display:flex;flex-direction:column;gap:6px;max-height:220px;overflow:auto;'
    flaggedLinks.slice(0, 10).forEach((link) => {
      const item = document.createElement('div')
      item.style.cssText = `background:#151e2b;border-radius:6px;padding:6px 8px;font-size:12px;
        display:flex;flex-direction:column;gap:2px;`
      const domainLine = document.createElement('div')
      domainLine.textContent = link.domain
      domainLine.style.cssText = 'color:#ff7474;font-weight:600;word-break:break-all;'
      const textLine = document.createElement('div')
      textLine.textContent = link.text
      textLine.style.cssText = 'color:#9fb0c8;word-break:break-all;'
      item.append(domainLine, textLine)
      list.appendChild(item)
    })
    if (flaggedLinks.length > 10) {
      const more = document.createElement('div')
      more.textContent = `… 另有 ${flaggedLinks.length - 10} 个`
      more.style.cssText = 'color:#5d6f8a;font-size:12px;'
      list.appendChild(more)
    }
    barEl.appendChild(list)
  }

  toggleBtn.addEventListener('click', () => {
    listExpanded = !listExpanded
    renderBar()
  })
  closeBtn.addEventListener('click', () => {
    barEl?.remove()
    barEl = null
  })
}

// ---- 扫描 ----
let scanTimer: number | undefined

const scan = () => {
  if (!document.body) return
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
  const flagged: FlaggedLink[] = []
  const seen = new Set<string>()

  for (const link of anchors) {
    const href = link.href
    if (!href || seen.has(href)) continue
    seen.add(href)
    const domain = getLinkDomain(href)
    if (!domain) continue
    const result = isSuspicious(link, domain, href)
    if (result) flagged.push(result)
    if (flagged.length >= 50) break
  }

  flaggedLinks = flagged
  renderBar()
}

const scheduleScan = () => {
  if (scanTimer) window.clearTimeout(scanTimer)
  scanTimer = window.setTimeout(scan, 800)
}

// ---- 点击拦截 ----
const allowedOnce = new Map<string, number>() // href -> 过期时间

const showConfirmModal = (link: FlaggedLink, allow: () => void) => {
  const overlay = document.createElement('div')
  overlay.style.cssText = `position:fixed;inset:0;z-index:${Z};background:rgba(0,0,0,.55);
    display:flex;align-items:center;justify-content:center;`
  const modal = document.createElement('div')
  modal.style.cssText = `background:#111821;color:#e7edf7;border:1px solid #ff7474;
    border-radius:12px;max-width:420px;width:calc(100% - 48px);padding:20px;
    font:14px/1.6 -apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;
    box-shadow:0 20px 60px rgba(0,0,0,.5);`

  const title = document.createElement('div')
  title.textContent = '⚠️ 该链接可能为钓鱼链接'
  title.style.cssText = 'font-weight:700;font-size:15px;color:#ff7474;margin-bottom:10px;'

  const domainLine = document.createElement('div')
  domainLine.textContent = link.domain
  domainLine.style.cssText = `background:#151e2b;border-radius:6px;padding:8px 10px;
    font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;word-break:break-all;
    margin-bottom:10px;`

  const desc = document.createElement('div')
  desc.style.cssText = 'color:#9fb0c8;font-size:13px;margin-bottom:6px;'
  desc.textContent =
    link.reason === 'typo' || link.reason === 'both'
      ? '该链接的域名与您的白名单域名高度相似，可能是伪装成知名网站的钓鱼站点。'
      : '该链接的文字包含敏感诱导词（如登录、钱包、验证、领奖等），可能是钓鱼链接。'

  const urlLine = document.createElement('div')
  urlLine.textContent = link.text
  urlLine.style.cssText = 'color:#5d6f8a;font-size:12px;word-break:break-all;margin-bottom:16px;'

  const actions = document.createElement('div')
  actions.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;'

  const cancelBtn = document.createElement('button')
  cancelBtn.textContent = '取消'
  cancelBtn.style.cssText = `background:transparent;border:1px solid #263345;color:#e7edf7;
    border-radius:8px;padding:8px 16px;cursor:pointer;`

  const proceedBtn = document.createElement('button')
  proceedBtn.textContent = '仍然访问'
  proceedBtn.style.cssText = `background:#ff7474;color:#1a0a0a;border:none;border-radius:8px;
    padding:8px 16px;cursor:pointer;font-weight:600;`

  cancelBtn.addEventListener('click', () => overlay.remove())
  proceedBtn.addEventListener('click', () => {
    overlay.remove()
    allow()
  })
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove()
  })

  actions.append(cancelBtn, proceedBtn)
  modal.append(title, domainLine, desc, urlLine, actions)
  overlay.appendChild(modal)
  document.documentElement.appendChild(overlay)
}

const handleClick = (e: MouseEvent) => {
  const target = e.target as Element
  const link = target.closest?.('a[href]') as HTMLAnchorElement | null
  if (!link) return

  const href = link.href
  const domain = getLinkDomain(href)
  if (!domain) return

  // 快速路径：与白名单相同的域名直接放行
  if (allowedDomains.has(domain) || domain === getMainDomain(window.location.hostname)) return

  const flagged = isSuspicious(link, domain, href)
  if (!flagged) return

  const now = Date.now()
  if ((allowedOnce.get(href) || 0) > now) {
    // 用户已确认过该链接，60 秒内放行
    allowedOnce.delete(href)
    return
  }

  e.preventDefault()
  e.stopPropagation()

  showConfirmModal(flagged, () => {
    allowedOnce.set(href, now + 60 * 1000)
    if (e.metaKey || e.ctrlKey) {
      window.open(href, '_blank')
    } else {
      window.location.assign(href)
    }
  })
}

// ---- 初始化 ----
const init = async () => {
  await loadAllowlist()
  scan()

  if (document.body) {
    const observer = new MutationObserver(() => scheduleScan())
    observer.observe(document.body, { childList: true, subtree: true })
  }
  document.addEventListener('click', handleClick, true)
}

init()
