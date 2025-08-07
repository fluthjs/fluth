import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, promiseFactory, setTimeoutSleep } from '../utils'
import { $, PromiseStatus } from '../../index'

describe('Observable then method', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('test observer reject', async () => {
    const promise = Promise.resolve()
    const promise$ = $()
    const observer1 = () => promiseFactory(100, 'observer1').then((value) => Promise.reject(value))
    promise$.then(observer1).then(
      () => console.log('resolve'),
      () => console.log('reject'),
    )
    promise$.next(promise)
    await sleep(110)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'reject')
  })

  test('test observer chain then reject', async () => {
    const promise$ = $()
    promise$.then((value) => console.log(value)).then((value) => console.log(value))
    promise$.next(Promise.resolve())
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenCalledTimes(2)
    promise$.next(Promise.reject())
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test observer then without onFulfilled and onRejected', async () => {
    // then without onFulfilled and onRejected only bypass resolve value
    const promise$ = $()
    promise$.then().then(
      (value) => console.log(value),
      (error) => console.log(error),
    )

    promise$.next('resolve')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve')
    consoleSpy.mockClear()
    promise$.next(Promise.reject('error'))
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'error')
  })

  test('test observer then with throw error', async () => {
    const promise$ = $()
    const observable$ = promise$.then(() => {
      throw new Error('error')
    })
    promise$.next(Promise.resolve())
    await vi.runAllTimersAsync()
    expect(observable$.status).toEqual(PromiseStatus.REJECTED)
    expect(observable$.value).toEqual(new Error('error'))
  })

  // ========== New test cases for error handling improvements ==========

  test('test error propagation through chain without reject handlers', async () => {
    const promise$ = $()
    const results: any[] = []

    // Create a chain where middle nodes don't have reject handlers
    const obs1 = promise$.then((value) => {
      results.push('obs1-resolve')
      return value
    })

    const obs2 = obs1.then(() => {
      results.push('obs2-resolve')
      throw new Error('obs2-error')
    })

    // This node has no reject handler - should skip execution but propagate error
    const obs3 = obs2.then((_value) => {
      results.push('obs3-resolve')
      return _value
    })

    // Final node with reject handler
    const obs4 = obs3.then(
      (value) => {
        results.push('obs4-resolve')
        return value
      },
      (error) => {
        results.push('obs4-reject')
        return error
      },
    )

    promise$.next('initial')
    await vi.runAllTimersAsync()

    expect(results).toEqual(['obs1-resolve', 'obs2-resolve', 'obs4-reject'])
    expect(obs2.status).toEqual(PromiseStatus.REJECTED)
    expect(obs3.status).toEqual(PromiseStatus.REJECTED)
    expect(obs3.value).toBe(undefined) // Should not change value
    expect(obs4.status).toEqual(PromiseStatus.RESOLVED) // Handled the error
  })

  test('test error bypass with presetValue mechanism', async () => {
    const promise$ = $()
    const results: any[] = []

    // Create a chain with mixed error handling
    const obs1 = promise$.then(() => {
      results.push('obs1')
      throw new Error('upstream-error')
    })

    // Node without reject handler - should skip but pass error downstream
    const obs2 = obs1.then((value) => {
      results.push('obs2-resolve') // Should not execute
      return value
    })

    // Node with reject handler - should receive the bypassed error
    const obs3 = obs2.then(
      (value) => {
        results.push('obs3-resolve') // Should not execute
        return value
      },
      (error) => {
        results.push('obs3-reject')
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('upstream-error')
        return 'error-handled'
      },
    )

    promise$.next('start')
    await vi.runAllTimersAsync()

    expect(results).toEqual(['obs1', 'obs3-reject'])
    expect(obs1.status).toEqual(PromiseStatus.REJECTED)
    expect(obs2.status).toEqual(PromiseStatus.REJECTED)
    expect(obs2.value).toBe(undefined) // Should not change value
    expect(obs3.status).toEqual(PromiseStatus.RESOLVED)
    expect(obs3.value).toBe('error-handled')
  })

  test('test complex error propagation with multiple reject handlers', async () => {
    const promise$ = $()
    const errorLog: string[] = []

    // Multi-level error handling chain
    const obs1 = promise$.then(() => {
      throw new Error('level1-error')
    })

    const obs2 = obs1.then(
      (value) => value,
      () => {
        errorLog.push('level1-caught')
        throw new Error('level2-error') // Re-throw different error
      },
    )

    const obs3 = obs2.then((_value) => {
      errorLog.push('level2-resolve') // Should not execute
      return _value
    })

    const obs4 = obs3.then(
      (_value) => _value,
      (error) => {
        errorLog.push('level2-caught')
        expect(error.message).toBe('level2-error')
        return 'final-result'
      },
    )

    promise$.next('trigger')
    await vi.runAllTimersAsync()

    expect(errorLog).toEqual(['level1-caught', 'level2-caught'])
    expect(obs1.status).toEqual(PromiseStatus.REJECTED)
    expect(obs2.status).toEqual(PromiseStatus.REJECTED)
    expect(obs3.status).toEqual(PromiseStatus.REJECTED)
    expect(obs3.value).toBe(undefined) // Should not change value
    expect(obs4.status).toEqual(PromiseStatus.RESOLVED)
    expect(obs4.value).toBe('final-result')
  })

  test('test async error in then callback propagation', async () => {
    const promise$ = $()
    const events: string[] = []

    const obs1 = promise$.then(async () => {
      events.push('obs1-start')
      await setTimeoutSleep(10)
      throw new Error('async-error')
    })

    const obs2 = obs1.then((value) => {
      events.push('obs2-resolve') // Should not execute
      return value
    })

    const obs3 = obs2.then(
      () => events.push('obs3-resolve'),
      (error) => {
        events.push('obs3-reject')
        expect(error.message).toBe('async-error')
      },
    )

    promise$.next('start')
    await sleep(1) // Wait for initial execution
    expect(events).toEqual(['obs1-start'])
    expect(obs1.status).toEqual(PromiseStatus.PENDING)

    await sleep(15) // Wait for async error
    expect(events).toEqual(['obs1-start', 'obs3-reject'])
    expect(obs1.status).toEqual(PromiseStatus.REJECTED)
    expect(obs2.status).toEqual(PromiseStatus.REJECTED)
    expect(obs3.status).toEqual(PromiseStatus.RESOLVED)
  })

  test('test error handling with condition and differ functions', async () => {
    const promise$ = $()
    const results: any[] = []

    // Test error propagation with condition function
    const obs1 = promise$.then(() => {
      throw new Error('conditional-error')
    })

    const obs2 = obs1.then(
      (value) => {
        results.push('obs2-resolve')
        return value
      },
      () => {
        results.push('obs2-reject')
        return 'handled'
      },
      (value) => value === 'handled', // condition function
    )

    const obs3 = obs2.then((value) => {
      results.push(`obs3-${value}`)
      return value
    })

    promise$.next('trigger')
    await vi.runAllTimersAsync()

    expect(results).toEqual(['obs2-reject', 'obs3-handled'])
    expect(obs3.value).toBe('handled')
  })

  test('test error state consistency during unsubscribe', async () => {
    const promise$ = $()
    const cleanup: string[] = []

    const obs1 = promise$.then(() => {
      throw new Error('error-during-unsubscribe')
    })

    obs1.afterUnsubscribe(() => {
      cleanup.push('obs1-cleanup')
    })

    const obs2 = obs1.then(
      (value) => value,
      () => {
        cleanup.push('obs2-error-handled')
        obs1.unsubscribe() // Trigger unsubscribe during error handling
        return 'recovered'
      },
    )

    obs2.afterUnsubscribe(() => {
      cleanup.push('obs2-cleanup')
    })

    promise$.next('trigger')
    await vi.runAllTimersAsync()

    expect(cleanup).toContain('obs2-error-handled')
    expect(cleanup).toContain('obs1-cleanup')
    expect(obs1.status).toEqual(PromiseStatus.REJECTED)
    expect(obs1._getProtectedProperty('_unsubscribeFlag')).toBe(true)
  })

  test('test presetValue parameter propagation in error scenarios', async () => {
    const promise$ = $()
    const propagationLog: any[] = []

    // Create a scenario where presetValue needs to be propagated
    const obs1 = promise$.then(() => {
      propagationLog.push('obs1-execute')
      throw new Error('preset-test-error')
    })

    // Multiple nodes without reject handlers
    const obs2 = obs1.then((value) => {
      propagationLog.push('obs2-resolve')
      return value + '-obs2'
    })

    const obs3 = obs2.then((value) => {
      propagationLog.push('obs3-resolve')
      return value + '-obs3'
    })

    // Final handler that should receive the original error via presetValue
    const obs4 = obs3.then(
      () => propagationLog.push('obs4-resolve'),
      (error) => {
        propagationLog.push('obs4-reject')
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('preset-test-error')
        return 'error-caught-at-obs4'
      },
    )

    promise$.next('start')
    await vi.runAllTimersAsync()

    expect(propagationLog).toEqual(['obs1-execute', 'obs4-reject'])
    expect(obs1.status).toEqual(PromiseStatus.REJECTED)
    expect(obs2.status).toEqual(PromiseStatus.REJECTED)
    expect(obs3.status).toEqual(PromiseStatus.REJECTED)
    expect(obs4.status).toEqual(PromiseStatus.RESOLVED)
    expect(obs4.value).toBe('error-caught-at-obs4')
  })

  test('test mixed sync and async error propagation', async () => {
    const promise$ = $()
    const executionOrder: string[] = []

    const obs1 = promise$.then(() => {
      executionOrder.push('obs1-sync')
      throw new Error('sync-error')
    })

    const obs2 = obs1.then(
      () => executionOrder.push('obs2-resolve'),
      async () => {
        executionOrder.push('obs2-async-start')
        await sleep(5)
        executionOrder.push('obs2-async-end')
        throw new Error('async-error')
      },
    )

    const obs3 = obs2.then((value) => {
      executionOrder.push('obs3-resolve')
      return value
    })

    const obs4 = obs3.then(
      () => executionOrder.push('obs4-resolve'),
      (error) => {
        executionOrder.push('obs4-reject')
        expect(error.message).toBe('async-error')
        return 'final'
      },
    )

    promise$.next('start')
    await vi.runAllTimersAsync()
    expect(executionOrder).toEqual(['obs1-sync', 'obs2-async-start'])

    await sleep(10)
    expect(executionOrder).toEqual([
      'obs1-sync',
      'obs2-async-start',
      'obs2-async-end',
      'obs4-reject',
    ])
    expect(obs4.value).toBe('final')
  })

  test('test error boundary with root promise changes', async () => {
    const promise$ = $()
    const results: string[] = []

    const obs1 = promise$.then(() => {
      results.push('obs1')
      throw new Error('error1')
    })

    const obs2 = obs1.then(
      () => results.push('obs2-resolve'),
      () => {
        results.push('obs2-reject')
        return 'handled'
      },
    )

    // First execution
    promise$.next('first')
    await vi.runAllTimersAsync()
    expect(results).toEqual(['obs1', 'obs2-reject'])
    expect(obs2.value).toBe('handled')

    // Second execution with different root promise
    results.length = 0
    promise$.next('second')
    await vi.runAllTimersAsync()
    expect(results).toEqual(['obs1', 'obs2-reject'])
    expect(obs2.value).toBe('handled')
  })
})
