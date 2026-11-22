/**
 * `/webchat` 的 HTTP 面：
 *   - 静态资源：托管官方 chat-demo 的构建产物（只打了品牌与转发落点的补丁）；
 *   - 接口转发：浏览器不持有 API Key，由宿主用 DSH 的账户凭据代发；
 *   - 自检：把浏览器实际会走的几条路径跑一遍。
 *
 * 网页版有自己的一套存储（上游的 IndexedDB），与 DSH 会话互不相干——
 * 这是产品决定：两边的系统提示词和工具都不同，混合只会让双方都失真。
 *
 * 注意：DSH 的 `resource` 路由只接 GET/HEAD，聊天是 POST，所以用 `handler`。
 */
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { DEFAULT_BASE_URL, TOKEN_HEADER, apiRoot, isInside } from './protocol.js'
import { ackPending, listPending, readDshSession, stageImport } from './dsh-import.js'

/** 构建产物位置（包内自带，安装即可用）。 */
const DIST = fileURLToPath(new URL('../webview/dist/', import.meta.url))

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
}

/**
 * 需要整包读进内存的请求体上限（JSON 请求、TTS/ASR 转发）。
 * 附件上传不走这里：`proxyFiles` 用 `Readable.toWeb(req)` 流式转发，不受此限制，
 * 官方 Files API 根路径可接收 100MiB。不要把这里调大去「修」上传。
 */
const MAX_JSON_BODY = 64 * 1024 * 1024

/**
 * 页面启动前把"已经登录"的状态铺好：网页版要一个 API Key 才肯进主界面，
 * 这里塞一个占位值，真正的鉴权由宿主转发时完成。
 *
 * 主题在这一步一起铺：网页版默认是 `system`，跟随的是**操作系统**偏好，不是 DSH 的
 * 主题，两者经常不一致。宿主（同源，共享 localStorage）把 DSH 当前主题写进
 * `dsh-chat-web:shell-theme`，这里读出来再直接写根画布底色——这样从 HTML 解析到
 * React 挂载之间不会先闪一下白底。
 * 用户在网页版设置里手动选过主题后（值已是 light/dark）就不再覆盖。
 */
const BOOTSTRAP = `<script>(function(){try{var s=window.localStorage;
if(!s.getItem('chat-demo:api-key'))s.setItem('chat-demo:api-key','dsh');
if(!s.getItem('chat-demo:locale'))s.setItem('chat-demo:locale','zh-CN');
if(!s.getItem('chat-demo:thinking'))s.setItem('chat-demo:thinking','true');
if(!s.getItem('dsh-chat-web:shell-theme'))s.setItem('dsh-chat-web:shell-theme','system');
var d=s.getItem('dsh-chat-web:shell-theme');
var saved=s.getItem('chat-demo:theme-preference');
if(d&&d!=='system'&&(!saved||saved==='system'))s.setItem('chat-demo:theme-preference',d);
var t=(d&&d!=='system')?d:(saved||'light');
if(t!=='dark'&&t!=='light')t='light';
document.documentElement.style.colorScheme=t;
document.documentElement.style.backgroundColor=t==='dark'?'#151517':'#ffffff';
}catch(e){}})();</script>`

/** 统一 JSON 响应。 */
export function sendJson(res, value, status = 200) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

/** 读取请求体。 */
export async function readBody(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > MAX_JSON_BODY) throw new Error('请求体过大')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/** 读取并解析 JSON 请求体。 */
async function readJsonBody(req) {
  const raw = await readBody(req)
  if (raw.length === 0) return {}
  return JSON.parse(raw.toString('utf8'))
}
/** 读取入口页并注入引导脚本；每次现读，避免插件升级后仍引用旧的资源名。 */
function readIndex() {
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
  return html.replace(/<head>/iu, `<head>${BOOTSTRAP}`)
}

/**
 * 构建产物的文件名带内容哈希，可以长期缓存；入口页必须每次现取（要拿到最新资源名）。
 * 以前这里一律不带缓存头，等于每个面板打开都把首屏 chunk 重下一遍。
 */
