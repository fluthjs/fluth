import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, delayNode, consoleNode } from '../../index'

describe('plugins test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test delay and consoleNode', async () => {
    const promise$ = $().use(delayNode(100), consoleNode())

    promise$
      .then((value) => value + 1)
      .use(delayNode(100), consoleNode())
      .then((value) => value + 1)
      .use(delayNode(100), consoleNode())
    promise$.next(1)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 1)
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolve', 2)
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'resolve', 3)
  })

  test('test delayute plugin', async () => {
    const stream$ = $()
    stream$.use(delayNode(100))
    stream$.then((value) => {
      console.log(value)
    })

    stream$.next(1)
    await sleep(99)
    expect(consoleSpy).not.toHaveBeenCalled()
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenCalledWith(1)
  })

  test('test delayNode should pass through upstream promise reject', async () => {
    const stream$ = $().use(delayNode(100))
    const child$ = stream$.then(
      (value) => console.log('resolve', value),
      (error) => console.log('reject', error),
    )

    stream$.next(Promise.reject('error'))
    await sleep(0)
    expect(stream$.status).toBe('rejected')
    expect(stream$.value).toBe('error')
    expect(consoleSpy).toHaveBeenCalledWith('reject', 'error')
    expect(child$.status).toBe('resolved')
  })

  test('test delayNode unsubscribe should clear pending timers and skip callback', async () => {
    vi.clearAllTimers()
    const stream$ = $<number>().use(delayNode(1000))
    const callback = vi.fn()
    stream$.then(callback)

    stream$.next(1)
    await sleep(10)
    stream$.next(2)
    expect(vi.getTimerCount()).toBe(2)

    stream$.unsubscribe()
    expect(vi.getTimerCount()).toBe(0)

    await sleep(2000)
    expect(callback).not.toHaveBeenCalled()
  })

  test('test delayNode unsubscribe before upstream promise settles should not schedule timer', async () => {
    vi.clearAllTimers()
    let resolveUpstream!: (value: number) => void
    const upstream = new Promise<number>((resolve) => {
      resolveUpstream = resolve
    })

    const stream$ = $<number>().use(delayNode(1000))
    const callback = vi.fn()
    stream$.then(callback)

    stream$.next(upstream)
    stream$.unsubscribe()

    resolveUpstream(42)
    await Promise.resolve()
    await Promise.resolve()

    expect(vi.getTimerCount()).toBe(0)
    await sleep(2000)
    expect(callback).not.toHaveBeenCalled()
  })
})
