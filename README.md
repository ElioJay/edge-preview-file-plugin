# Preview Any File

在 Edge 中直接预览网页上的 TOML、YAML、JSON、TXT、LOG、.env、Markdown 文件：Markdown 渲染成排版好的文档，其余类型显示带行号的源码（除 TXT 外都有语法高亮）。UTF-8 和 GBK 编码都能正确显示。纯前端 MV3 扩展，无构建步骤。

## 功能

- **就地美化**：网页以 `text/plain` 返回 `.toml` / `.yaml` / `.yml` / `.json` / `.jsonc` / `.json5` / `.txt` / `.log` / `.md` / `.markdown` 或 .env 类文件时，内容脚本在原页面替换为预览视图，地址栏 URL 保持不变。YAML 以 `text/yaml`、`text/x-yaml` 返回，LOG 以 `text/x-log`、`text/log` 返回，或 Markdown 以 `text/markdown`、`text/x-markdown` 返回时，Edge 同样按纯文本显示，也会被就地美化。
- **下载拦截**：网页以 `application/toml`、`application/yaml`、`application/x-yaml`、`application/octet-stream` 等会触发下载的类型返回上述文件时，扩展取消下载，在点击链接的那个页签里打开查看器，浏览器的后退键可以回到原页面，前进键再回到查看器。Ctrl / 中键点击这类本来就要新开页签的操作，仍在新页签打开。
- **查看器**：语法高亮、行号、复制、原始文本切换、下载原文件。TXT 只显示纯文本和行号，没有高亮和「原始文本」切换。
- **JSON**：`.json` 显示带行号的高亮源码，另有「格式化 / 原文」切换。压缩成一行的 JSON 默认就展开成两空格缩进的格式。格式化只调整缩进和换行，数字和字符串原样保留，不经过 `JSON.parse` 转换，超过 2^53 的大整数 ID 不会丢精度；复制按钮复制当前显示的内容。不是合法 JSON 时按原文显示，并提示 `JSON.parse` 给出的出错位置。`.jsonc`（允许注释，如 VS Code 配置、`tsconfig`）和 `.json5` 不是严格 JSON，只高亮不格式化。以 `application/json`、`text/json` 或 `+json` 类型返回的响应由 Edge 自带的 JSON 查看器显示，扩展不接管。
- **Markdown 预览**：用 marked 渲染（支持 GFM 的表格、任务列表、删除线、围栏代码块），默认显示排版后的文档，「源码」按钮切到带行号和高亮的源码，「预览」切回。渲染结果先经 DOMPurify 清洗，文档里的 `<script>`、事件属性（如 `onerror`）、`javascript:` 链接都会被去掉，不会在网站页面里执行。相对链接和图片按原文件地址补全，查看器里同样能显示。
- **编码识别**：所有类型都按同一规则解码，规则在 `src/decode.js`。先按 UTF-8 严格解码，字节合法就用 UTF-8，不合法就按 GBK（用兼容 GBK 的 GB18030 解码）。服务器声明 utf-8、iso-8859-1 或没声明时都走这条规则；明确声明了其他编码（如 Big5、Shift_JIS、gbk）时按声明解码。查看器读的是原始字节；就地美化页面由 Edge 先解码，只有结果可能有误（Edge 没按 UTF-8 解码，或解出了替换字符 U+FFFD）时，才重新请求一次原始字节按上面的规则解码。
- **LOG 高亮**：日志级别分色（ERROR 红、WARN 橙、INFO 蓝、DEBUG 灰、TRACE 灰色斜体），另外高亮时间戳、IP / UUID / 哈希、URL、字符串和 Java 异常堆栈。
- **.env 文件名**：`.env`、`*.env`（如 `app.env`），以及 `.env.local`、`.env.example`、`.env.production`、`.env.development.local` 等 `.env.*` 变体。`.env.*` 的最后一段如果是其他文件格式，就不算 .env：已支持的类型（如 `.env.yaml`、`.env.json`、`.env.txt`）按该类型显示；其余（如 `.env.xml`，以及 `.env.gpg`、`.env.zip` 这类加密或压缩文件）不接管，交给浏览器默认处理。排除名单见 `src/dotenv-names.js`。
- **.env 高亮**：注释、`export`、变量名、`=`、单 / 双 / 反引号字符串（含多行）、未加引号的值，以及双引号和未加引号值里的 `${VAR}` / `$VAR`。`#` 只有在行首或空白之后才算注释，所以 `COLOR=#fff`、`"a #b"` 里的 `#` 属于值。
- **TXT / LOG 大小上限**：`.txt`、`.log` 超过 50 MB 时不接管，详见下方「已知限制」。TOML / YAML / .env 没有这个上限。
- **多类型框架**：渲染器按扩展名注册，目前注册了 `toml`、`yaml`（`.yaml` / `.yml`）、`txt`、`log`、`dotenv`（`.env` / `*.env` / `.env.*`）、`markdown`（`.md` / `.markdown`）和 `json` / `jsonc` / `json5`，后续可加 INI 等。

