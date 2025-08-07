import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, throttle } from '../../index'

describe('throttle operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test throttle operator', async () => {
    const stream$ = $()
    const throttledStream$ = stream$.pipe(throttle(100))

    throttledStream$.then((value) => {
      console.log('throttled:', value)
    })

    // First emission should pass through immediately
    stream$.next(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'throttled:', 1)

    // Rapid emissions within throttle period
    await sleep(30)
    stream$.next(2)
    await sleep(30)
    stream$.next(3)
    await sleep(30)

    // Should still only have the first emission
    expect(consoleSpy).toHaveBeenCalledTimes(1)

    // Wait for throttle period to complete
    await sleep(10)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'throttled:', 3)
  })

  test('test throttle with multiple bursts', async () => {
    const stream$ = $()
    const throttledStream$ = stream$.pipe(throttle(100))

    throttledStream$.then((value) => {
      console.log(value)
    })

    await sleep(30)
    stream$.next(1)
    await sleep(30)
    stream$.next(2)
    await sleep(30)
    await sleep(30)
    stream$.next(3)
    await sleep(30)
    stream$.next(4)
    await sleep(30)
    stream$.next(5)
    await sleep(30)
    stream$.next(6)
    await sleep(30)
    stream$.next(7)
    await sleep(89)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 3)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 6)
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 7)
  })

  test('test throttle with long intervals', async () => {
    const stream$ = $()
    const throttledStream$ = stream$.pipe(throttle(50))

    throttledStream$.then((value) => {
      console.log('spaced:', value)
    })

    stream$.next('first')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'spaced:', 'first')

    // Wait longer than throttle period
    await sleep(100)
    stream$.next('second')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'spaced:', 'second')

    await sleep(100)
    stream$.next('third')
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'spaced:', 'third')
  })

  test('test throttle with rejected promises', async () => {
    const stream$ = $()
    const throttledStream$ = stream$.pipe(throttle(100))

    throttledStream$.then(
      (value) => console.log('resolved:', value),
      (error) => console.log('rejected:', error),
    )

    // First emission should pass through
    stream$.next(Promise.reject('error1'))
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'rejected:', 'error1')

    // Rapid emissions within throttle period
    await sleep(30)
    stream$.next(Promise.reject('error2'))
    await sleep(30)
    stream$.next('success')

    // Wait for throttle period
    await sleep(40)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolved:', 'success')
  })

  test('test throttle with zero throttle time', () => {
    const stream$ = $()
    const throttledStream$ = stream$.pipe(throttle(0))

    throttledStream$.then((value) => {
      console.log('immediate:', value)
    })

    // All emissions should pass through immediately
    stream$.next(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'immediate:', 1)

    stream$.next(2)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'immediate:', 2)

    stream$.next(3)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'immediate:', 3)
  })

  test('test throttle with unsubscribe', async () => {
    const stream$ = $()
    const throttledStream$ = stream$.pipe(throttle(100))

    throttledStream$.then((value) => {
      console.log('throttled:', value)
    })

    stream$.next(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'throttled:', 1)

    // Emit and then unsubscribe before throttle completes
    await sleep(30)
    stream$.next(2)
    throttledStream$.unsubscribe()

    await sleep(100)
    // Should not emit the throttled value after unsubscribe
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })
})