const HASHED_ASSET = /\.[0-9a-f]{8,}\.(?:js|css|woff2?|ttf|png|jpe?g|webp|gif|svg)$/iu

async function sendFile(res, file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end('not found')
    return
  }
  const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
  const headers = { 'content-type': type, 'content-length': fs.statSync(file).size }
  if (HASHED_ASSET.test(file)) headers['cache-control'] = 'public, max-age=31536000, immutable'
  res.writeHead(200, headers)
  await pipeline(fs.createReadStream(file), res)
}

/** DSH 里模型设置默认使用的凭据名；安装可自定义 apiKeyEnv，优先按设置里的名字取。 */
const DEFAULT_API_KEY_REF = 'DEEPSEEK_API_KEY'

/**
 * 判断一个配置段是否属于 DeepSeek 的 API Key 提供方。
 *
 * `settings.describe()` 返回的是**整份 DSH 配置**，装了多个模型提供方时
 * （DeepSeek + OpenRouter 等）里面会有多份 `apiKeyEnv`。只按 key 名模糊匹配会取到
 * 别人家的 Key，发给 api.deepseek.com 就是一个无法解释的 401。
 */
function isDeepSeekProvider(descriptor) {
  const ns = typeof descriptor?.ns === 'string' ? descriptor.ns : ''
  // 只认 DSH 自己的 DeepSeek 提供方前缀，避免 ns 里偶然带 deepseek 字样的段被误选。
  if (/^(?:llm-)?deepseek(?:-|$)/iu.test(ns)) return true
  const baseURL = descriptor?.value?.baseURL
  return typeof baseURL === 'string' && /(?:^|\.)deepseek\.com/iu.test(baseURL)
}

/** 从 DSH 设置描述里找 DeepSeek API Key 提供方配置的凭据名。 */
function findApiKeyRef(ctx) {
  try {
    const descriptors = ctx.get('settings')?.describe?.() ?? []
    // 先只看 DeepSeek 自己的提供方；都没有时才退回全表扫描，保持旧宿主可用。
    for (const descriptor of descriptors) {
      if (!isDeepSeekProvider(descriptor)) continue
      const ref = descriptor?.value?.apiKeyEnv
      if (typeof ref === 'string' && ref.length > 0) return ref
    }
    for (const descriptor of descriptors) {
      const ref = descriptor?.value?.apiKeyEnv
      if (typeof ref === 'string' && ref.length > 0) return ref
    }
  } catch {
    // 设置服务不可读时退回约定名
  }
  return DEFAULT_API_KEY_REF
}

/** 解析一次上游请求的鉴权头：账户登录用 x-dsh-auth-token，API Key 路由用 x-api-key。 */
export async function resolveUpstreamAuth(ctx, baseURL) {
  const token = await ctx.get('deepseekAccount')?.resolveToken(baseURL)
  if (token !== undefined) return { source: 'account', headers: { [TOKEN_HEADER]: token } }
  const ref = findApiKeyRef(ctx)
  let key
  try {
    const hit = await ctx.get('credentials')?.resolve(ref)
    key = hit?.value
  } catch {
    key = undefined
  }
  if (key === undefined || key.length === 0) {
    const ambient = process.env[ref]
    if (typeof ambient === 'string' && ambient.length > 0) key = ambient
  }
  if (key === undefined || key.length === 0) return undefined
  return { source: 'api-key', headers: { 'x-api-key': key } }
}