## 安装（未打包）

1. 打开 `edge://extensions`
2. 打开「开发人员模式」
3. 点击「加载解压缩的扩展」，选择本目录
4. 不需要构建、不需要安装依赖

## 使用

打开任意网页上的 `.toml`、`.yaml`、`.yml`、`.json`、`.jsonc`、`.json5`、`.txt`、`.log`、`.md`、`.markdown` 或 .env 类文件链接：

- 服务器以 `text/plain`（YAML 还包括 `text/yaml`、`text/x-yaml`；LOG 还包括 `text/x-log`、`text/log`；Markdown 还包括 `text/markdown`、`text/x-markdown`）返回：页面会被就地美化。JSON 以 `application/json` 等类型返回时由 Edge 自带的 JSON 查看器显示。
- 服务器以 `application/toml`、`application/yaml`、`application/x-yaml` 或 `application/octet-stream` 返回：浏览器会短暂开始下载，扩展会取消下载，并在当前页签打开查看器，后退即可回到原页面。

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `downloads` | 取消或暂停 `.toml` / `.yaml` / `.yml` / `.json` / `.jsonc` / `.json5` / `.txt` / `.log` / `.md` / `.markdown` / .env 类文件下载；查看器里的「下载原文件」 |
| `webRequest` | 记下每个文件地址是从哪个页签发起的导航，下载出现时据此在同一页签打开查看器；只观察请求，不拦截、不修改 |
| `http://*/*`、`https://*/*` | 内容脚本匹配 `.toml` / `.yaml` / `.yml` / `.json` / `.jsonc` / `.json5` / `.txt` / `.log` / `.md` / `.markdown` / .env 类文件 URL；查看器重新 fetch 原文件（带 cookie）；对 `.txt` / `.log` 下载发 HEAD 请求查询大小；就地美化页面在编码可能有误时重新请求一次原文件 |

不需要文件系统权限。本地 `file://` 文件不在本扩展范围内——Edge 本身会以纯文本打开它们。

## 已知限制

- 显式「另存为」一个 `.toml` / `.yaml` / `.yml` / `.json` / `.jsonc` / `.json5` / `.txt` / `.log` / `.md` / `.markdown` / .env 类文件也会被接管；查看器里提供了「下载原文件」。
- 下载条目可能闪现一下，取消后会从下载列表移除。
- 以下情况对不上发起的页签，查看器仍新开页签：带 `download` 属性的链接（浏览器直接下载，没有页面导航）；Ctrl / 中键点击；在空白页签（如新标签页）里打开文件地址，这时空白页签会留在原地。
- 内容脚本只匹配全小写或全大写后缀（`.toml` / `.TOML`、`.yaml` / `.YAML`、`.yml` / `.YML`、`.txt` / `.TXT`、`.log` / `.LOG`、`.env` / `.ENV`、`.md` / `.MD`、`.markdown` / `.MARKDOWN`、`.json` / `.JSON`（含 `.jsonc`、`.json5`））；混合大小写（如 `.Yaml`）不会触发就地美化，但下载拦截仍会处理。
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
- 编码识别只覆盖 UTF-8 和 GBK。未声明编码的 Big5、Shift_JIS、Latin-1 等文件会被当成 GBK 显示乱码；带 BOM 的 UTF-16 文件也不支持。极少数 GBK 文本恰好也是合法的 UTF-8，会被当成 UTF-8。
- Markdown 预览不生成标题锚点，文内 `#标题` 链接不会跳转；代码块不做语法高亮；不支持数学公式、Mermaid 等扩展语法。
- Markdown 里的远程图片会直接从图片所在网站加载。
- JSON 没有树形折叠视图，需要折叠时可以让服务器以 `application/json` 返回，交给 Edge 自带的查看器。
- JSON 格式化在打开页面时同步完成，很大的 JSON 打开会慢一些；格式化后的文本比原文长，可能超过 1 MB 而关闭高亮，而「文件较大」的提示只按原文大小判断。
- 所有 `.json` 地址都会注入内容脚本，但以 `application/json` 返回时脚本检查完类型就退出，不改页面。

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
  decode.js            UTF-8 / GBK 解码规则（内容脚本、查看器共用）
  prism-config.js      在 Prism 之前加载，关掉它自动扫描页面高亮的行为
  renderers/toml.js    TOML 渲染器注册
  renderers/yaml.js    YAML 渲染器注册（.yaml / .yml）
  renderers/txt.js     TXT 渲染器注册（无高亮，50 MB 上限）
  renderers/log.js     LOG 渲染器注册（5 MB 以内高亮，50 MB 上限）
  renderers/env.js     .env 渲染器注册，内含自写的 dotenv 语法（Prism 1.29.0 没有）
  renderers/markdown.js Markdown 渲染器注册：marked 渲染 + DOMPurify 清洗
  renderers/json.js    JSON / JSONC / JSON5 渲染器注册，内含保留原值的 JSON 格式化
  app.js               共享 UI：高亮、行号、复制、原始文本切换、预览 / 源码切换、格式化切换
  content.js           内容脚本：就地美化浏览器的纯文本页面
