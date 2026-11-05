# CHANGELOG

```txt
Summary
  1. document grouping follow 'SemVer2.0' protocol
  2. use 'PATCH' as a minimum granularity
  3. use concise descriptions
  4. type: feat \ fix \ update \ perf \ remove \ docs \ chore
  5. version timestamp follow the yyyy.MM.dd format
```

## 1.1.0 [2026.09.26]

安全能力升级 + 交互提速。

- feat: 首页网格内新增「＋ 添加」卡片，快捷添加代币与导航（自动聚焦、回车提交、图标自动生成）
- feat: 卡片悬停显示编辑/删除按钮，代币卡片支持双击编辑，编辑不再跳转设置页
- feat: 新增访问拦截页，展示拦截原因，支持「返回 / 加入白名单并访问 / 仍然访问」
- feat: 新增网页链接扫描，识别与白名单域名相似的钓鱼链接及含敏感诱导词的链接，点击时二次确认
- feat: 新增可选 Google Safe Browsing 实时威胁检测（默认关闭，启用时按需申请权限）
- feat: 设置页新增「安全」页签，集中展示本地防护能力与配置项
- fix: 修复 HTTP 重定向可绕过导航白名单的问题（新增 onCommitted 兜底检查最终 URL）
- fix: 修复导航 URL 未校验协议、javascript: 链接可在扩展页执行脚本的安全问题
- fix: 修复 co.uk / com.cn 等公共后缀域名主域提取错误导致的白名单误判
- fix: 修复代币卡片悬停按钮与币种名称重叠的问题
- update: 钓鱼域名检测支持同形字替换（g00gle）与关键词拼接（googlelogin）识别
- update: 扩展页 CSP 加固（frame-src / base-uri / form-action），远程资源请求不再携带 Referer
- perf: 移除失效的事件总线与旧编辑弹窗，设置页表单支持回车提交、重复项校验
- docs: 更新隐私权政策与 Chrome 商店权限说明

## 1.0.0 [2026.03.08]

- feat: 加密货币行情看板（Binance / Bybit）
- feat: 自定义导航，支持拖拽排序与未使用导航折叠
- feat: 壁纸设置与明暗主题切换
- feat: 安全导航保护（白名单域名拦截）

## 0.0.0 [2024.10.01]

- feat: initial
- feat: generator by ![create-chrome-ext](https://github.com/guocaoyi/create-chrome-ext)
