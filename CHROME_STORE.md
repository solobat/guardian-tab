# Chrome 商店提交说明

本文档包含 Guardian Tab 扩展提交至 Chrome 网上应用店时所需的隐私权相关说明。

---

## 一、单一用途（Single Purpose）

**Guardian Tab 的单一用途：**

> 提供自定义新标签页，整合加密货币行情、自定义导航和安全导航保护，帮助用户集中查看市场信息、快速访问常用网站，并限制访问未在白名单中的网站。

---

## 二、需请求权限的理由（Permission Justification）

| 权限 | 用途说明 |
|------|----------|
| **storage** | 在本地保存用户的自定义导航列表、代币配置、壁纸设置和主题偏好，以便在新标签页中恢复个人配置。 |
| **webNavigation** | 监听页面导航事件，判断用户访问的网址是否在用户设置的导航白名单中，以实现安全导航保护功能。 |
| **host_permissions: "\<all_urls\>"** | 1）向 Binance、Bybit 等交易所 API 发起请求以获取加密货币行情数据；2）在安全导航保护功能中解析用户访问的 URL，判断是否属于白名单域名。 |

---

## 三、隐私权政策链接

部署隐私权政策页面至 Vercel 后，将生成的 URL 填入 Chrome 商店的「隐私权政策」字段。

例如：`https://guardian-tab-privacy.vercel.app`
