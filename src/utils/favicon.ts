/**
 * 从 URL 获取网站图标。
 * 使用 Google 公共 favicon 服务，比直接访问站点根路径的 /favicon.ico 更可靠（很多站点并不在根路径提供该文件）。
 */
export const getFaviconUrl = (url: string, size = 64): string => {
  try {
    const { hostname } = new URL(url)
    if (!hostname) return ''
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`
  } catch {
    return ''
  }
}
