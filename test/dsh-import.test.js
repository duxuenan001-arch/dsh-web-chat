import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'

import {
  ackPending,
  decompressSessionLog,
  listPending,
  parseSessionLog,
  stageImport,
} from '../src/dsh-import.js'

const line = (type, data, time) => JSON.stringify({ type, seq: 0, time, data })

/** 一条真实形状的日志：用户提问 → 上下文注入 → 两步 assistant。 */
const log = [
  JSON.stringify({ type: 'session', version: 4, id: 's1', createdAt: 1, cwd: 'C:/x', isSeeded: false, delegationDepth: 0 }),
  line('user/message', { id: 'u1', role: 'user', content: [{ type: 'text', text: '你好' }], source: { kind: 'user' } }, 10),
  line('user/message', { id: 'c1', role: 'user', content: [{ type: 'text', text: '时间快照' }], source: { kind: 'time-context' } }, 11),
  line('assistant/message', { turn: 1, step: 1, message: { id: 'a1', role: 'assistant', content: [{ type: 'reasoning', text: '想' }], source: { kind: 'model' } } }, 12),
  line('user/message', { id: 'c2', role: 'user', content: [{ type: 'text', text: '又一个快照' }], source: { kind: 'runtime-context' } }, 13),
  line('assistant/message', { turn: 1, step: 2, message: { id: 'a2', role: 'assistant', content: [{ type: 'reasoning', text: '一想' }, { type: 'text', text: '答' }], source: { kind: 'model' } } }, 14),
  JSON.stringify({ type: 'session/title', seq: 9, time: 15, data: { title: '测试会话' } }),
].join('\n')

test('导入：上下文注入不打断合并，回答与提问交替', () => {
  const session = parseSessionLog(log, 'fallback')
  assert.equal(session.title, '测试会话')
  assert.deepEqual(session.messages.map(message => message.role), ['user', 'assistant'])
  assert.equal(session.messages[0].content, '你好')
  assert.deepEqual(session.messages[1].blocks.map(block => block.type), ['thinking', 'text'])
})

test('导入：子代理会话不导入', () => {
  const head = JSON.stringify({ type: 'session', version: 4, id: 's2', createdAt: 1, cwd: 'C:/x', isSeeded: false, delegationDepth: 2 })
  assert.equal(parseSessionLog(head, 'x'), undefined)
})

test('导入：多帧 zstd 逐帧解压', () => {
  const frame = text => zlib.zstdCompressSync(Buffer.from(text))
  const buffer = Buffer.concat([frame('第一帧\n'), frame('第二帧\n')])
  assert.equal(decompressSessionLog(buffer), '第一帧\n第二帧\n')
})

test('导入暂存：旧操作的确认不会删除后来生成的新暂存', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-import-'))
  try {
    const session = { id: 's1', title: '测试', createdAt: 1, updatedAt: 2, messages: [] }
    const first = stageImport(home, session)
    assert.equal(listPending(home).length, 1)
    assert.equal(listPending(home)[0].importId, first.importId)

    const second = stageImport(home, session)
    assert.notEqual(second.importId, first.importId)
    assert.deepEqual(ackPending(home, [{ id: 's1', importId: first.importId }]), [])
    assert.deepEqual(ackPending(home, ['s1']), [])
    assert.equal(listPending(home).length, 1)

    assert.deepEqual(ackPending(home, [{ id: 's1', importId: second.importId }]), ['s1'])
    assert.equal(listPending(home).length, 0)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('导入暂存：确认不接受越出暂存目录的 id', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-import-'))
  try {
    // 暂存目录之外放一个诱饵：越界删除会把它带走。
    // 它必须**没有 importId**——这才是越界守卫真正要挡的形态：
    // 带 importId 的确认会被「标识不匹配」顺手挡掉，测不出守卫。
    const outside = path.join(home, 'settings.json')
    fs.writeFileSync(outside, JSON.stringify({ theme: 'dark' }))
    stageImport(home, { id: 's1', title: '测试', createdAt: 1, updatedAt: 2, messages: [] })

    const attacks = [
      '../settings',
      '..\\settings',
      '../../settings',
      './../settings',
      'sub/../../settings',
      '..',
      '.',
      '',
      '. .',
      'settings.',
      'settings ',
      'a\0b',
    ]
    for (const id of attacks) {
      // 不带 importId：旧面板的确认形态，也正是越界删除可利用的入口。
      assert.deepEqual(ackPending(home, [id]), [], `不该删除：${JSON.stringify(id)}`)
      assert.deepEqual(ackPending(home, [{ id }]), [], `不该删除：${JSON.stringify({ id })}`)
      assert.equal(fs.existsSync(outside), true, `暂存目录外的文件被删了：${JSON.stringify(id)}`)
    }
    assert.equal(listPending(home).length, 1, '正常暂存不该被误删')

    // 正常 id 仍然可删，说明守卫没有把功能一起关掉。
    const pending = listPending(home)[0]
    assert.deepEqual(ackPending(home, [{ id: 's1', importId: pending.importId }]), ['s1'])
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

