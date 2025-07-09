import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, delay } from '../../index'

describe('delay operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test delay operator', async () => {
    const stream$ = $()
    const delayedStream$ = stream$.pipe(delay(100))

    delayedStream$.then((value) => {
      console.log('delayed:', value)
    })

    stream$.next('test')

    // Should not emit immediately
    expect(consoleSpy).not.toHaveBeenCalled()

    // Should emit after delay
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'delayed:', 'test')
  })

  test('test delay with multiple values', async () => {
    const stream$ = $()
    const delayedStream$ = stream$.pipe(delay(50))

    delayedStream$.then((value) => {
      console.log('delayed:', value)
    })

    stream$.next(1)
    await sleep(25)
    stream$.next(2)
    await sleep(25)

    // First value should not emit because stream emit new value
    // unexecuted child observable node will stop execute and wait new stream value
    expect(consoleSpy).not.toHaveBeenCalled()

    await sleep(25)
    // Second value should emit
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'delayed:', 2)
  })

  test('test delay with rejected promise', async () => {
    const stream$ = $()
    const delayedStream$ = stream$.pipe(delay(50))

    delayedStream$.then(
      (value) => console.log('resolved:', value),
      (error) => console.log('rejected:', error),
    )

    stream$.next(Promise.reject('error'))

    await sleep(50)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'rejected:', 'error')
  })

  test('test delay with unsubscribe', async () => {
    const stream$ = $()
    const delayedStream$ = stream$.pipe(delay(100))

    delayedStream$.then((value) => {
      console.log('delayed:', value)
    })

    stream$.next('test')
    await sleep(50)

    // Unsubscribe before delay completes
    delayedStream$.unsubscribe()
    await sleep(100)

    // Should not emit
    expect(consoleSpy).not.toHaveBeenCalled()
  })
})
