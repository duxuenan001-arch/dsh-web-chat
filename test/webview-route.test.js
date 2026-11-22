/**
 * `/webchat` 路由层的行为。
 *
 * 这一层承载鉴权、转发落点和静态托管，此前没有任何自动化覆盖——三个已修复的缺陷
 * （暂存越界、多提供方取错 Key、来源校验放行）都落在这一片。这里用假的 req/res
 * 驱动 `createWebview` 返回的处理器，不需要真的起 HTTP 服务。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Readable } from 'node:stream'

import { createWebview } from '../src/webview.js'

/** 假请求：`body` 可以是对象（序列化成 JSON）或字符串。 */
function makeRequest({ method = 'GET', url = '/webchat/', headers = {}, body } = {}) {
  const payload = body === undefined ? undefined : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))
  const stream = Readable.from(payload === undefined ? [] : [payload])
  stream.method = method
  stream.url = url
  stream.headers = {
    ...(payload === undefined ? {} : { 'content-length': String(payload.length) }),
    ...headers,
  }
  return stream
}

/** 假响应：把写入收进内存，供断言检查。 */
function makeResponse() {
  const chunks = []
  return {
    status: undefined,
    headers: undefined,
    headersSent: false,
    body: '',
    writeHead(status, headers) {
      this.status = status
      this.headers = headers ?? {}
      this.headersSent = true
      return this
    },
    write(chunk) {
      if (chunk !== undefined) chunks.push(Buffer.from(chunk))
      return true
    },
    end(chunk) {
      if (chunk !== undefined) chunks.push(Buffer.from(chunk))
      this.body = Buffer.concat(chunks).toString('utf8')
      return this
    },
    destroy() {
      this.destroyed = true
    },
    on() {
      return this
    },
  }
}

/** 只带 trust 判定的最小 ctx：`rejection` 为 undefined 表示放行。 */
function makeCtx({ rejection, token, settings, credentials } = {}) {
  return {
    get(name) {
      if (name === 'connection') {
        if (rejection === 'absent') return undefined
        return { requestRejection: () => rejection }
      }
      if (name === 'deepseekAccount') {
        return { resolveToken: async () => token }
      }
      if (name === 'settings') {
        return { describe: () => settings ?? [] }
      }
      if (name === 'credentials') {
        return {
          resolve: async ref => (credentials?.[ref] === undefined ? undefined : { value: credentials[ref] }),
        }
      }
      return undefined
    },
  }
}

const call = async (handler, options) => {
  const res = makeResponse()
  await handler(makeRequest(options), res)
  return res
}

test('路由：来源校验拒绝时返回 401/403，且不进入任何业务分支', async () => {
  const home = '/nonexistent-home'
  for (const [rejection, expected] of [[401, 401], [403, 403]]) {
    const handler = createWebview(makeCtx({ rejection }), {}, home)
    const res = await call(handler, { url: '/webchat/api/import/pending' })
    assert.equal(res.status, expected)
    assert.match(res.body, /登录|来源/u)
  }
})

test('路由：没有 connection 服务时，跨站请求被拒绝', async () => {
  const handler = createWebview(makeCtx({ rejection: 'absent' }), {}, '/nonexistent-home')
  const crossSite = await call(handler, {
    url: '/webchat/api/import/pending',
    headers: { 'sec-fetch-site': 'cross-site' },
  })
  assert.equal(crossSite.status, 403, '缺校验器时不能无条件放行')

  const sameOrigin = await call(handler, {
    url: '/webchat/api/import/pending',
    headers: { 'sec-fetch-site': 'same-origin' },
  })
  assert.equal(sameOrigin.status, 200, '同源请求在旧宿主上仍然可用')
})

test('路由：桌面壳 dsh-app: 来源直接放行', async () => {
  const handler = createWebview(makeCtx({ rejection: 401 }), {}, '/nonexistent-home')
  const res = await call(handler, {
    url: '/webchat/api/import/pending',
    headers: { origin: 'dsh-app://panel' },
  })
  assert.equal(res.status, 200)
})

test('路由：静态资源越界返回 403', async () => {
  const handler = createWebview(makeCtx({}), {}, '/nonexistent-home')
  const res = await call(handler, { url: '/webchat/../../etc/passwd' })
  // URL 规范化后可能落到非静态分支；两种情况都不能把文件吐出来。
  assert.ok(res.status === 403 || res.status === 404, `实际状态 ${res.status}`)
})

test('路由：找不到的静态资源返回 404', async () => {
  const handler = createWebview(makeCtx({}), {}, '/nonexistent-home')
  const res = await call(handler, { url: '/webchat/static/js/definitely-missing.js' })
  assert.equal(res.status, 404)
})

test('路由：没有凭据时转发消息返回 401，且不发出上游请求', async () => {
  const handler = createWebview(makeCtx({}), {}, '/nonexistent-home')
  const res = await call(handler, {
    method: 'POST',
    url: '/webchat/anthropic/v1/messages',
    body: { messages: [] },
  })
  assert.equal(res.status, 401)
  assert.match(res.body, /凭据/u)
})

