import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, debounce } from '../../index'

describe('debounce operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test debounce operator', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(100))

    debouncedStream$.then((value) => {
      console.log(value)
    })

    await sleep(60)
    stream$.next(1)
    await sleep(60)
    stream$.next(2)
    await sleep(60)
    stream$.next(3)
    await sleep(60)
    stream$.next(4)
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 4)
  })

  test('test debounce with multiple emissions', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(50))

    debouncedStream$.then((value) => {
      console.log('debounced:', value)
    })

    // Rapid emissions
    stream$.next('a')
    await sleep(20)
    stream$.next('b')
    await sleep(20)
    stream$.next('c')
    await sleep(20)
    stream$.next('d')

    // Wait for debounce
    await sleep(50)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'debounced:', 'd')

    // Another emission after debounce period
    stream$.next('e')
    await sleep(50)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'debounced:', 'e')
  })

  test('test debounce with unsubscribe', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(100))

    debouncedStream$.then((value) => {
      console.log('debounced:', value)
    })

    stream$.next(1)
    await sleep(50)

    // Unsubscribe before debounce completes
    debouncedStream$.unsubscribe()
    await sleep(100)

    // Should not emit
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  // Edge cases and special scenarios

  test('test debounce with zero debounceTime', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(0))

    debouncedStream$.then((value) => {
      console.log('zero-debounce:', value)
    })

    stream$.next('immediate')
    await vi.runAllTimersAsync() // Give it a micro task to execute
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'zero-debounce:', 'immediate')
  })

  test('test debounce with negative debounceTime', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(-100))

    debouncedStream$.then((value) => {
      console.log('negative-debounce:', value)
    })

    stream$.next('negative')
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'negative-debounce:', 'negative')
  })

  test('test debounce with single emission', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(100))

    debouncedStream$.then((value) => {
      console.log('single:', value)
    })

    stream$.next('alone')
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'single:', 'alone')
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  test('test debounce with very large debounceTime', async () => {
    const stream$ = $()
    // 2147483647 is the largest number that can be represented in 32 bits
    const debouncedStream$ = stream$.pipe(debounce(2147483647))

    debouncedStream$.then((value) => {
      console.log('large-time:', value)
    })

    stream$.next('large')
    await sleep(1000) // Should not emit within this time
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('test debounce with falsy values', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(50))
    const results: any[] = []

    debouncedStream$.then((value) => {
      results.push(value)
    })

    // Test various falsy values
    stream$.next(null)
    await sleep(60)
    stream$.next(undefined)
    await sleep(60)
    stream$.next(0)
    await sleep(60)
    stream$.next(false)
    await sleep(60)
    stream$.next('')
    await sleep(60)

    expect(results).toEqual([null, undefined, 0, false, ''])
  })

  test('test debounce with rapid successive emissions', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(100))
    let emissionCount = 0

    debouncedStream$.then((value) => {
      emissionCount++
      console.log('rapid:', value)
    })

    // Emit 100 values rapidly
    for (let i = 0; i < 100; i++) {
      stream$.next(i)
      await sleep(5) // Much less than debounce time
    }

    // Wait for debounce to complete
    await sleep(100)

    // Should only emit the last value once
    expect(emissionCount).toBe(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'rapid:', 99)
  })

  test('test debounce with manual execute during debounce period', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(100))

    debouncedStream$.then((value) => {
      console.log('manual-exec:', value)
    })

    stream$.next('pending')
    await sleep(50) // Half way through debounce

    // Manually trigger execution，delay 100ms
    debouncedStream$.execute()
    expect(consoleSpy).not.toHaveBeenCalled()

    // Wait for original debounce to complete
    await sleep(60)
    expect(consoleSpy).not.toHaveBeenCalled()

    // Should only have been called once
    await sleep(40)
    expect(consoleSpy).toHaveBeenCalledWith('manual-exec:', 'pending')
  })

  test('test debounce error handling', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(50))
    let errorCaught = false

    debouncedStream$.then(
      (value) => {
        console.log('success:', value)
      },
      (error) => {
        errorCaught = true
        console.log('error caught:', error.message)
      },
    )

    // Emit normal value first
    stream$.next('normal')
    await sleep(60)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'success:', 'normal')

    // Emit error-triggering value
    stream$.next(Promise.reject(new Error('Test error')))
    await sleep(60)
    expect(errorCaught).toBe(true)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'error caught:', 'Test error')
  })

  test('test debounce with multiple subscriptions', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(50))
    const results1: any[] = []
    const results2: any[] = []

    // Multiple subscriptions
    debouncedStream$.then((value) => results1.push(value))
    debouncedStream$.then((value) => results2.push(value))

    stream$.next('multi')
    await sleep(60)

    expect(results1).toEqual(['multi'])
    expect(results2).toEqual(['multi'])
  })

  test('test debounce timer cleanup on multiple unsubscribes', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(100))

    debouncedStream$.then((value) => {
      console.log('cleanup:', value)
    })

    stream$.next('cleanup-test')
    await sleep(50)

    // Multiple unsubscribes should not cause issues
    debouncedStream$.unsubscribe()
    debouncedStream$.unsubscribe()
    debouncedStream$.unsubscribe()

    await sleep(60)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('test debounce behavior after unsubscribe', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(50))

    // Subscribe and verify it works
    debouncedStream$.then((value) => {
      console.log('before-unsubscribe:', value)
    })

    stream$.next('before')
    await sleep(60)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'before-unsubscribe:', 'before')

    // Unsubscribe
    debouncedStream$.unsubscribe()

    // After unsubscribe, new emissions should not trigger the subscription
    stream$.next('after')
    await sleep(60)

    // Should still only have one call from before unsubscribe
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  test('test creating new debounce stream after original unsubscribe', async () => {
    const stream$ = $()

    // First debounced stream
    const debouncedStream1$ = stream$.pipe(debounce(50))
    debouncedStream1$.then((value) => {
      console.log('stream-1:', value)
    })

    stream$.next('first')
    await sleep(60)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'stream-1:', 'first')

    // Unsubscribe first stream
    debouncedStream1$.unsubscribe()

    // Create a new debounced stream (this is the correct way to "reuse")
    const debouncedStream2$ = stream$.pipe(debounce(50))
    debouncedStream2$.then((value) => {
      console.log('stream-2:', value)
    })

    stream$.next('second')
    await sleep(60)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'stream-2:', 'second')
  })

  test('test debounce with extremely fast emissions', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(10))
    const results: any[] = []

    debouncedStream$.then((value) => {
      results.push(value)
    })

    // Emit values faster than debounce time
    for (let i = 0; i < 50; i++) {
      stream$.next(i)
      await sleep(1) // Much faster than debounce time
    }

    await sleep(20) // Wait for debounce

    // Should only emit the last value
    expect(results).toEqual([49])
  })

  test('test debounce with intermittent pauses', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(30))
    const results: any[] = []

    debouncedStream$.then((value) => {
      results.push(value)
    })

    // Group 1: rapid emissions
    stream$.next('a')
    await sleep(10)
    stream$.next('b')
    await sleep(10)
    stream$.next('c')
    await sleep(40) // Wait for debounce

    // Group 2: another set after pause
    stream$.next('d')
    await sleep(10)
    stream$.next('e')
    await sleep(40) // Wait for debounce

    expect(results).toEqual(['c', 'e'])
  })

  test('test debounce memory leak prevention', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(100))

    // Create multiple debounced streams and unsubscribe
    for (let i = 0; i < 10; i++) {
      const tempStream$ = stream$.pipe(debounce(50))
      tempStream$.then(() => {
        /* empty subscription for leak testing */
      })
      stream$.next(i)
      await sleep(10)
      tempStream$.unsubscribe()
    }

    // Final test to ensure everything still works
    debouncedStream$.then((value) => {
      console.log('leak-test:', value)
    })

    stream$.next('final')
    await sleep(110)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'leak-test:', 'final')
  })
})
