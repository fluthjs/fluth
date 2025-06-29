import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, buffer } from '../../index'

describe('buffer operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('basic usage', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    source$.next(1)
    source$.next(2)
    source$.next(3)
    expect(consoleSpy).not.toHaveBeenCalled()

    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer values:', [1, 2, 3])

    // 发送更多值
    source$.next(4)
    source$.next(5)
    trigger$.next('trigger again')

    // 应该发出新收集的值 [4, 5]
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'buffer values:', [4, 5])
  })

  test('empty buffer', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer values:', [])
  })

  test('source finish', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    source$.next(1)
    source$.next(2)

    expect(consoleSpy).not.toHaveBeenCalled()
    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer values:', [1, 2])
  })

  test('test trigger with finish', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.afterComplete(() => console.log('buffer finish'))
    trigger$.next('trigger', true)

    // 应该发出收集的值 [1, 2, 3]
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer finish')
  })

  test('test source with error', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then(
      (values) => console.log('buffer values:', values),
      (error) => console.log('buffer error:', error),
    )

    source$.next(1)
    source$.next(2)
    source$.next(Promise.reject('source error'))

    await sleep(1)

    trigger$.next('trigger')

    expect(consoleSpy).toHaveBeenCalledWith('buffer values:', [1, 2])
  })

  test('test large buffer', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer length:', values.length)
    })

    const largeCount = 1000
    for (let i = 0; i < largeCount; i++) {
      source$.next(i)
    }

    trigger$.next('trigger')

    await sleep(10)

    // 应该发出包含所有值的数组
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer length:', largeCount)
  })

  test('test continuous trigger', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    // 发送一个值
    source$.next(1)

    // 快速连续触发
    trigger$.next('trigger1')
    // 等待处理完成
    await sleep(10)
    // 应该发出 [1]
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer values:', [1])

    // 立即再次触发，此时缓冲区应该是空的
    trigger$.next('trigger2')
    // 等待处理完成
    await sleep(10)
    // 应该发出 []
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'buffer values:', [])
  })
})
