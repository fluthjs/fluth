import { expect, describe, test, vi, beforeEach } from 'vitest'
import { sleep, consoleSpy } from '../utils'
import { $, PromiseStatus } from '../../index'

describe('Stream constructor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test Stream with boundary value', async () => {
    const promise$ = $(0)
    expect(promise$.value).toBe(0)
    const promise1$ = $(undefined)
    expect(promise1$.value).toBe(undefined)
    const promise2$ = $(null)
    expect(promise2$.value).toBe(null)
    const promise3$ = $(false)
    expect(promise3$.value).toBe(false)
  })

  test('test stream base work', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 100)
    })
    const promise$ = $()
    promise$.then((value) => {
      console.log(value)
    })
    promise$.next(promise)

    await sleep(150)

    expect(consoleSpy).toHaveBeenNthCalledWith(1, true)
  })

  test('should create stream with synchronous value and set resolved status', () => {
    const stream$ = $('sync-value')
    expect(stream$.value).toBe('sync-value')
    expect(stream$.status).toBe(PromiseStatus.RESOLVED)
    expect(stream$._getProtectedProperty('_v')).toBe('sync-value')
  })

  test('should create stream with Promise data and handle asynchronously', async () => {
    const promise = Promise.resolve('async-value')
    const stream$ = $(promise)

    // Initially should be pending since it's processing promise
    expect(stream$.status).toBe(PromiseStatus.PENDING)

    stream$.then((value) => {
      console.log('resolved:', value)
    })

    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolved:', 'async-value')
  })

  test('should create stream with rejected Promise and handle rejection', async () => {
    const rejectedPromise = Promise.reject('error-value')
    const stream$ = $(rejectedPromise)

    stream$.then(undefined, (error) => console.log('rejected:', error))

    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'rejected:', 'error-value')
  })

  test('should create stream with custom thenable and handle correctly', async () => {
    const customThenable = {
      then: (onFulfilled: any) => {
        setTimeout(() => onFulfilled('custom-thenable-value'), 50)
      },
    }

    const stream$ = $(customThenable)
    stream$.then((value) => {
      console.log('custom:', value)
    })

    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'custom:', 'custom-thenable-value')
  })

  test('should handle Promise that resolves to another Promise', async () => {
    const innerPromise = Promise.resolve('inner-value')
    const outerPromise = Promise.resolve(innerPromise)
    const stream$ = $(outerPromise)

    stream$.then((value) => {
      console.log('nested:', value)
    })

    await vi.runAllTimersAsync()
    // Promise.resolve automatically unwraps nested promises
    expect(consoleSpy).toHaveBeenCalledWith('nested:', 'inner-value')
  })

  test('should work with async/await pattern', async () => {
    const asyncFunction = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return 'async-result'
    }

    const stream$ = $(asyncFunction())
    stream$.then((value) => {
      console.log('async-await:', value)
    })

    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'async-await:', 'async-result')
  })

  test('should handle immediate vs delayed execution correctly', async () => {
    // Synchronous value - should be immediately available
    const syncStream$ = $('immediate')
    expect(syncStream$.value).toBe('immediate')
    expect(syncStream$.status).toBe(PromiseStatus.RESOLVED)

    // Asynchronous value - should be pending initially
    const asyncStream$ = $(Promise.resolve('delayed'))
    expect(asyncStream$.status).toBe(PromiseStatus.PENDING)
    expect(asyncStream$.value).toBeUndefined()

    await vi.runAllTimersAsync()
    expect(asyncStream$.status).toBe(PromiseStatus.RESOLVED)
    expect(asyncStream$.value).toBe('delayed')
  })

  test('should handle edge case: empty stream constructor', () => {
    const emptyStream$ = $()
    expect(emptyStream$.value).toBeUndefined()
    expect(emptyStream$.status).toBe(PromiseStatus.RESOLVED)
  })

  test('should handle edge case: falsy promises', async () => {
    const falsyPromise = Promise.resolve(0)
    const stream$ = $(falsyPromise)

    stream$.then((value) => {
      console.log('falsy-promise:', value)
    })

    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'falsy-promise:', 0)
  })
})
