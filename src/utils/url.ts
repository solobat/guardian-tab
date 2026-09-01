/**
 * URL 安全工具：导航链接协议校验 + 后台导航检查过滤
 */

/**
 * 判断 URL 是否可作为导航项保存。
 * 仅允许 http/https，且不允许包含用户名密码（user:pass@host 常用于钓鱼伪装）。
 */
export const isSafeNavUrl = (url: string): boolean => {
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    if (u.username || u.password) return false
    return true
  } catch {
    return false
  }
}

/**
 * 后台是否需要对某个导航 URL 进行安全检查。
 * 只检查 http/https 主框架导航，忽略扩展页、浏览器内部页、文件页。
 */
export const shouldCheckUrl = (url: string): boolean => {
  if (!url) return false
  if (url.startsWith('chrome-extension://')) return false
  if (url.startsWith('chrome://') || url.startsWith('chrome-')) return false
  if (url.startsWith('about:')) return false
  if (url.startsWith('edge://') || url.startsWith('opera://')) return false
  if (url.startsWith('brave://') || url.startsWith('vivaldi://')) return false
  if (url.startsWith('file://')) return false
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
