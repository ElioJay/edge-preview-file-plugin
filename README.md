# TOML Preview

在 Edge 中直接高亮预览网页上的 TOML 文件。纯前端 MV3 扩展，无构建步骤。

## 功能

- **就地美化**：网页以 `text/plain` 返回 `.toml` 时，内容脚本在原页面替换为高亮视图，地址栏 URL 保持不变。
- **下载拦截**：网页以 `application/toml` / `application/octet-stream` 返回 `.toml` 时，扩展取消下载，并在新标签页用查看器渲染。
- **查看器**：语法高亮、行号、复制、原始文本切换、下载原文件。
- **多类型框架**：渲染器按扩展名注册，目前只注册了 `toml`，后续可加 YAML / JSON / INI。

## 安装（未打包）

1. 打开 `edge://extensions`
2. 打开「开发人员模式」
3. 点击「加载解压缩的扩展」，选择本目录
4. 不需要构建、不需要安装依赖

## 使用

打开任意网页上的 `.toml` 链接：

- 服务器以 `text/plain` 返回：页面会被就地美化。
- 服务器以 `application/toml` 或 `application/octet-stream` 返回：浏览器会短暂开始下载，扩展会取消并打开查看器标签页。

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `downloads` | 取消 `.toml` 下载；查看器里的「下载原文件」 |
| `http://*/*`、`https://*/*` | 内容脚本匹配 `.toml` URL；查看器重新 fetch 原文件（带 cookie） |

不需要文件系统权限。本地 `file://` 文件不在本扩展范围内——Edge 本身会以纯文本打开它们。

## 已知限制

- 显式「另存为」一个 `.toml` 也会被接管；查看器里提供了「下载原文件」。
- 下载条目可能闪现一下，取消后会从下载列表移除。
- 内容脚本只匹配 `.toml` / `.TOML` 后缀；混合大小写（如 `.Toml`）不会触发就地美化，但下载拦截仍会处理。
- 文件大于 1 MB 时关闭语法高亮，只显示原文。
- 服务器返回 HTML（例如登录页）时，查看器按原文显示并给出提示。

## 目录结构

```
manifest.json          MV3 清单
background.js          Service Worker：拦截 .toml 下载
viewer.html            下载被拦截后的查看器页面
viewer.js              查看器：fetch 原文件并渲染
viewer.css             查看器 + 内容脚本共用的样式
src/
  registry.js          渲染器注册表（按扩展名分发）
  renderers/toml.js    TOML 渲染器注册
  app.js               共享 UI：高亮、行号、复制、原始文本切换
  content.js           内容脚本：就地美化 text/plain 页面
vendor/
  prism.min.js         Prism 核心（1.29.0）
  prism-toml.min.js    Prism TOML 语法
tests/
  e2e.cjs              Playwright 端到端测试
```

## 添加一种新文件类型

以 YAML 为例：

1. 把 Prism 语言文件放到 `vendor/`（如 `prism-yaml.min.js`），在 `viewer.html` 和 `manifest.json` 的 `content_scripts.js` 中按顺序引入。
2. 新建 `src/renderers/yaml.js`，注册：

   ```js
   window.TPV.registry.register({
     id: 'yaml',
     label: 'YAML',
     language: 'yaml',
     extensions: ['yaml', 'yml'],
   });
   ```

3. 把该脚本加入 `viewer.html` 和 `manifest.json` 的 `content_scripts.js`。
4. 把 `*://*/*.yaml`、`*://*/*.yml` 等加入 `content_scripts.matches`。
5. 需要专属配色时在 `viewer.css` 里追加 `.token.*` 规则。

## 测试

端到端测试需要本机 Edge 和 `playwright-core`：

```powershell
npm install playwright-core
node tests/e2e.cjs
```

测试会启动本地 HTTP 服务，用 Playwright 加载未打包扩展，验证：

- `text/plain` 页面就地美化、URL 不变、token 与行号存在
- 带 query string 的 URL 也能匹配
- `application/toml` 下载被接管并在查看器里渲染