/** 上游请求原样转发，鉴权换成 DSH 的账户凭据或 API Key；SSE 直接透传。 */
async function proxyMessages(ctx, config, req, res) {
  const baseURL = config.baseURL || process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL
  const auth = await resolveUpstreamAuth(ctx, baseURL)
  if (auth === undefined) {
    sendJson(res, { error: { message: 'DSH 里没有可用的 DeepSeek 凭据：请登录 DeepSeek 账户，或在模型设置里配置 DeepSeek API Key' } }, 401)
    return
  }
  const body = await readBody(req)
  // 带附件的请求要原样带上浏览器发的 anthropic-beta（files-api-…），
  // 少了它上游会直接 400：Missing or invalid anthropic-beta header。
  const beta = req.headers['anthropic-beta']
  const upstream = await fetch(`${apiRoot(baseURL)}/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
      'anthropic-version': '2023-06-01',
      ...(typeof beta === 'string' && beta.length > 0 ? { 'anthropic-beta': beta } : {}),
      ...auth.headers,
    },
    body,
  })
  if (!upstream.ok || upstream.body === null) {
    const text = await upstream.text().catch(() => '')
    res.writeHead(upstream.status, { 'content-type': 'application/json; charset=utf-8' })
    res.end(text || JSON.stringify({ error: { message: '上游请求失败' } }))
    return
  }
  res.writeHead(200, {
    'content-type': upstream.headers.get('content-type') ?? 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  })
  await pipeline(Readable.fromWeb(upstream.body), res)
}

/** 附件上传转发：multipart 原样送到官方 Files API。 */
async function proxyFiles(ctx, config, req, res, pathname) {
  const baseURL = config.baseURL || process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL
  const auth = await resolveUpstreamAuth(ctx, baseURL)
  if (auth === undefined) {
    sendJson(res, { error: { message: 'DSH 里没有可用的 DeepSeek 凭据：请登录 DeepSeek 账户，或在模型设置里配置 DeepSeek API Key' } }, 401)
    return
  }
  const suffix = pathname.slice('/webchat/anthropic/v1'.length)
  // Anthropic 兼容的 /anthropic/v1/files 网关对 64MiB 以上请求返回 413；
  // 官方 Files API 根路径能接收 100MiB，因此只在已知官方端点改走根 /files。
  // 自定义兼容网关可能只实现 /anthropic/v1/files，必须保留原路径。
  let officialRoot
  try {
    const parsed = new URL(baseURL)
    if (parsed.hostname === 'api.deepseek.com') {
      officialRoot = parsed.origin
    }
  } catch {
    // 非 URL 配置按自定义网关处理。
  }
  const useRootFiles = officialRoot !== undefined && suffix.startsWith('/files')
  const target = useRootFiles ? `${officialRoot}${suffix}` : `${apiRoot(baseURL)}${suffix}`
  // 优先沿用浏览器发来的 beta 版本，没带时才用已知可用的那个。
  const clientBeta = req.headers['anthropic-beta']
  const headers = {
    'anthropic-version': '2023-06-01',
    'anthropic-beta': typeof clientBeta === 'string' && clientBeta.length > 0 ? clientBeta : 'files-api-2025-04-14',
    ...auth.headers,
  }
  if (useRootFiles && auth.source === 'api-key') {
    headers.authorization = `Bearer ${auth.headers['x-api-key']}`
  }
  const init = { method: req.method, headers }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const contentType = req.headers['content-type']
    if (typeof contentType === 'string') headers['content-type'] = contentType
    const contentLength = req.headers['content-length']
    if (typeof contentLength === 'string') headers['content-length'] = contentLength
    // 官方 Files API 根路径支持 100MiB；流式转发，不把整个 multipart 读进内存。
    init.body = Readable.toWeb(req)
    init.duplex = 'half'
  }
  const upstream = await fetch(target, init)
  const text = await upstream.text()
  res.writeHead(upstream.status, {
    'content-type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
  })
  res.end(text)
}

/** 语音接口转发：ASR 收 multipart、TTS 回 PCM 流，浏览器不持有凭据。 */
async function proxyTools(ctx, config, req, res, pathname) {
  const baseURL = config.baseURL || process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL
  const auth = await resolveUpstreamAuth(ctx, baseURL)
  if (auth === undefined) {
    sendJson(res, { error: { message: 'DSH 里没有可用的 DeepSeek 凭据：请登录 DeepSeek 账户，或在模型设置里配置 DeepSeek API Key' } }, 401)
    return
  }
  const root = baseURL.replace(/\/+$/u, '').replace(/\/anthropic$/u, '')
  const target = `${root}${pathname.slice('/webchat'.length)}`
  const controller = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) controller.abort()
  })
  const headers = {
    'anthropic-version': '2023-06-01',
    ...auth.headers,
    ...(req.headers.authorization === undefined ? {} : { authorization: req.headers.authorization }),
  }
  const contentType = req.headers['content-type']
  if (typeof contentType === 'string') headers['content-type'] = contentType
  if (typeof req.headers.accept === 'string') headers.accept = req.headers.accept
  const init = { method: req.method, headers, signal: controller.signal }
  if (req.method !== 'GET' && req.method !== 'HEAD') init.body = await readBody(req)
  const upstream = await fetch(target, init)
  res.writeHead(upstream.status, {
    'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
    'cache-control': 'no-store',
  })
  if (upstream.body === null) {
    res.end()
    return
  }
  await pipeline(Readable.fromWeb(upstream.body), res)
}

/** 自检：入口页、静态资源、一次真实生成。 */
async function selfTest(ctx, config) {
  const checks = []
  const add = (name, ok, detail) => checks.push({ name, ok, detail })
  try {
    add('index', readIndex().includes('chat-demo:api-key'), `${readIndex().length} bytes`)
  } catch (error) {
    add('index', false, String(error?.message ?? error))
  }
  const main = (() => {
    try {
      return /src="(static\/js\/[^"]+\.js)"/u.exec(readIndex())?.[1]
    } catch {
      return undefined
    }
  })()
  add('static', main !== undefined && fs.existsSync(path.join(DIST, main)), main ?? 'not found')
  try {
    const baseURL = config.baseURL || process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL
    const auth = await resolveUpstreamAuth(ctx, baseURL)
    if (auth === undefined) throw new Error('没有可用的 DeepSeek 凭据：账户未登录且未配置 API Key')
    const response = await fetch(`${apiRoot(baseURL)}/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
        'anthropic-version': '2023-06-01',
        ...auth.headers,
      },
      body: JSON.stringify({
        model: auth.source === 'api-key' ? 'deepseek-chat' : 'deepseek-flash',
        messages: [{ role: 'user', content: '只回复两个字：收到' }],
        thinking: { type: 'disabled' },
        stream: true,
      }),
      signal: AbortSignal.timeout(60_000),
    })
    const text = await response.text()
    add('messages', response.ok && text.includes('message_stop'), `${response.status} · ${text.length} bytes`)
  } catch (error) {
    add('messages', false, String(error?.message ?? error))
  }
  return { ok: checks.every(check => check.ok), checks }
}

