import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, delayExec, debounce, consoleNode } from '../../index'

describe('consoleNode plugins test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test consoleNode plugin', async () => {
    const stream$ = $()
    stream$.use(consoleNode())

    stream$.next(1)
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 1)

    const promise = Promise.resolve(2)
    stream$.next(promise)
    await promise
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 2)

    stream$.next(3)
    stream$.next(4)
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 3)
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 4)
    expect(consoleSpy).toHaveBeenCalledTimes(4)
  })

  test('test remove consoleNode plugin', async () => {
    const plugin = delayExec(100)
    const stream$ = $().use(plugin)
    stream$.then((value) => {
      console.log(value)
    })
    stream$.next(1)
    await sleep(99)
    expect(consoleSpy).not.toHaveBeenCalled()
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledWith(1)
    stream$.remove(plugin)
    stream$.next(2)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test debounce and consoleNode', async () => {
    const promise$ = $()
    promise$
      .pipe(debounce(100))
      .use(consoleNode())
      .then((value) => console.log(value))
    promise$.next(1)
    promise$.next(2)
    promise$.next(3)
    promise$.next(4)
    promise$.next(5) // 打印 5
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolve', 2)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'resolve', 3)
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'resolve', 4)
    expect(consoleSpy).toHaveBeenNthCalledWith(5, 'resolve', 5)
    await sleep(200)
    expect(consoleSpy).toHaveBeenNthCalledWith(6, 'resolve', 5)
    expect(consoleSpy).toHaveBeenNthCalledWith(7, 5)
  })

  test('test consoleNode with custom resolvePrefix', async () => {
    const stream$ = $()
    stream$.use(consoleNode('custom'))

    stream$.next('test')
    expect(consoleSpy).toHaveBeenCalledWith('custom', 'test')

    const promise = Promise.resolve('async-test')
    stream$.next(promise)
    await promise
    expect(consoleSpy).toHaveBeenCalledWith('custom', 'async-test')
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test consoleNode with Promise rejection', async () => {
    const stream$ = $()
    stream$.use(consoleNode())

    const rejectedPromise = Promise.reject(new Error('test error'))
    stream$.next(rejectedPromise)

    try {
      await rejectedPromise
    } catch {
      // Expected to reject
    }

    expect(consoleSpy).toHaveBeenCalledWith('reject', expect.any(Error))
  })

  test('test consoleNode with custom resolvePrefix and rejectPrefix', async () => {
    const stream$ = $()
    stream$.use(consoleNode('success', 'failure'))

    // Test custom resolvePrefix
    stream$.next('test-value')
    expect(consoleSpy).toHaveBeenCalledWith('success', 'test-value')

    // Test custom rejectPrefix
    const rejectedPromise = Promise.reject(new Error('custom error'))
    stream$.next(rejectedPromise)

    try {
      await rejectedPromise
    } catch {
      // Expected to reject
    }

    expect(consoleSpy).toHaveBeenCalledWith('failure', expect.any(Error))
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test consoleNode with edge cases', async () => {
    const stream$ = $()
    stream$.use(consoleNode())

    // Test with null
    stream$.next(null)
    expect(consoleSpy).toHaveBeenCalledWith('resolve', null)

    // Test with undefined
    stream$.next(undefined)
    expect(consoleSpy).toHaveBeenCalledWith('resolve', undefined)

    // Test with empty string
    stream$.next('')
    expect(consoleSpy).toHaveBeenCalledWith('resolve', '')

    // Test with zero
    stream$.next(0)
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 0)

    // Test with false
    stream$.next(false)
    expect(consoleSpy).toHaveBeenCalledWith('resolve', false)

    expect(consoleSpy).toHaveBeenCalledTimes(5)
  })

  test('test consoleNode plugin returns original result', async () => {
    const plugin = consoleNode()

    // Test synchronous value
    const syncResult = plugin.execute({ result: 'sync-value' })
    expect(syncResult).toBe('sync-value')

    // Test Promise value
    const promiseValue = Promise.resolve('async-value')
    const asyncResult = plugin.execute({ result: promiseValue })
    expect(asyncResult).toBe(promiseValue)

    await promiseValue
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 'sync-value')
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 'async-value')
  })
})