vendor/
  prism.min.js         Prism 核心（1.29.0）
  prism-toml.min.js    Prism TOML 语法
  prism-yaml.min.js    Prism YAML 语法（1.29.0）
  prism-log.min.js     Prism log 语法（1.29.0）
  prism-markdown.min.js Prism markdown 语法（1.29.0）
  prism-json.min.js    Prism json 语法（1.29.0）
  prism-json5.min.js   Prism json5 语法（1.29.0，依赖 json）
  marked.umd.js        marked 18.1.3（Markdown 解析）
  purify.min.js        DOMPurify 3.4.17（HTML 清洗）
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
   - `render(text, url)`：返回一个元素作为默认显示的渲染视图，界面上会多出「源码 / 预览」切换，参照 `src/renderers/markdown.js`。渲染结果来自文件内容时必须先清洗再插入页面。
   - `format(text)`：返回格式化后的文本，界面上会多出「格式化 / 原文」切换；内容无法格式化时抛出 `Error`，它的 `message` 会作为提示显示。单行原文默认显示格式化结果。参照 `src/renderers/json.js`。
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
- 查看器在当前页签打开、页签数不变；后退回到原页面，前进重新显示查看器；Ctrl+点击仍新开页签且原页面不变；查看器里再点会下载的链接也在同一页签打开，可后退
- YAML：`text/plain`、`text/yaml`、`text/x-yaml`（含大写 `.YML`）就地美化，key / boolean / null / anchor 高亮正确
- YAML：`application/x-yaml` 下载被接管并在查看器里渲染
- TXT：就地美化无高亮；2 MB 文件不出现「关闭高亮」提示
- LOG：`text/plain`、`text/x-log` 就地高亮，ERROR / WARN / INFO 配色互不相同；2 MB 仍然高亮；6 MB 关闭高亮并提示
- ENV：`.env`、`app.env`、`.env.example`、`.env.development.local` 就地高亮；注释、变量引用、`export`、多行字符串的识别符合预期；`.env.yaml` 仍按 YAML 渲染；`.env.local` 下载被接管并在查看器高亮；`.env.json` 按 JSON 显示；`.env.gpg` 下载不被拦截
- MD：就地渲染标题、粗体、表格、任务列表、代码块；相对链接和图片按文件地址补全；`<script>`、`onerror`、`javascript:` 链接被清洗且没有执行；源码 / 预览切换；`text/markdown` + `.markdown` 就地渲染；下载被接管后查看器里的相对图片指向原文件目录
- JSON：单行压缩的默认格式化，大整数、转义和空对象原样保留，行号随之变化；`null` 与 `true` / `false` 同色；原文 / 格式化切换，格式化后仍可切原始文本；已换行的默认显示原文；不合法时提示出错位置且没有格式化按钮；`.jsonc`、`.json5` 只高亮不报错；`application/json` 不接管；下载被接管后查看器默认格式化
- 编码：GBK 文件声明 utf-8、未声明、声明 iso-8859-1 时都显示正确；UTF-8 文件未声明编码时显示正确；声明 big5 的 Big5 文件按声明显示；查看器正确显示 GBK 的 `.md` 和 `.txt`（分别走不限大小和限大小两条读取路径）
- TXT 和 LOG 各自：超过 50 MB 时保留浏览器原生显示；下载被接管并在查看器显示；超过 50 MB 且大小已知时正常下载完整文件；大小未知且超过 50 MB 时查看器提示文件过大
