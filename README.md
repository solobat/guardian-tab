# Guardian Tab

> 自定义新标签页 + 安全导航保护，使用 Vite + React 和 Manifest V3 构建的 Chrome 扩展

## 功能特点

- 📈 加密货币市场数据监控
- 🔗 自定义网站导航（支持拖拽排序）
- 🖼️ 自定义壁纸和视觉效果
- 🔒 安全导航保护（白名单拦截 + 拦截说明页）
- 🎣 钓鱼链接检测（相似域名 / 同形字 / 诱导词）
- 🔍 可选 Google Safe Browsing 实时威胁检测
- 🌓 明暗主题切换
- 📱 响应式设计，适配各种屏幕尺寸

## 安装步骤

1. 确保您的 `Node.js` 版本 >= **14**
2. 在 `src/manifest.ts` 中配置扩展名称和其他信息
3. 运行 `npm install` 安装依赖

## 开发模式

运行以下命令启动开发服务器：

```shell
$ cd guardian-tab
$ npm run dev
```

### Chrome 扩展开发者模式

1. 打开 Chrome 浏览器，进入扩展管理页面 (chrome://extensions/)
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"，选择 `guardian-tab/build` 文件夹

## 打包发布

更新 `package.json` 中的 `version`（`src/manifest.ts` 会自动读取），并在 `CHANGELOG.md` 中补充版本说明，然后运行：

```shell
$ npm run zip
```

产物为 `package/Guardian-Tab-<version>.zip`，可直接上传 Chrome 网上应用店。提审前请对照 `CHROME_STORE.md` 中的自查清单。

## 项目结构

```
src/
├── assets/         # 图标与静态资源
├── background/     # Service Worker：导航拦截、Safe Browsing 检测
├── blocked/        # 访问拦截警告页
├── content/        # 内容脚本：页面钓鱼链接扫描
├── const/          # 常量
├── hooks/          # React 钩子
├── lib/            # 通用库
├── newtab/         # 新标签页（市场 / 导航 / 壁纸 / 设置）
├── popup/          # 弹出窗口
├── server/         # 行情数据服务（Binance / Bybit）
├── store/          # 状态管理（zustand）
├── types/          # TypeScript 类型定义
├── utils/          # 工具函数（域名、URL、图标等）
└── manifest.ts     # 扩展清单配置
```

## 主要功能说明

### 加密货币监控

- 显示主流加密货币的实时价格和涨跌幅
- 支持添加自定义代币进行跟踪
- 自动刷新市场数据

### 自定义导航

- 添加、编辑和删除常用网站导航
- 支持拖拽排序
- 自动获取网站图标

### 壁纸设置

- 支持上传自定义壁纸
- 调整壁纸透明度、亮度和对比度
- 内置多种默认壁纸

### 安全导航保护

- 默认拒绝：访问不在导航白名单中的网站时，跳转到拦截说明页
- 拦截页提供「返回上一页 / 加入白名单并访问 / 仍然访问」三种选择，并说明拦截原因
- 兜底检查重定向后的最终 URL，防止通过 HTTP 重定向绕过白名单
- 钓鱼域名检测：识别编辑距离为 1、同形字替换（g00gle）与关键词拼接（googlelogin）的相似域名
- 页面链接扫描：识别网页中指向可疑域名的外链与含敏感诱导词的链接，点击时二次确认
- 公共后缀感知的主域名判断，避免 co.uk / com.cn 等域名误判
- 可选接入 Google Safe Browsing 实时威胁检测（默认关闭，按需授权）

---

由 [create-chrome-ext](https://github.com/guocaoyi/create-chrome-ext) 生成
