import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const LEGACY_SLOT = 'sidebar.workspaces.session.menu.item'
const ICON_SLOT = 'contextMenu.icon'

function mountClient({ native = false } = {}) {
  const slots = new Map()
  const requests = []
  const panels = []
  const notices = []
  const effects = []
  const nativeEffects = []
  const inFlight = { current: false }
  let legacyState
  let activateNative
  let nativeMenu
  let response = { ok: true, status: 200 }
  let plugin

  function MenuItemButton() {}
  const react = {
    createElement: (type, props, label) => ({ type, props, label }),
    useState: (initial) => [legacyState ?? initial, (value) => { legacyState = value }],
    useRef: () => inFlight,
  }
  const window = {
    __ModuleLoader__: {
      load({ factory }) {
        plugin = factory((name) => {
          if (name === 'react') return react
          assert.equal(name, '@deepseek-ai/dsh-client-ui-primitives')
          assert.equal(contextMenus, undefined, 'load the legacy button only on the legacy host')
          return { MenuItemButton }
        })
      },
    },
  }
  const slotService = {
    inject: (_name, register) => register(),
    register({ name }, component) {
      assert.equal(slots.has(name), false, `duplicate registration for ${name}`)
      slots.set(name, component)
      return () => slots.delete(name)
    },
  }
  const menuService = {
    register(menu) {
      assert.equal(slots.has(LEGACY_SLOT), false, 'withdraw the legacy row before registering the native action')
      nativeMenu = menu
      return () => { nativeMenu = undefined }
    },
    notify: (...args) => notices.push(args),
  }
  let contextMenus = native ? menuService : undefined
  const ctx = {
    slots: slotService,
    layout: { selectPanel: (id) => panels.push(id) },
    get(name) {
      assert.equal(name, 'contextMenus')
      return contextMenus
    },
    inject(names, activate) {
      assert.deepEqual([...names], ['slots', 'contextMenus'])
      activateNative = () => activate({
        slots: slotService,
        contextMenus,
        effect: (add) => nativeEffects.push(add()),
      })
      if (contextMenus) activateNative()
    },
    effect: (add) => effects.push(add()),
  }
  runInNewContext(source, {
    window,
    document: { querySelectorAll: () => [] },
    queueMicrotask,
    fetch: async (url, init) => {
      requests.push({ url, method: init.method, body: JSON.parse(init.body) })
      return response
    },
  })
  assert.deepEqual([...plugin.inject], ['slots', 'layout'])
  plugin.apply(ctx)

  return {
    window, slots, requests, panels, notices, MenuItemButton,
    setResponse: (value) => { response = value },
    getNativeMenu: () => nativeMenu,
    setNative(available) {
      contextMenus = available ? menuService : undefined
      if (available) {
        activateNative()
      } else {
        for (const dispose of nativeEffects.splice(0).reverse()) dispose()
      }
    },
    dispose() {
      for (const dispose of nativeEffects.splice(0).reverse()) dispose()
      for (const dispose of effects.splice(0).reverse()) dispose()
    },
  }
}

function renderLegacy(client, closeMenu) {
  return client.slots.get(LEGACY_SLOT)({
    sessionId: 'clicked-session',
    useMenuOpenState: () => [true, closeMenu],
  })
}

test('旧宿主通过原生菜单按钮导入点击的会话并关闭菜单', async () => {
  const client = mountClient()
  const menuOpen = []
  const row = renderLegacy(client, (value) => menuOpen.push(value))
  assert.equal(client.slots.has('main'), true)
  assert.equal(client.slots.has('sidebar.panellist'), true)
  assert.equal(client.getNativeMenu(), undefined)
  assert.equal(row.type, client.MenuItemButton)
  assert.equal(row.label, '导入到网页版')
  await row.props.onSelect()
  assert.deepEqual(client.requests, [{
    url: '/webchat/api/import/stage',
    method: 'POST',
    body: { sessionId: 'clicked-session' },
  }])
  assert.deepEqual(menuOpen, [false])
  assert.deepEqual(client.panels, ['dsh-chat-web'])
})

test('旧菜单在导入中只发送一次请求，失败后允许重试', async () => {
  const client = mountClient()
  const menuOpen = []
  const render = () => renderLegacy(client, (value) => menuOpen.push(value))
  let respond
  client.setResponse(new Promise((resolve) => { respond = resolve }))
  const action = render().props.onSelect
  const pending = action()
  assert.equal(render().props.disabled, true)
  await action()
  assert.equal(client.requests.length, 1)
  respond({ ok: false, status: 404 })
  await pending
  assert.deepEqual(menuOpen, [])
  assert.deepEqual(client.panels, [])
  assert.equal(render().label, '导入失败，点击重试')
  assert.equal(render().props.disabled, false)

  client.setResponse({ ok: true, status: 200 })
  await render().props.onSelect()
  assert.equal(client.requests.length, 2)
  assert.deepEqual(menuOpen, [false])
})

test('新版只注册原生会话菜单，保留图标、成功提示和失败反馈', async () => {
  const client = mountClient({ native: true })
  assert.equal(client.slots.has(LEGACY_SLOT), false)
  assert.equal(client.slots.has(ICON_SLOT), true)
  const menu = client.getNativeMenu()
  assert.equal(menu.target, 'session')
  assert.equal(menu.order, 10)
  const [action] = menu.resolve({ sessionId: 'native-session' })
  assert.equal(action.afterContent, true)
  assert.equal(action.label, '导入到网页版')
  assert.equal(action.icon.key, 'dsh-chat-web')
  assert.equal(action.failureLabel, '导入失败')
  await action.run()
  assert.equal(client.requests[0].body.sessionId, 'native-session')
  assert.deepEqual(client.panels, ['dsh-chat-web'])
  assert.deepEqual(client.notices, [['已导入到网页版', true]])

  client.setResponse({ ok: false, status: 404 })
  await assert.rejects(action.run(), /stage failed: 404/)
  assert.equal(client.notices.length, 1)
  assert.equal(client.panels.length, 1)
})

test('菜单服务迟到或卸载时只切换导入菜单，插件卸载后不重建', async () => {
  const client = mountClient()
  const panel = client.slots.get('main')
  assert.equal(client.slots.has(LEGACY_SLOT), true)

  client.setNative(true)
  assert.equal(client.slots.has(LEGACY_SLOT), false)
  assert.equal(client.slots.has(ICON_SLOT), true)
  assert.ok(client.getNativeMenu())
  assert.equal(client.slots.get('main'), panel)

  client.setNative(false)
  await Promise.resolve()
  assert.equal(client.getNativeMenu(), undefined)
  assert.equal(client.slots.has(ICON_SLOT), false)
  assert.equal(client.slots.has(LEGACY_SLOT), true)
  assert.equal(client.slots.get('main'), panel)

  client.setNative(true)
  client.dispose()
  await Promise.resolve()
  assert.equal(client.slots.size, 0)
  assert.equal(client.getNativeMenu(), undefined)
  assert.equal(client.window.__dshPanelMic, undefined)
})