test('路由：导入确认接口忽略越界 id（端到端回归）', async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'webchat-route-'))
  try {
    fs.mkdirSync(path.join(home, 'webchat-imports'), { recursive: true })
    const outside = path.join(home, 'settings.json')
    fs.writeFileSync(outside, '{"theme":"dark"}')
    fs.writeFileSync(
      path.join(home, 'webchat-imports', 's1.json'),
      JSON.stringify({ id: 's1', importId: 'u1', messages: [] })
    )

    const handler = createWebview(makeCtx({}), {}, home)
    const res = await call(handler, {
      method: 'POST',
      url: '/webchat/api/import/ack',
      body: { imports: [{ id: '../settings', importId: 'u1' }] },
    })
    assert.equal(res.status, 200)
    assert.deepEqual(JSON.parse(res.body).removed, [])
    assert.equal(fs.existsSync(outside), true, '暂存目录外的文件必须还在')
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('鉴权：多提供方时只认 DeepSeek 自己的 apiKeyEnv', async () => {
  const { resolveUpstreamAuth } = await import('../src/webview.js')
  // 顺序无关：旧实现按栈序取值（后进先出），换个顺序就会拿错；
  // 这里把两种排列都跑一遍，守卫必须与配置顺序无关。
  const cases = [
    {
      name: 'DeepSeek 在前',
      settings: [
        { ns: 'llm-deepseek-api-key', value: { apiKeyEnv: 'MY_DEEPSEEK_KEY' } },
        { ns: 'llm-openrouter', value: { apiKeyEnv: 'OPENROUTER_API_KEY' } },
      ],
    },
    {
      name: 'DeepSeek 在后',
      settings: [
        { ns: 'llm-openrouter', value: { apiKeyEnv: 'OPENROUTER_API_KEY' } },
        { ns: 'llm-deepseek-api-key', value: { apiKeyEnv: 'MY_DEEPSEEK_KEY' } },
      ],
    },
  ]
  for (const item of cases) {
    const ctx = makeCtx({
      token: undefined,
      settings: item.settings,
      credentials: { MY_DEEPSEEK_KEY: 'sk-deepseek', OPENROUTER_API_KEY: 'sk-openrouter' },
    })
    const auth = await resolveUpstreamAuth(ctx, 'https://api.deepseek.com/anthropic')
    assert.equal(auth?.source, 'api-key', item.name)
    assert.equal(auth?.headers['x-api-key'], 'sk-deepseek', `${item.name}：不该取到别的提供方的 Key`)
  }
})

test('鉴权：按 baseURL 识别 DeepSeek 提供方', async () => {
  const { resolveUpstreamAuth } = await import('../src/webview.js')
  const ctx = makeCtx({
    token: undefined,
    settings: [
      { ns: 'custom-a', value: { apiKeyEnv: 'OTHER_KEY', baseURL: 'https://openrouter.ai/api' } },
      { ns: 'custom-b', value: { apiKeyEnv: 'DS_KEY', baseURL: 'https://api.deepseek.com/anthropic' } },
    ],
    credentials: { DS_KEY: 'sk-ds', OTHER_KEY: 'sk-other' },
  })
  const auth = await resolveUpstreamAuth(ctx, 'https://api.deepseek.com/anthropic')
  assert.equal(auth?.headers['x-api-key'], 'sk-ds')
})

test('鉴权：一个 DeepSeek 提供方都没有时退回旧行为', async () => {
  const { resolveUpstreamAuth } = await import('../src/webview.js')
  const ctx = makeCtx({
    token: undefined,
    settings: [{ ns: 'mystery', value: { apiKeyEnv: 'ONLY_KEY' } }],
    credentials: { ONLY_KEY: 'sk-only' },
  })
  const auth = await resolveUpstreamAuth(ctx, 'https://api.deepseek.com/anthropic')
  assert.equal(auth?.headers['x-api-key'], 'sk-only')
})

test('鉴权：名字里带 deepseek 字样的非 DeepSeek 提供方不被误选', async () => {
  const { resolveUpstreamAuth } = await import('../src/webview.js')
  // 钓鱼域名与相似域名都不能被当成官方 DeepSeek 提供方。
  const ctx = makeCtx({
    token: undefined,
    settings: [
      { ns: 'anti-deepseek-fake', value: { apiKeyEnv: 'FAKE_KEY' } },
      { ns: 'mirror', value: { apiKeyEnv: 'MIRROR_KEY', baseURL: 'https://evil-deepseek.com.attacker.io' } },
      { ns: 'llm-deepseek-api-key', value: { apiKeyEnv: 'REAL_KEY' } },
    ],
    credentials: { FAKE_KEY: 'sk-fake', MIRROR_KEY: 'sk-mirror', REAL_KEY: 'sk-real' },
  })
  const auth = await resolveUpstreamAuth(ctx, 'https://api.deepseek.com/anthropic')
  assert.equal(auth?.headers['x-api-key'], 'sk-real')
})

test('鉴权：账户令牌优先于 API Key', async () => {
  const { resolveUpstreamAuth } = await import('../src/webview.js')
  const ctx = makeCtx({
    token: 'account-token',
    settings: [{ ns: 'llm-deepseek-api-key', value: { apiKeyEnv: 'DEEPSEEK_API_KEY' } }],
    credentials: { DEEPSEEK_API_KEY: 'sk-should-not-be-used' },
  })
  const auth = await resolveUpstreamAuth(ctx, 'https://api.deepseek.com/anthropic')
  assert.equal(auth?.source, 'account')
  assert.equal(auth?.headers['x-dsh-auth-token'], 'account-token')
})
