import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, debounce, consoleAll } from '../../index'

describe('consoleAll plugins test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test consoleAll plugin', async () => {
    const stream$ = $()
    stream$.use(consoleAll())

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

  test('test remove consoleAll plugin', async () => {
    const plugin = consoleAll()
    const stream$ = $().use(plugin)
    stream$.then((value) => value + 1)
    stream$.next(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolve', 2)
    stream$.remove(plugin)
    stream$.next(2)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test debounce and consoleAll', async () => {
    const promise$ = $()
    promise$
      .use(consoleAll())
      .pipe(debounce(100))
      .then((value) => value + 1)
    promise$.next(1)
    promise$.next(2)
    promise$.next(3)
    promise$.next(4)
    promise$.next(5)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolve', 2)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'resolve', 3)
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'resolve', 4)
    expect(consoleSpy).toHaveBeenNthCalledWith(5, 'resolve', 5)
    expect(consoleSpy).toHaveBeenCalledTimes(5)
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(6, 'resolve', 6)
  })

  test('test consoleAll with custom resolvePrefix', async () => {
    const stream$ = $()
    stream$.use(consoleAll('custom'))

    stream$.next('test')
    expect(consoleSpy).toHaveBeenCalledWith('custom', 'test')

    const promise = Promise.resolve('async-test')
    stream$.next(promise)
    await promise
    expect(consoleSpy).toHaveBeenCalledWith('custom', 'async-test')
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test consoleAll with Promise rejection', async () => {
    const stream$ = $()
    stream$.use(consoleAll())

    const rejectedPromise = Promise.reject(new Error('test error'))
    stream$.next(rejectedPromise)

    try {
      await rejectedPromise
    } catch {
      // Expected to reject
    }

    expect(consoleSpy).toHaveBeenCalledWith('reject', expect.any(Error))
  })

  test('test consoleAll with custom resolvePrefix and rejectPrefix', async () => {
    const stream$ = $()
    stream$.use(consoleAll('success', 'failure'))

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

  test('test consoleAll with edge cases', async () => {
    const stream$ = $()
    stream$.use(consoleAll())

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

  test('test consoleAll plugin returns original result', async () => {
    const plugin = consoleAll()

    // Test synchronous value with root=true (should log)
    const syncResult = plugin.executeAll({ result: 'sync-value', root: true })
    expect(syncResult).toBe('sync-value')
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 'sync-value')

    // Test Promise value with root=true (should log)
    const promiseValue = Promise.resolve('async-value')
    const asyncResult = plugin.executeAll({ result: promiseValue, root: true })
    expect(asyncResult).toBe(promiseValue)

    await promiseValue
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 'async-value')
    expect(consoleSpy).toHaveBeenCalledTimes(2)

    // Test with root=false and no onfulfilled/onrejected (should skip logging)
    const skipResult = plugin.executeAll({ result: 'skip-value', root: false })
    expect(skipResult).toBe('skip-value')
    // Should not log additional calls
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test consoleAll executeAll vs execute difference', async () => {
    // Test executeAll: should execute on all nodes in the stream chain
    const stream$ = $()
    stream$.use(consoleAll('root'))

    const child1 = stream$.then((value) => value + '-child1')
    child1.then((value) => value + '-child2')

    // When using executeAll, the plugin should execute on all nodes
    stream$.next('test')

    // executeAll plugin from root should execute on all nodes in the chain
    expect(consoleSpy).toHaveBeenCalledWith('root', 'test')
    expect(consoleSpy).toHaveBeenCalledWith('root', 'test-child1')
    expect(consoleSpy).toHaveBeenCalledWith('root', 'test-child1-child2')
    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })

  test('test consoleAll executeAll propagation in stream chain', async () => {
    // Create a stream chain to test executeAll propagation
    const rootStream = $()
    rootStream.use(consoleAll('executeAll'))

    const step1 = rootStream.then((value) => {
      console.log('step1 processing:', value)
      return value * 2
    })

    const step2 = step1.then((value) => {
      console.log('step2 processing:', value)
      return value + 10
    })

    step2.then((value) => {
      console.log('step3 processing:', value)
      return value.toString()
    })

    // Trigger the stream
    rootStream.next(5)

    // executeAll should log at each step of the chain
    expect(consoleSpy).toHaveBeenCalledWith('executeAll', 5) // root
    expect(consoleSpy).toHaveBeenCalledWith('step1 processing:', 5)
    expect(consoleSpy).toHaveBeenCalledWith('executeAll', 10) // step1 result
    expect(consoleSpy).toHaveBeenCalledWith('step2 processing:', 10)
    expect(consoleSpy).toHaveBeenCalledWith('executeAll', 20) // step2 result
    expect(consoleSpy).toHaveBeenCalledWith('step3 processing:', 20)
    expect(consoleSpy).toHaveBeenCalledWith('executeAll', '20') // step3 result
  })
})
