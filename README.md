# guardian-newtab

> 一个使用 Vite + React 和 Manifest v3 构建的 Chrome 扩展工具

## 功能特点

- 📈 加密货币市场数据监控
- 🔗 自定义网站导航（支持拖拽排序）
- 🖼️ 自定义壁纸和视觉效果
- 🔒 安全导航保护
- 🌓 明暗主题切换
- 📱 响应式设计，适配各种屏幕尺寸

## 安装步骤

1. 确保您的 `Node.js` 版本 >= **14**
2. 在 `src/manifest.ts` 中配置扩展名称和其他信息
3. 运行 `npm install` 安装依赖

## 开发模式

运行以下命令启动开发服务器：

```shell
$ cd guardian-newtab
$ npm run dev
```

### Chrome 扩展开发者模式

1. 打开 Chrome 浏览器，进入扩展管理页面 (chrome://extensions/)
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"，选择 `guardian-newtab/build` 文件夹

## 打包发布

开发完成后，运行以下命令打包扩展：

```shell
$ npm run zip
```

## 项目结构

```
src/
├── assets/         # 图标和静态资源
├── background/     # 后台脚本
├── content/        # 内容脚本
├── hooks/          # React 钩子
├── newtab/         # 新标签页组件
├── popup/          # 弹出窗口组件
├── options/        # 选项页面组件
├── store/          # 状态管理
├── types/          # TypeScript 类型定义
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

- 自动拦截非导航列表中的网站访问
- 防止意外访问恶意网站
- 可自定义允许的域名

---

由 [create-chrome-ext](https://github.com/guocaoyi/create-chrome-ext) 生成，由 [Claude 3.7 Sonnet](https://claude.ai/) 优化
