/**
 * 浏览器半边。
 *
 * 一个入口：左侧面板列表里的「网页版」。
 * 另外在会话的右键菜单里加一行「导入到网页版」——一次性复制，复制完两边各管各的。
 */
window.__ModuleLoader__.load({
  // 必须与 package.json 的 name 一致：DSH 用包名给前端 bundle 建索引。
  id: 'dsh-chat-web',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    // 官方字标（小鲸鱼）内联为 data URI：侧栏图标不依赖任何额外请求。
    const PANEL_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNyIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMC4xNjMgMS43NSAyNi42MzQgMTkuNiIgZmlsbD0ibm9uZSIgcm9sZT0iaW1nIiBhcmlhLWxhYmVsPSJEZWVwU2VlayI+CiAgPHBhdGggZD0iTTI2LjUxNzQgMy4zOTQ3MUMyNi4yMzUgMy4yNTY3IDI2LjExMzcgMy41MjAwNiAyNS45NDg3IDMuNjUzNDZDMjUuODkyMyAzLjY5NjU5IDI1Ljg0NDYgMy43NTI5NCAyNS43OTY5IDMuODA0NjlDMjUuMzg0NiA0LjI0NTE2IDI0LjkwMjcgNC41MzQzOSAyNC4yNzM3IDQuNDk5ODlDMjMuMzUzNiA0LjQ0ODE0IDIyLjU2ODIgNC43MzczNyAyMS44NzM1IDUuNDQxMTlDMjEuNzI1OCA0LjU3MzQ5IDIxLjIzNTMgNC4wNTU0IDIwLjQ4ODkgMy43MjMwNEMyMC4wOTg1IDMuNTUwNTQgMTkuNzAzNCAzLjM3NzQ2IDE5LjQyOTcgMy4wMDE5N0MxOS4yMzg4IDIuNzM0NTkgMTkuMTg2NSAyLjQzNjczIDE5LjA5MSAyLjE0Mjg5QzE5LjAzMDEgMS45NjU3OSAxOC45Njk3IDEuNzg0NjYgMTguNzY1NiAxLjc1NDE4QzE4LjU0NDIgMS43MTk2OCAxOC40NTc0IDEuOTA1NDEgMTguMzcwNSAyLjA2MDY3QzE4LjAyMzIgMi42OTU0OSAxNy44ODg3IDMuMzk0NzEgMTcuOTAxOSA0LjEwMzEzQzE3LjkzMjQgNS42OTY1IDE4LjYwNTEgNi45NjU1NiAxOS45NDIxIDcuODY4MzRDMjAuMDkzOSA3Ljk3MTg0IDIwLjEzMyA4LjA3NTM1IDIwLjA4NTIgOC4yMjY1OEMxOS45OTM4IDguNTM3NjYgMTkuODg1NyA4LjgzOTU1IDE5Ljc5MDMgOS4xNTA2M0MxOS43MjkzIDkuMzQ5MDEgMTkuNjM4NCA5LjM5MjcxIDE5LjQyNTcgOS4zMDU4OEMxOC42OTIgOC45OTk0IDE4LjA1ODMgOC41NDU3MSAxNy40OTgyIDcuOTk3NzJDMTYuNTQ3NyA3LjA3ODI3IDE1LjY4ODEgNi4wNjMzNiAxNC42MTYyIDUuMjY4NjlDMTQuMzY0NCA1LjA4Mjk2IDE0LjExMjUgNC45MTA0NSAxMy44NTIxIDQuNzQ2QzEyLjc1ODQgMy42ODM5NCAxMy45OTUyIDIuODExNjQgMTQuMjgxNiAyLjcwODE0QzE0LjU4MTIgMi42MDAwMyAxNC4zODU3IDIuMjI4NTcgMTMuNDE3OSAyLjIzMzE3QzEyLjQ1MDIgMi4yMzcyIDExLjU2NDYgMi41NjE1MSAxMC40MzU5IDIuOTkzMzVDMTAuMjcwOCAzLjA1ODMyIDEwLjA5NzIgMy4xMDU0NyA5LjkxOTUxIDMuMTQ0NTdDOC44OTU0IDIuOTUwMjIgNy44MzE2MiAyLjkwNzA5IDYuNzIwNjkgMy4wMzI0NUM0LjYyODc3IDMuMjY1MzMgMi45NTc3NyA0LjI1NDM2IDEuNzI5NTQgNS45NDI2MUMwLjI1NDA0MyA3Ljk3MTg0IC0wLjA5MzI2NzggMTAuMjc3NyAwLjMzMTY3IDEyLjY4MjRDMC43Nzg0NTggMTUuMjE3MSAyLjA3MjI1IDE3LjMxNTMgNC4wNjAwOCAxOC45NTU4QzYuMTIxNTIgMjAuNjU2NyA4LjQ5NTc3IDIxLjQ5MDUgMTEuMjA0NyAyMS4zMzA2QzEyLjg0OTggMjEuMjM1OCAxNC42ODEyIDIxLjAxNTUgMTYuNzQ3MyAxOS4yNjY5QzE3LjI2ODIgMTkuNTI2MiAxNy44MTUxIDE5LjYyOTcgMTguNzIxOSAxOS43MDc0QzE5LjQyMDUgMTkuNzcyMyAyMC4wOTMzIDE5LjY3MjkgMjAuNjE0MyAxOS41NjQ4QzIxLjQzMDIgMTkuMzkyMyAyMS4zNzM5IDE4LjYzNjcgMjEuMDc4OSAxOC40OTgxQzE4LjY4NzQgMTcuMzg0MyAxOS4yMTI0IDE3LjgzNzQgMTguNzM1MSAxNy40NzA2QzE5Ljk1MDEgMTYuMDMzIDIxLjgwNjMgMTMuNDc3NiAyMi4zNzkgOS45OTgyMUMyMi40MzUzIDkuNjE0MDkgMjIuNTA3MiA5LjA3MyAyMi40OTg2IDguNzYxOTJDMjIuNDk0IDguNTcyMTYgMjIuNTM3NyA4LjQ5ODU2IDIyLjc1NDUgOC40NzY3MUMyMy4zNTM2IDguNDA3NzEgMjMuOTM1IDguMjQzODMgMjQuNDY5MiA3Ljk0OTk5QzI2LjAxODggNy4xMDM1NyAyNi42NDM5IDUuNzEzMTggMjYuNzkxMSA0LjA0Njc4QzI2LjgxMjkgMy43OTIwNCAyNi43ODY1IDMuNTI4NjkgMjYuNTE3NCAzLjM5NDcxWk0xMy4wMTQzIDE4LjM5NDZDMTAuNjk2NCAxNi41NzI0IDkuNTcyMiAxNS45NzI2IDkuMTA4MTYgMTUuOTk4NUM4LjY3NDAyIDE2LjAyNDQgOC43NTIyMiAxNi41MjEyIDguODQ3NjggMTYuODQ0OUM4Ljk0NzczIDE3LjE2NDYgOS4wNzc2OCAxNy4zODQ5IDkuMjU5OTYgMTcuNjY1NUM5LjM4NTg5IDE3Ljg1MTIgOS40NzI3MiAxOC4xMjcyIDkuMTM0MDQgMTguMzM0OEM4LjM4NzY2IDE4Ljc5NjUgNy4wODk4NSAxOC4xNzk2IDcuMDI4OSAxOC4xNDkxQzUuNTE4MzMgMTcuMjU5NSA0LjI1NTU5IDE2LjA4NTMgMy4zNjU0NiAxNC40NzkzQzIuNTA1ODEgMTIuOTMzNyAyLjAwNjcgMTEuMjc1MyAxLjkyNDQ3IDkuNTA1NDJDMS45MDI2MiA5LjA3ODE4IDIuMDI4NTUgOC45MjY5NSAyLjQ1NDA2IDguODQ5MzJDMy4wMTQxMyA4Ljc0NTgyIDMuNTkxNDQgOC43MjM5NyA0LjE1MDkzIDguODA2MTlDNi41MTY1NiA5LjE1MTc4IDguNTMwMjcgMTAuMjA5MiAxMC4yMTg1IDExLjg4NDhDMTEuMTgyMiAxMi44Mzg4IDExLjkxMTQgMTMuOTc5IDEyLjY2MjMgMTUuMDkyOUMxMy40NjEgMTYuMjc1NyAxNC4zMjAxIDE3LjQwMjcgMTUuNDE0NCAxOC4zMjY4QzE1LjgwMDggMTguNjUwNSAxNi4xMDkgMTguODk2NiAxNi40MDQgMTkuMDc4M0MxNS41MTQ0IDE5LjE3NzggMTQuMDI5NyAxOS4xOTkxIDEzLjAxNDMgMTguMzk1OFYxOC4zOTQ2Wk0xNC4xMjUyIDExLjI0ODlDMTQuMTI1MiAxMS4wNTkxIDE0LjI3NyAxMC45MDc5IDE0LjQ2NzkgMTAuOTA3OUMxNC41MTEgMTAuOTA3OSAxNC41NTAxIDEwLjkxNjUgMTQuNTg1MiAxMC45MjkyQzE0LjYzMjkgMTAuOTQ2NCAxNC42NzY2IDEwLjk3MjMgMTQuNzExMSAxMS4wMTE0QzE0Ljc3MjEgMTEuMDcxOCAxNC44MDY2IDExLjE1OCAxNC44MDY2IDExLjI0ODlDMTQuODA2NiAxMS40Mzg2IDE0LjY1NDggMTEuNTg5OSAxNC40NjM5IDExLjU4OTlDMTQuMjczIDExLjU4OTkgMTQuMTI1MiAxMS40Mzg2IDE0LjEyNTIgMTEuMjQ4OVpNMTcuNTc1OSAxMy4wMTg4QzE3LjM1NDUgMTMuMTA5NiAxNy4xMzMxIDEzLjE4NzMgMTYuOTIwMyAxMy4xOTU5QzE2LjU5MDMgMTMuMjEzMSAxNi4yMzAzIDEzLjA3OTEgMTYuMDM0OCAxMi45MTUzQzE1LjczMTIgMTIuNjYwNSAxNS41MTM5IDEyLjUxNzkgMTUuNDIzIDEyLjA3MzRDMTUuMzgzOSAxMS44ODM3IDE1LjQwNTcgMTEuNTg5OSAxNS40NDAyIDExLjQyMTRDMTUuNTE4NSAxMS4wNTg1IDE1LjQzMTYgMTAuODI1NyAxNS4xNzU3IDEwLjYxNEMxNC45Njc2IDEwLjQ0MTUgMTQuNzAyNSAxMC4zOTM4IDE0LjQxMTUgMTAuMzkzOEMxNC4zMDI5IDEwLjM5MzggMTQuMjAzNCAxMC4zNDYxIDE0LjEyOTIgMTAuMzA3NkMxNC4wMDc5IDEwLjI0NzIgMTMuOTA3OCAxMC4wOTYgMTQuMDAzMyA5LjkxMDIzQzE0LjAzMzggOS44NDk4NSAxNC4xODE1IDkuNzAzMjIgMTQuMjE2IDkuNjc3MzRDMTQuNjExMSA5LjQ1MjUxIDE1LjA2NjUgOS41MjYxMiAxNS40ODggOS42OTQ2QzE1Ljg3ODQgOS44NTQ0NSAxNi4xNzQgMTAuMTQ3NyAxNi41OTg5IDEwLjU2MjNDMTcuMDMzIDExLjA2MzEgMTcuMTExMiAxMS4yMDExIDE3LjM1ODUgMTEuNTc3MkMxNy41NTQgMTEuODcxIDE3LjczMTcgMTIuMTcyOSAxNy44NTM2IDEyLjUxODVDMTcuOTI3MiAxMi43MzQxIDE3LjgzMTcgMTIuOTEwNyAxNy41NzU5IDEzLjAxODhaIiBmaWxsPSIjMzk2NEZFIi8+Cjwvc3ZnPgo='

    // DSH 桌面的麦克风权限只授予主框架（iframe 一律拒绝），
    // 所以录音放在宿主主框架做，面板 iframe 通过同源 window.top 取音频流。
    const installMicBridge = () => {
      try {
        window.__dshPanelMic = {
          async getStream() {
            if (!navigator.mediaDevices?.getUserMedia) throw new Error('麦克风不可用')
            return navigator.mediaDevices.getUserMedia({
              audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
            })
          },
        }
      } catch (_error) {
        // 非浏览器环境或跨源限制：面板会回退到自身 getUserMedia。
      }
    }
    // DSH 网页版的账号头像由 shell 自己渲染，没有暴露成 Slot。这里按位置找：
    // 侧栏左下角、16~64px 的 img，把 src 写进同源 localStorage，面板搜索结果的用户行直接读。
    const publishUserAvatar = () => {
      try {
        const findAvatar = () => {
          let found = null
          for (const img of document.querySelectorAll('img')) {
            const rect = img.getBoundingClientRect()
            if (rect.width < 16 || rect.width > 64 || rect.height < 16 || rect.height > 64) continue
            if (rect.left > 320 || rect.top < window.innerHeight - 160) continue
            const src = img.currentSrc || img.src
            if (src) found = src
          }
          return found
        }
        const apply = () => {
          const src = findAvatar()
          if (src !== null && window.localStorage.getItem('dsh:user-avatar') !== src) {
            window.localStorage.setItem('dsh:user-avatar', src)
          }
        }
        apply()
        if (typeof MutationObserver !== 'function') return undefined
        let scheduled = false
        const observer = new MutationObserver(() => {
          if (scheduled) return
          scheduled = true
          setTimeout(() => {
            scheduled = false
            apply()
          }, 200)
        })
        observer.observe(document.body, { childList: true, subtree: true })
        return () => observer.disconnect()
      } catch (_error) {
        return undefined
      }
    }
    // 导入完成后让面板重新加载一次，好让新会话出现在列表里。
    const importBus = { token: 0, listeners: new Set() }
    const notifyImported = () => {
      importBus.token += 1
      for (const listener of importBus.listeners) listener(importBus.token)
    }

    // 浏览器式页面缩放：官方网页版由 Chromium 自带 Ctrl+滚轮/Ctrl+± 缩放；
    // DSH 的 Electron 内容区没有这层行为，所以在面板 iframe 内补上，不加任何设置界面。
    // v2 key：旧实现把“没有存储值”误判成 0（再钳到 80%），换 key 让首次安装回到 100%。
    const PANEL_ZOOM_KEY = 'dsh-chat-web:panel-zoom:v2'
    const PANEL_ZOOM_LEVELS = [25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500]
    const PANEL_ZOOM_DEFAULT_INDEX = PANEL_ZOOM_LEVELS.indexOf(100)
    const nearestZoomIndex = (value) => {
      let best = PANEL_ZOOM_DEFAULT_INDEX
      let bestDistance = Number.POSITIVE_INFINITY
      for (let index = 0; index < PANEL_ZOOM_LEVELS.length; index += 1) {
        const distance = Math.abs(PANEL_ZOOM_LEVELS[index] - value)
        if (distance < bestDistance) {
          best = index
          bestDistance = distance
        }
      }
      return best
    }
    const readPanelZoomIndex = () => {
      try {
        const raw = window.localStorage.getItem(PANEL_ZOOM_KEY)
        if (raw === null) return PANEL_ZOOM_DEFAULT_INDEX
        const value = Number(raw)
        if (!Number.isFinite(value)) return PANEL_ZOOM_DEFAULT_INDEX
        return nearestZoomIndex(value)
      } catch (_error) {
        return PANEL_ZOOM_DEFAULT_INDEX
      }
    }
    const writePanelZoom = (value) => {
      try {
        window.localStorage.setItem(PANEL_ZOOM_KEY, String(value))
      } catch (_error) {
        // 存储不可用时只影响下次打开，不影响本次缩放。
      }
    }
    const installPanelZoom = (iframe) => {
      let cleanup = null
      const attach = () => {
        cleanup?.()
        cleanup = null
        try {
          const win = iframe.contentWindow
          const doc = iframe.contentDocument
          if (!win || !doc) return
          let zoomIndex = readPanelZoomIndex()
          let bubble = null
          let bubbleLabel = null
          let bubbleTimer = null
          const parentDoc = window.document
          const hideBubble = () => {
            if (bubble !== null) {
              bubble.style.opacity = '0'
              bubble.style.transform = 'translateX(-50%) scale(.98)'
              bubble.style.pointerEvents = 'none'
            }
          }
          const showBubble = () => {
            try {
              if (bubble === null) {
                bubble = parentDoc.createElement('div')
                bubble.setAttribute('role', 'status')
                bubble.setAttribute('aria-live', 'polite')
                bubble.style.cssText = [
                  'position:fixed',
                  'z-index:2147483647',
                  'display:flex',
                  'align-items:center',
                  'gap:8px',
                  'width:max-content',
                  'max-width:calc(100vw - 32px)',
                  'box-sizing:border-box',
                  'padding:7px 12px 7px 16px',
                  'border:1px solid #dadce0',
                  'border-radius:12px',
                  'background:#fff',
                  'color:#1f1f1f',
                  'font:13px/1.2 system-ui,sans-serif',
                  'box-shadow:0 2px 6px rgba(60,64,67,.15)',
                  'opacity:0',
                  'transform:translateX(-50%) scale(.96)',
                  'transition:opacity .15s ease,transform .15s ease',
                  'pointer-events:none',
                ].join(';')
                bubbleLabel = parentDoc.createElement('span')
                bubbleLabel.style.cssText = 'min-width:40px;font-weight:500;text-align:left'
                const button = (text, label, onClick, extra) => {
                  const element = parentDoc.createElement('button')
                  element.type = 'button'
                  element.textContent = text
                  element.setAttribute('aria-label', label)
                  element.style.cssText = [
                    'font:inherit',
                    'border:0',
                    'background:none',
                    'color:#1f1f1f',
                    'cursor:pointer',
                    'padding:0 4px',
                    'font-size:20px',
                    'line-height:1',
                    ...extra,
                  ].join(';')
                  element.addEventListener('click', onClick)
                  return element
                }
                const minus = button('−', '缩小', (event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setZoomIndex(zoomIndex - 1)
                }, [])
                const plus = button('+', '放大', (event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setZoomIndex(zoomIndex + 1)
                }, [])
                const reset = parentDoc.createElement('button')
                reset.type = 'button'
                reset.textContent = navigator.language.toLowerCase().startsWith('zh') ? '重置' : 'Reset'
                reset.setAttribute('aria-label', '重置缩放')
                reset.style.cssText = [
                  'font:inherit',
                  'margin-left:4px',
                  'padding:6px 12px',
                  'border:1px solid #a8c7fa',
                  'border-radius:999px',
                  'background:#fff',
                  'color:#0b57d0',
                  'cursor:pointer',
                  'font-size:13px',
                ].join(';')
                reset.addEventListener('click', (event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setZoomIndex(PANEL_ZOOM_DEFAULT_INDEX)
                })
                bubble.append(bubbleLabel, minus, plus, reset)
                ;(parentDoc.body ?? parentDoc.documentElement).appendChild(bubble)
              }
              const rect = iframe.getBoundingClientRect()
              if (rect.width > 0) {
                bubble.style.left = `${rect.left + rect.width / 2}px`
                bubble.style.top = `${Math.max(8, rect.top + 12)}px`
              }
              bubbleLabel.textContent = `${PANEL_ZOOM_LEVELS[zoomIndex]}%`
              bubble.style.opacity = '1'
              bubble.style.transform = 'translateX(-50%) scale(1)'
              bubble.style.pointerEvents = 'auto'
              if (bubbleTimer !== null) clearTimeout(bubbleTimer)
              bubbleTimer = setTimeout(hideBubble, 2600)
            } catch (_error) {
              // 浮层只是反馈，失败不影响缩放。
            }
          }
          const apply = (withBubble) => {
            const percent = PANEL_ZOOM_LEVELS[zoomIndex]
            doc.documentElement.style.zoom = percent === 100 ? '' : `${percent}%`
            writePanelZoom(percent)
            if (withBubble) showBubble()
          }
          const setZoomIndex = (next) => {
            zoomIndex = Math.min(PANEL_ZOOM_LEVELS.length - 1, Math.max(0, next))
            apply(true)
          }
          const onWheel = (event) => {
            if (!event.ctrlKey && !event.metaKey) return
            event.preventDefault()
            event.stopPropagation()
            setZoomIndex(zoomIndex + (event.deltaY < 0 ? 1 : -1))
          }
          const onKeyDown = (event) => {
            if (!(event.ctrlKey || event.metaKey) || event.altKey) return
            if (event.key === '+' || event.key === '=') setZoomIndex(zoomIndex + 1)
            else if (event.key === '-' || event.key === '_') setZoomIndex(zoomIndex - 1)
            else if (event.key === '0') setZoomIndex(PANEL_ZOOM_DEFAULT_INDEX)
            else return
            event.preventDefault()
            event.stopPropagation()
          }
          doc.addEventListener('wheel', onWheel, { capture: true, passive: false })
          doc.addEventListener('keydown', onKeyDown, { capture: true })
          apply(false)
          cleanup = () => {
            doc.removeEventListener('wheel', onWheel, { capture: true })
            doc.removeEventListener('keydown', onKeyDown, { capture: true })
            if (bubbleTimer !== null) clearTimeout(bubbleTimer)
            try {
              bubble?.remove()
              doc.documentElement.style.zoom = ''
            } catch (_error) {
              // 面板已销毁时忽略。
            }
          }
        } catch (_error) {
          // 跨源或面板未就绪时放弃，不影响原功能。
        }
      }
      iframe.addEventListener('load', attach)
      if (iframe.contentDocument?.readyState === 'complete') attach()
      return () => {
        iframe.removeEventListener('load', attach)
        cleanup?.()
      }
    }

    function PanelFrame({ reloadToken }) {
      const ref = React.useRef(null)
      React.useEffect(() => {
        const iframe = ref.current
        if (!iframe) return undefined
        return installPanelZoom(iframe)
      }, [reloadToken])
      return h('iframe', {
        ref,
        src: '/webchat/',
        title: 'DeepSeek 网页版',
        allow: 'clipboard-write; microphone',
        style: { width: '100%', height: '100%', border: 'none', display: 'block', background: '#fff' },
      })
    }

    /**
     * macOS 的红绿灯悬浮在窗口内容上方。DSH 只在部分入口页预留了
     * --dsh-frame-top-clearance；插件面板是全局 main panel，需要自己避开。
     * 仅当面板贴住窗口左边（DSH 侧栏收起/抽屉）时让出这段高度；
     * 如果 DSH 已经通过 main panel padding 让过，则不重复叠加。
     */
    function panelChromeInset(node) {
      const root = document.documentElement
      if (root.dataset.platform !== 'darwin' || root.hasAttribute('data-fullscreen')) {
        return 0
      }
      const parent = node?.parentElement
      if (!parent || parent.getBoundingClientRect().left > 1) {
        return 0
      }
      const clearance = Number.parseFloat(
        getComputedStyle(root).getPropertyValue('--dsh-frame-top-clearance')
      )
      const existing = Number.parseFloat(getComputedStyle(parent).paddingTop) || 0
      return Math.max(0, (Number.isFinite(clearance) ? clearance : 48) - existing)
    }

    /** 左侧面板：完整的网页版，带它自己的会话列表。 */
    function Panel() {
      const [token, setToken] = React.useState(importBus.token)
      const [topInset, setTopInset] = React.useState(0)
      const ref = React.useRef(null)
      React.useEffect(() => {
        const listener = (value) => setToken(value)
        importBus.listeners.add(listener)
        return () => importBus.listeners.delete(listener)
      }, [])
      React.useEffect(() => {
        const node = ref.current
        if (!node) return undefined
        const parent = node.parentElement
        const update = () => setTopInset(panelChromeInset(node))
        update()
        window.addEventListener('resize', update)
        const resizeObserver = typeof ResizeObserver === 'function' && parent
          ? new ResizeObserver(update)
          : undefined
        resizeObserver?.observe(parent)
        const mutation = new MutationObserver(update)
        mutation.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-platform', 'data-fullscreen'],
        })
        if (parent) {
          mutation.observe(parent, { attributes: true, attributeFilter: ['style', 'class'] })
        }
        return () => {
          window.removeEventListener('resize', update)
          resizeObserver?.disconnect()
          mutation.disconnect()
        }
      }, [])
      return h('div', {
        ref,
        style: {
          height: '100%',
          minHeight: 320,
          display: 'flex',
          boxSizing: 'border-box',
          paddingTop: topInset,
        },
      },
        h('div', { style: { flex: 1, minWidth: 0 } }, h(PanelFrame, { key: token, reloadToken: token })))
    }

    /** 会话菜单里的图标：一个"导入到托盘"的线性图标，风格对齐宿主其它条目。 */
    function ImportIcon() {
      return h('svg', {
        viewBox: '0 0 16 16',
        width: 16,
        height: 16,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
      },
        h('path', { d: 'M8 2.5v6.2' }),
        h('path', { d: 'M5.4 6.3 8 8.9l2.6-2.6' }),
        h('path', { d: 'M3 10.4v1.8c0 .8.6 1.4 1.4 1.4h7.2c.8 0 1.4-.6 1.4-1.4v-1.8' }))
    }
    /** 侧栏图标；size 由侧栏按宽窄状态给出。 */
    function PanelIcon(props) {
      const size = typeof props?.size === 'number' ? props.size : 16
      return h('img', {
        src: PANEL_ICON,
        alt: 'DeepSeek',
        style: { height: size, width: size, objectFit: 'contain', display: 'block' },
      })
    }

    const IMPORT_LABEL = '导入到网页版'
    const IMPORT_FAILURE = '导入失败'

    function registerLegacyImport(ctx, importSession) {
      const name = 'sidebar.workspaces.session.menu.item'
      return ctx.slots.inject(name, () => {
        const { MenuItemButton } = require('@deepseek-ai/dsh-client-ui-primitives')

        function ImportRow({ sessionId, useMenuOpenState }) {
          const [, setMenuOpen] = useMenuOpenState()
          const [status, setStatus] = React.useState('idle')
          const inFlight = React.useRef(false)

          async function onSelect() {
            if (inFlight.current) return
            inFlight.current = true
            setStatus('pending')
            try {
              await importSession(sessionId, () => setMenuOpen(false))
            } catch {
              setStatus('failed')
            } finally {
              inFlight.current = false
            }
          }

          let label = IMPORT_LABEL
          if (status === 'pending') label = '正在导入…'
          if (status === 'failed') label = '导入失败，点击重试'
          return h(MenuItemButton, { disabled: status === 'pending', onSelect }, label)
        }

        return ctx.slots.register({ name, id: 'dsh-chat-web:import', order: 10 }, ImportRow)
      })
    }

    return {
      inject: ['slots', 'layout'],
      apply(ctx) {
        installMicBridge()
        const stopAvatar = publishUserAvatar()

        ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: 'dsh-chat-web',
        }, Panel)), 'webchat.panel')

        ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'dsh-chat-web',
          order: 20,
          label: '网页版dsh',
        }, PanelIcon)), 'webchat.panellist')

        async function importSession(sessionId, closeMenu) {
          const response = await fetch('/webchat/api/import/stage', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sessionId: String(sessionId) }),
          })
          if (!response.ok) throw new Error(`stage failed: ${response.status}`)
          closeMenu?.()
          notifyImported()
          ctx.layout.selectPanel('dsh-chat-web')
        }

        ctx.effect(() => {
          let active = true
          let stopLegacy
          const mountLegacy = () => {
            if (!active || stopLegacy || ctx.get('contextMenus')) return
            stopLegacy = registerLegacyImport(ctx, importSession)
          }
          const unmountLegacy = () => {
            stopLegacy?.()
            stopLegacy = undefined
          }

          // 独立注入菜单服务，服务稍后就绪时也能切换到原生菜单。
          ctx.inject(['slots', 'contextMenus'], (menuCtx) => {
            unmountLegacy()
            menuCtx.effect(() => menuCtx.slots.inject('contextMenu.icon', () => menuCtx.slots.register({
              name: 'contextMenu.icon',
              key: 'dsh-chat-web',
            }, ImportIcon)), 'webchat.import-icon')
            menuCtx.effect(() => menuCtx.contextMenus.register({
              id: 'dsh-chat-web',
              target: 'session',
              order: 10,
              resolve: (target) => [{
                id: 'dsh-chat-web:import',
                label: IMPORT_LABEL,
                icon: { key: 'dsh-chat-web' },
                afterContent: true,
                run: async () => {
                  await importSession(target.sessionId)
                  menuCtx.contextMenus.notify('已导入到网页版', true)
                },
                failureLabel: IMPORT_FAILURE,
              }],
            }), 'webchat.import')
            // 等 Cordis 完成服务卸载，再检查旧菜单是否需要回来。
            menuCtx.effect(() => () => queueMicrotask(mountLegacy), 'webchat.restore-legacy-menu')
          })

          mountLegacy()
          return () => {
            active = false
            unmountLegacy()
          }
        }, 'webchat.import-menu')

        ctx.effect(() => () => {
          if (window.__dshPanelMic !== undefined) delete window.__dshPanelMic
        }, 'webchat.mic-bridge')

        ctx.effect(() => () => {
          stopAvatar?.()
        }, 'webchat.avatar')
      },
    }
  },
})


