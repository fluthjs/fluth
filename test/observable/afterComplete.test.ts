import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy } from '../utils'
import { $ } from '../../index'

describe('Observable afterComplete and offComplete methods', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('test observer afterComplete', async () => {
    const promise$ = $()
    const promise1$ = promise$.then(() => Promise.resolve('1'))
    promise1$.afterComplete((value) => console.log(`finish1: ${value}`))
    promise1$.afterComplete((value) => console.log(`finish2: ${value}`))
    promise$.next(1, true)
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finish1: 1')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'finish2: 1')
  })

  test('test offComplete', async () => {
    const promise$ = $()
    const promise1$ = promise$.then(() => Promise.resolve('1'))
    const callback1 = (value) => console.log(`finish1: ${value}`)
    const callback2 = (value) => console.log(`finish2: ${value}`)
    const callback3 = (value) => console.log(`finish3: ${value}`)

    promise1$.afterComplete(callback1)
    promise1$.afterComplete(callback2)
    promise1$.afterComplete(callback3)

    promise1$.offComplete(callback2)

    promise$.next(1, true)
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finish1: 1')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'finish3: 1')
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test offComplete with non-existent callback', async () => {
    const promise$ = $()
    const promise1$ = promise$.then(() => Promise.resolve('1'))
    const callback1 = (value) => console.log(`finish1: ${value}`)
    const callback2 = (value) => console.log(`finish2: ${value}`)
    const nonExistentCallback = (value) => console.log(`non-existent: ${value}`)

    promise1$.afterComplete(callback1)
    promise1$.afterComplete(callback2)

    promise1$.offComplete(nonExistentCallback)

    promise$.next(1, true)
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finish1: 1')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'finish2: 1')
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test offComplete when promise is rejected', async () => {
    const promise$ = $()
    const promise1$ = promise$.then(() => Promise.reject('error'))
    const callback1 = (value, status) => console.log(`finish1: ${value}, status: ${status}`)
    const callback2 = (value, status) => console.log(`finish2: ${value}, status: ${status}`)

    promise1$.afterComplete(callback1)
    promise1$.afterComplete(callback2)

    promise1$.offComplete(callback2)

    promise$.next(1, true)
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finish1: error, status: rejected')
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  test('test observer complete and then order', async () => {
    const promise$ = $()
    const promise1$ = promise$.then(() => Promise.resolve())
    promise1$.afterComplete(() => console.log('finish'))
    promise1$.then(() => console.log('then'))
    promise$.next(Promise.resolve(), true)
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finish')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'then')
  })

  test('should ignore afterComplete registered after stream finished', async () => {
    const promise$ = $()
    const promise1$ = promise$.then((v) => v)
    const lateCallback = vi.fn()

    // Finish first
    promise$.next('v', true)
    await vi.runAllTimersAsync()

    // Register afterComplete after finish
    promise1$.afterComplete(lateCallback)

    // Emit again with finish; callback should not be called
    promise$.next('vv', true)
    await vi.runAllTimersAsync()

    expect(lateCallback).not.toHaveBeenCalled()
  })
})
