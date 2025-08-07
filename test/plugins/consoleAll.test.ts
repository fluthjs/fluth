import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, debounce, consoleAll, PromiseStatus } from '../../index'

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

    // Test with undefined - should be ignored due to ignoreUndefined=true (default)
    stream$.next(undefined)
    // undefined should not be logged due to default ignoreUndefined=true

    // Test with empty string
    stream$.next('')
    expect(consoleSpy).toHaveBeenCalledWith('resolve', '')

    // Test with zero
    stream$.next(0)
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 0)

    // Test with false
    stream$.next(false)
    expect(consoleSpy).toHaveBeenCalledWith('resolve', false)

    expect(consoleSpy).toHaveBeenCalledTimes(4) // undefined is ignored
  })

  test('test consoleAll plugin returns original result', async () => {
    const plugin = consoleAll()

    // Test synchronous value with root=true (should log)
    const syncResult = plugin.executeAll({
      result: 'sync-value',
      status: PromiseStatus.RESOLVED,
      root: true,
    })
    expect(syncResult).toBe('sync-value')
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 'sync-value')

    // Test Promise value with root=true (should log)
    const promiseValue = Promise.resolve('async-value')
    const asyncResult = plugin.executeAll({
      result: promiseValue,
      status: PromiseStatus.RESOLVED,
      root: true,
    })
    expect(asyncResult).toBe(promiseValue)

    await promiseValue
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 'async-value')
    expect(consoleSpy).toHaveBeenCalledTimes(2)

    // Test with root=false and no onfulfilled/onrejected (should skip logging)
    const skipResult = plugin.executeAll({
      result: 'skip-value',
      status: PromiseStatus.RESOLVED,
      root: false,
    })
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

  test('test consoleAll plugin with new status parameter and improved skip logic', async () => {
    const plugin = consoleAll()

    // Test 1: Root node always logs regardless of status
    const rootResult = plugin.executeAll({
      result: 'root-value',
      status: PromiseStatus.REJECTED,
      root: true,
      onfulfilled: undefined,
      onrejected: undefined,
    })
    expect(rootResult).toBe('root-value')
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 'root-value')

    // Test 2: Non-root with onfulfilled always logs
    const withFulfilledResult = plugin.executeAll({
      result: 'fulfilled-value',
      status: PromiseStatus.RESOLVED,
      root: false,
      onfulfilled: vi.fn(),
      onrejected: undefined,
    })
    expect(withFulfilledResult).toBe('fulfilled-value')
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 'fulfilled-value')

    // Test 3: Non-root with onrejected and REJECTED status should log
    const rejectedWithHandlerResult = plugin.executeAll({
      result: 'rejected-handled-value',
      status: PromiseStatus.REJECTED,
      root: false,
      onfulfilled: undefined,
      onrejected: vi.fn(),
    })
    expect(rejectedWithHandlerResult).toBe('rejected-handled-value')
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 'rejected-handled-value')

    // Test 4: Non-root with onrejected but NOT REJECTED status should skip
    const rejectedHandlerResolvedResult = plugin.executeAll({
      result: 'should-skip-value',
      status: PromiseStatus.RESOLVED,
      root: false,
      onfulfilled: undefined,
      onrejected: vi.fn(),
    })
    expect(rejectedHandlerResolvedResult).toBe('should-skip-value')
    expect(consoleSpy).toHaveBeenCalledTimes(3) // No new calls

    // Test 5: Non-root with no handlers should skip
    const noHandlersResult = plugin.executeAll({
      result: 'should-skip-value-2',
      status: PromiseStatus.RESOLVED,
      root: false,
      onfulfilled: undefined,
      onrejected: undefined,
    })
    expect(noHandlersResult).toBe('should-skip-value-2')
    expect(consoleSpy).toHaveBeenCalledTimes(3) // No new calls

    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })

  test('test consoleAll with ignoreUndefined default behavior', async () => {
    const stream$ = $()
    stream$.use(consoleAll()) // ignoreUndefined defaults to true

    // Test synchronous undefined value - should be ignored
    stream$.next(undefined)
    expect(consoleSpy).not.toHaveBeenCalled()

    // Test non-undefined value - should be logged
    stream$.next('test-value')
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 'test-value')

    // Test Promise that resolves to undefined - should be ignored
    const resolveUndefinedPromise = Promise.resolve(undefined)
    stream$.next(resolveUndefinedPromise)
    await resolveUndefinedPromise
    expect(consoleSpy).toHaveBeenCalledTimes(1) // Only the 'test-value' call

    // Test Promise that rejects with undefined - should be ignored
    const rejectUndefinedPromise = Promise.reject(undefined)
    stream$.next(rejectUndefinedPromise)
    try {
      await rejectUndefinedPromise
    } catch {
      // Expected to reject
    }
    expect(consoleSpy).toHaveBeenCalledTimes(1) // Still only the 'test-value' call
  })

  test('test consoleAll with ignoreUndefined set to false', async () => {
    const stream$ = $()
    stream$.use(consoleAll('resolve', 'reject', false)) // ignoreUndefined = false

    // Test synchronous undefined value - should be logged
    stream$.next(undefined)
    expect(consoleSpy).toHaveBeenCalledWith('resolve', undefined)

    // Test Promise that resolves to undefined - should be logged
    const resolveUndefinedPromise = Promise.resolve(undefined)
    stream$.next(resolveUndefinedPromise)
    await resolveUndefinedPromise
    expect(consoleSpy).toHaveBeenCalledWith('resolve', undefined)

    // Test Promise that rejects with undefined - should be logged
    const rejectUndefinedPromise = Promise.reject(undefined)
    stream$.next(rejectUndefinedPromise)
    try {
      await rejectUndefinedPromise
    } catch {
      // Expected to reject
    }
    expect(consoleSpy).toHaveBeenCalledWith('reject', undefined)

    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })

  test('test consoleAll ignoreUndefined with mixed values', async () => {
    const stream$ = $()
    stream$.use(consoleAll('resolve', 'reject', true)) // ignoreUndefined = true

    // Mix undefined and defined values
    stream$.next(undefined) // should be ignored
    stream$.next(null) // should be logged
    stream$.next(0) // should be logged
    stream$.next('') // should be logged
    stream$.next(false) // should be logged
    stream$.next(undefined) // should be ignored again

    expect(consoleSpy).toHaveBeenCalledWith('resolve', null)
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 0)
    expect(consoleSpy).toHaveBeenCalledWith('resolve', '')
    expect(consoleSpy).toHaveBeenCalledWith('resolve', false)
    expect(consoleSpy).toHaveBeenCalledTimes(4) // undefined values are ignored
  })

  test('test consoleAll ignoreUndefined with custom prefixes', async () => {
    const stream$ = $()
    stream$.use(consoleAll('custom-resolve', 'custom-reject', true))

    // Test undefined with custom prefixes
    stream$.next(undefined) // should be ignored
    stream$.next('valid-value') // should be logged with custom prefix

    const rejectPromise = Promise.reject('error-value')
    stream$.next(rejectPromise)
    try {
      await rejectPromise
    } catch {
      // Expected to reject
    }

    expect(consoleSpy).toHaveBeenCalledWith('custom-resolve', 'valid-value')
    expect(consoleSpy).toHaveBeenCalledWith('custom-reject', 'error-value')
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test consoleAll ignoreUndefined with executeAll direct call', async () => {
    const plugin = consoleAll('resolve', 'reject', true)

    // Test undefined value with root=true (should be ignored)
    const undefinedResult = plugin.executeAll({
      result: undefined,
      status: PromiseStatus.RESOLVED,
      root: true,
    })
    expect(undefinedResult).toBe(undefined)
    expect(consoleSpy).not.toHaveBeenCalled()

    // Test defined value with root=true (should be logged)
    const definedResult = plugin.executeAll({
      result: 'defined-value',
      status: PromiseStatus.RESOLVED,
      root: true,
    })
    expect(definedResult).toBe('defined-value')
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 'defined-value')
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })
  test('test consoleAll with observable node throw error', async () => {
    const stream$ = $().use(consoleAll())
    stream$
      .pipe(debounce(300))
      .then((value) => {
        throw new Error(value + 1)
      })
      .then(undefined, (error: Error) => ({ current: Number(error.message) }))

    stream$.next(1)

    await vi.runAllTimersAsync()

    expect(consoleSpy).toHaveBeenCalledWith('reject', expect.any(Error))
  })
})