/**
 * 插件路由不在 DSH 的 /api 信任栅栏内，必须自己调用 Connection 的
 * Host/Origin 校验和浏览器认证；否则任何网页都能借已登录的 DSH 调用转发接口。
 * 桌面 App 自身窗口（dsh-app:）不走浏览器 Cookie，直接放行。
 *
 * 分两层，任何一层都不允许「无条件放行」：
 *   1. 有 `connection` 时用它做权威判定（Host/Origin 栅栏 + 浏览器 Cookie）；
 *   2. 旧宿主没有该服务时，退回到自己挡跨站请求（`Sec-Fetch-Site: cross-site`）。
 *
 * 不能把 `connection` 升成必需注入：`engines.dsh` 覆盖到 0.1.7-alpha.1，
 * 缺少该服务的老宿主上插件会整个不挂载。旧宿主兼容优先于此处的严格程度。
 * @returns {number | undefined} 拒绝状态码，放行时为 undefined
 */
function untrustedRejection(ctx, req) {
  const origin = String(req.headers?.origin ?? '')
  if (origin.startsWith('dsh-app:')) return undefined
  let connection
  try {
    connection = ctx.get('connection')
  } catch {
    connection = undefined
  }
  if (typeof connection?.requestRejection === 'function') {
    try {
      return connection.requestRejection(req)
    } catch {
      return 401
    }
  }
  // 没有权威校验器时不是放行，而是用浏览器自报的请求上下文挡一层。
  const site = String(req.headers?.['sec-fetch-site'] ?? '').toLowerCase()
  if (site === 'cross-site') return 403
  return undefined
}
/**
 * 建立请求处理器（Node 原生 req/res）。
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{ baseURL?: string }} config
 * @param {string} home DSH_HOME，用来读 DSH 会话与存放待导入暂存
 */
