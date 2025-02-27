import { useNavigationStore } from '../store/navigation'

// 初始化导航存储
const initNavigationStore = async () => {
  // 预加载导航数据
  await preloadNavigationData()

  // 监听导航事件
  chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    // 忽略扩展内部页面和新标签页
    if (
      details.url.startsWith('chrome-extension') ||
      details.url.startsWith('chrome://extensions') ||
      details.url === 'chrome://newtab/' ||
      details.url === 'about:blank'
    ) {
      return
    }

    // 忽略 iframe 导航 (frameId > 0 表示是 iframe)
    if (details.frameId > 0) {
      console.log(`忽略 iframe 导航: ${details.url}`)
      return
    }

    // 获取最新的导航数据
    const navigations = await getNavigationData()

    // 检查域名是否在允许列表中
    const allowed = isAllowedDomain(details.url, navigations)

    if (!allowed) {
      console.log(`拦截导航到: ${details.url}，不在允许列表中`)
      // 如果不在允许列表中，重定向到新标签页
      chrome.tabs.update(details.tabId, { url: 'chrome://newtab/' })
    } else {
      console.log(`允许导航到: ${details.url}`)
    }
  })

  // 监听存储变化
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes['navigation-storage']) {
      console.log('导航数据已更新，重新加载导航数据')
      preloadNavigationData()
    }
  })
}

// 缓存的导航数据
let cachedNavigations: any[] = []
let lastUpdateTime = 0

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
  // 如果缓存时间不超过5秒，使用缓存
  if (cachedNavigations.length > 0 && Date.now() - lastUpdateTime < 5000) {
    return cachedNavigations
  }

  try {
    // 从存储中获取最新数据
    const data = await chrome.storage.local.get('navigation-storage')
    let navigations = []

    if (data['navigation-storage']) {
      try {
        const parsedData = JSON.parse(data['navigation-storage'])
        navigations = parsedData.state?.navigations || []

        // 更新缓存
        cachedNavigations = navigations
        lastUpdateTime = Date.now()
      } catch (error) {
        console.error('解析导航数据失败:', error)
      }
    }

    return navigations
  } catch (error) {
    console.error('获取导航数据失败:', error)
    // 如果出错，返回缓存的数据
    return cachedNavigations
  }
}

// 检查域名是否在允许列表中
const isAllowedDomain = (url: string, navigations: any[]) => {
  try {
    const urlObj = new URL(url)
    const result = navigations.some((nav) => {
      try {
        const navUrlObj = new URL(nav.url)
        return urlObj.hostname === navUrlObj.hostname
      } catch (e) {
        console.error('无效的导航 URL:', nav.url, e)
        return false
      }
    })

    return result
  } catch (error) {
    console.error('无效的 URL:', url, error)
    return false
  }
}

// 初始化
initNavigationStore()
