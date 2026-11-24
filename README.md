# Preview Any File

在 Edge 中直接预览网页上的 TOML、YAML、TXT、LOG、.env 文件（除 TXT 外都带语法高亮）。纯前端 MV3 扩展，无构建步骤。

## 功能

- **就地美化**：网页以 `text/plain` 返回 `.toml` / `.yaml` / `.yml` / `.txt` / `.log` 或 .env 类文件时，内容脚本在原页面替换为高亮视图，地址栏 URL 保持不变。YAML 以 `text/yaml`、`text/x-yaml` 返回，或 LOG 以 `text/x-log`、`text/log` 返回时，Edge 同样按纯文本显示，也会被就地美化。
- **下载拦截**：网页以 `application/toml`、`application/yaml`、`application/x-yaml`、`application/octet-stream` 等会触发下载的类型返回上述文件时，扩展取消下载，并在新标签页用查看器渲染。
- **查看器**：语法高亮、行号、复制、原始文本切换、下载原文件。TXT 只显示纯文本和行号，没有高亮和「原始文本」切换。
- **LOG 高亮**：日志级别分色（ERROR 红、WARN 橙、INFO 蓝、DEBUG 灰、TRACE 灰色斜体），另外高亮时间戳、IP / UUID / 哈希、URL、字符串和 Java 异常堆栈。
- **.env 文件名**：`.env`、`*.env`（如 `app.env`），以及 `.env.local`、`.env.example`、`.env.production`、`.env.development.local` 等 `.env.*` 变体。`.env.*` 的最后一段如果是其他文件格式，就不算 .env：已支持的类型（如 `.env.yaml`、`.env.txt`）按该类型显示；其余（如 `.env.json`、`.env.xml`，以及 `.env.gpg`、`.env.zip` 这类加密或压缩文件）不接管，交给浏览器默认处理。排除名单见 `src/dotenv-names.js`。
- **.env 高亮**：注释、`export`、变量名、`=`、单 / 双 / 反引号字符串（含多行）、未加引号的值，以及双引号和未加引号值里的 `${VAR}` / `$VAR`。`#` 只有在行首或空白之后才算注释，所以 `COLOR=#fff`、`"a #b"` 里的 `#` 属于值。
- **TXT / LOG 大小上限**：`.txt`、`.log` 超过 50 MB 时不接管，详见下方「已知限制」。TOML / YAML / .env 没有这个上限。
- **多类型框架**：渲染器按扩展名注册，目前注册了 `toml`、`yaml`（`.yaml` / `.yml`）、`txt`、`log` 和 `dotenv`（`.env` / `*.env` / `.env.*`），后续可加 JSON / INI。

## 安装（未打包）

1. 打开 `edge://extensions`
2. 打开「开发人员模式」
3. 点击「加载解压缩的扩展」，选择本目录
4. 不需要构建、不需要安装依赖

## 使用

打开任意网页上的 `.toml`、`.yaml`、`.yml`、`.txt`、`.log` 或 .env 类文件链接：

- 服务器以 `text/plain`（YAML 还包括 `text/yaml`、`text/x-yaml`；LOG 还包括 `text/x-log`、`text/log`）返回：页面会被就地美化。
- 服务器以 `application/toml`、`application/yaml`、`application/x-yaml` 或 `application/octet-stream` 返回：浏览器会短暂开始下载，扩展会取消并打开查看器标签页。

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `downloads` | 取消或暂停 `.toml` / `.yaml` / `.yml` / `.txt` / `.log` / .env 类文件下载；查看器里的「下载原文件」 |
| `http://*/*`、`https://*/*` | 内容脚本匹配 `.toml` / `.yaml` / `.yml` / `.txt` / `.log` / .env 类文件 URL；查看器重新 fetch 原文件（带 cookie）；对 `.txt` / `.log` 下载发 HEAD 请求查询大小 |

不需要文件系统权限。本地 `file://` 文件不在本扩展范围内——Edge 本身会以纯文本打开它们。

## 已知限制

- 显式「另存为」一个 `.toml` / `.yaml` / `.yml` / `.txt` / `.log` / .env 类文件也会被接管；查看器里提供了「下载原文件」。
- 下载条目可能闪现一下，取消后会从下载列表移除。
- 内容脚本只匹配全小写或全大写后缀（`.toml` / `.TOML`、`.yaml` / `.YAML`、`.yml` / `.YML`、`.txt` / `.TXT`、`.log` / `.LOG`、`.env` / `.ENV`）；混合大小写（如 `.Yaml`）不会触发就地美化，但下载拦截仍会处理。
- 文件大于 1 MB 时关闭语法高亮，只显示原文；LOG 的阈值是 5 MB。就地美化页面会提示「文件较大，已关闭语法高亮」，查看器不提示。
- LOG 高亮在主线程同步完成，接近 5 MB 的日志打开时页面会卡住约 5 秒；从「原始文本」切回「高亮」时会重新渲染，再卡几秒。
- 所有 `.txt` / `.log` 链接都会被接管，包括各站点的 `robots.txt` 这类文件。
- `.env.*` 的排除名单只列了常见格式。不在名单里的后缀（比如某种少见的二进制格式）仍会按 .env 接管。
- .env 的写法各实现并不统一（如 `#` 什么时候算注释），高亮按上面的通用规则，和具体加载库的解析结果可能有出入。
- `.txt` / `.log` 超过 50 MB 时不接管：
  - 就地美化：保留浏览器原生的纯文本显示。
  - 下载拦截：浏览器创建下载时还不知道文件大小，所以扩展先暂停下载，向服务器发一个 HEAD 请求读 `Content-Length`。超过 50 MB 就恢复原下载，照常下载；否则取消下载并打开查看器。HEAD 请求 5 秒内没有返回，或服务器没给大小，也会打开查看器。
  - 查看器：边读边计数，超过 50 MB 立即停止读取，提示「文件过大」并提供「下载原文件」。