export function createWebview(ctx, config, home) {
  return async function handle(req, res) {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    const { pathname } = url
    const method = (req.method ?? 'GET').toUpperCase()
    const isGet = method === 'GET' || method === 'HEAD'

    // 与 DSH 自己的 /api 一样要求可信 Host/Origin 与已登录浏览器凭据。
    const rejection = untrustedRejection(ctx, req)
    if (rejection !== undefined) {
      sendJson(res, { error: { message: rejection === 403 ? '请求来源不受信任' : '需要 DSH 登录' } }, rejection)
      return
    }

    // ---- 从 DSH 一次性导入 ----
    if (pathname === '/webchat/api/import/stage' && method === 'POST') {
      const body = await readJsonBody(req)
      const sessionId = String(body.sessionId ?? '')
      const session = readDshSession(home, sessionId)
      if (session === undefined) {
        sendJson(res, { ok: false, error: '找不到这条会话，或它没有可导入的内容' }, 404)
        return
      }
      const staged = stageImport(home, session)
      sendJson(res, { ok: true, id: session.id, title: session.title, messages: session.messages.length, importId: staged.importId })
      return
    }
    if (pathname === '/webchat/api/import/pending' && isGet) {
      sendJson(res, listPending(home))
      return
    }
    if (pathname === '/webchat/api/import/ack' && method === 'POST') {
      const body = await readJsonBody(req)
      const ids = Array.isArray(body.ids) ? body.ids.map(String) : []
      // 新前端带 imports（含 importId）；兼容旧版只有 ids 的确认请求。
      const imports = Array.isArray(body.imports)
        ? body.imports
        : ids.map(id => ({ id }))
      sendJson(res, { removed: ackPending(home, imports) })
      return
    }
    if (pathname === '/webchat/api/self-test' && isGet) {
      try {
        sendJson(res, await selfTest(ctx, config))
      } catch (error) {
        sendJson(res, { ok: false, error: String(error?.message ?? error) }, 500)
      }
      return
    }

    // 上游前端用一个 Key 做入口校验，宿主给个假的即可。
    if (pathname === '/webchat/models' && isGet) {
      sendJson(res, { object: 'list', data: [{ id: 'deepseek-flash', object: 'model' }] })
      return
    }

    if (pathname === '/webchat/anthropic/v1/messages' && method === 'POST') {
      try {
        await proxyMessages(ctx, config, req, res)
      } catch (error) {
        if (!res.headersSent) sendJson(res, { error: { message: String(error?.message ?? error) } }, 502)
        else res.destroy()
      }
      return
    }

    if (pathname.startsWith('/webchat/anthropic/v1/files')) {
      try {
        await proxyFiles(ctx, config, req, res, pathname)
      } catch (error) {
        if (!res.headersSent) sendJson(res, { error: { message: String(error?.message ?? error) } }, 502)
        else res.destroy()
      }
      return
    }

    // 语音输入 / 回答朗读：/webchat/v1/tools/asr、/webchat/v1/tools/tts
    if (pathname.startsWith('/webchat/v1/tools/') && method === 'POST') {
      try {
        await proxyTools(ctx, config, req, res, pathname)
      } catch (error) {
        if (!res.headersSent) sendJson(res, { error: { message: String(error?.message ?? error) } }, 502)
        else res.destroy()
      }
      return
    }

    if (pathname === '/webchat' || pathname === '/webchat/') {
      const html = readIndex()
      res.writeHead(200, {
        'content-type': MIME['.html'],
        'cache-control': 'no-store',
        'content-length': Buffer.byteLength(html),
      })
      res.end(method === 'HEAD' ? undefined : html)
      return
    }

    if (pathname === '/webchat/brand-mark.svg') {
      await sendFile(res, path.join(DIST, '..', 'brand-mark.svg'))
      return
    }

    if (pathname.startsWith('/webchat/')) {
      const target = path.resolve(DIST, pathname.slice('/webchat/'.length))
      if (!isInside(path.resolve(DIST), target)) {
        res.writeHead(403).end('forbidden')
        return
      }
      await sendFile(res, target)
      return
    }

    res.writeHead(404).end('not found')
  }
}



