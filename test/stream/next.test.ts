import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $ } from '../../index'

describe('Stream next method', () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test stream execute order with wait', async () => {
    const promise$ = $()

    promise$.then(
      (r) => console.log('resolve', r),
      (e) => console.log('reject', e),
    )

    promise$.next(1)
    promise$.next(Promise.reject(2))
    await vi.runAllTimersAsync()
    promise$.next(3)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'reject', 2)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'resolve', 3)
  })

  test('test stream execute order without wait', async () => {
    const promise$ = $()
    promise$.then(
      (r) => console.log('resolve', r),
      (e) => console.log('reject', e),
    )
    promise$.next(1)
    promise$.next(Promise.resolve(2))
    promise$.next(3)
    promise$.next(Promise.reject(4))
    await vi.runAllTimersAsync()

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolve', 3)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'reject', 4)
  })

  test('test stream finish', async () => {
    const promise$ = $()
    promise$.then((value) => console.log(value))
    promise$.next(Promise.resolve('1'))
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, '1')
    promise$.next(Promise.resolve('2'), true)
    await sleep(10)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, '2')
    promise$.next(Promise.resolve('3'))
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })
})