- 服务器返回 HTML（例如登录页）时，查看器按原文显示并给出提示。

## 目录结构

```
manifest.json          MV3 清单
background.js          Service Worker：拦截 .toml / .yaml / .yml / .txt / .log / .env 类文件下载
viewer.html            下载被拦截后的查看器页面
viewer.js              查看器：fetch 原文件并渲染
viewer.css             查看器 + 内容脚本共用的样式
src/
  registry.js          渲染器注册表（按扩展名分发，可选按文件名规则兜底）
  dotenv-names.js      哪些 .env.* 文件名算 .env（内容脚本、查看器、background.js 共用）
  renderers/toml.js    TOML 渲染器注册
  renderers/yaml.js    YAML 渲染器注册（.yaml / .yml）
  renderers/txt.js     TXT 渲染器注册（无高亮，50 MB 上限）
  renderers/log.js     LOG 渲染器注册（5 MB 以内高亮，50 MB 上限）
  renderers/env.js     .env 渲染器注册，内含自写的 dotenv 语法（Prism 1.29.0 没有）
  app.js               共享 UI：高亮、行号、复制、原始文本切换
  content.js           内容脚本：就地美化浏览器的纯文本页面
vendor/
  prism.min.js         Prism 核心（1.29.0）
  prism-toml.min.js    Prism TOML 语法
  prism-yaml.min.js    Prism YAML 语法（1.29.0）
  prism-log.min.js     Prism log 语法（1.29.0）
tests/
  e2e.cjs              Playwright 端到端测试
```

## 添加一种新文件类型

以 `src/renderers/yaml.js` 为参照，假设新类型的 Prism 语言名为 `<lang>`、扩展名为 `<ext>`：

1. 把 Prism 语言文件放到 `vendor/`（如 `prism-<lang>.min.js`；Prism 没有现成语法时可以直接写在渲染器文件里，参照 `src/renderers/env.js`），在 `viewer.html` 和 `manifest.json` 的 `content_scripts.js` 中按顺序引入（放在 `prism.min.js` 之后、`src/registry.js` 之前）。
2. 新建 `src/renderers/<lang>.js`，注册：

   ```js
   window.TPV.registry.register({
     id: '<lang>',
     label: '<LABEL>',
     language: '<lang>',
     extensions: ['<ext>'],
   });
   ```

   可选字段：
   - `language: null`：不高亮，参照 `src/renderers/txt.js`。
   - `highlightLimit`：关闭高亮的字符数阈值，默认 1 MB，参照 `src/renderers/log.js`。
   - `filenames`：按文件名匹配的正则（对 URL 路径最后一段测试），参照 `src/renderers/env.js`。扩展名匹配优先，扩展名没有对应渲染器时才用它；`background.js` 的 `isHttpPreviewUrl` 也要用同一条规则。规则需要两边共用时，参照 `src/dotenv-names.js` 单独放一个文件，在 `background.js` 里用 `importScripts` 加载。
   - `maxBytes`：大小上限（字节数），超过就不接管。内容脚本和查看器会读取它；`background.js` 的 `SIZE_LIMITED_PATH` 和 `MAX_PREVIEW_BYTES` 需要一起改。

3. 把该脚本加入 `viewer.html` 和 `manifest.json` 的 `content_scripts.js`（放在 `src/app.js` 之前）。
4. 把 `http://*/*.<ext>*`、`https://*/*.<ext>*` 及大写形式加入 `content_scripts.matches`。
5. 把扩展名加入 `background.js` 的 `PREVIEW_PATH`，否则会触发下载的响应不会被接管。
6. 如果该类型有专属的 `text/*` MIME（Edge 会按纯文本显示），把它加入 `src/content.js` 的 `PLAIN_TEXT_TYPES`。
7. 需要专属配色时在 `viewer.css` 里追加 `.token.*` 规则。注意 Prism 的 `alias` 会让一个 token 带多个类名，同优先级规则按先后顺序覆盖。

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
- YAML：`text/plain`、`text/yaml`、`text/x-yaml`（含大写 `.YML`）就地美化，key / boolean / null / anchor 高亮正确
- YAML：`application/x-yaml` 下载被接管并在查看器里渲染
- TXT：就地美化无高亮；2 MB 文件不出现「关闭高亮」提示
- LOG：`text/plain`、`text/x-log` 就地高亮，ERROR / WARN / INFO 配色互不相同；2 MB 仍然高亮；6 MB 关闭高亮并提示
- ENV：`.env`、`app.env`、`.env.example`、`.env.development.local` 就地高亮；注释、变量引用、`export`、多行字符串的识别符合预期；`.env.yaml` 仍按 YAML 渲染；`.env.local` 下载被接管并在查看器高亮；`.env.json` 不被就地美化；`.env.gpg` 下载不被拦截
- TXT 和 LOG 各自：超过 50 MB 时保留浏览器原生显示；下载被接管并在查看器显示；超过 50 MB 且大小已知时正常下载完整文件；大小未知且超过 50 MB 时查看器提示文件过大
