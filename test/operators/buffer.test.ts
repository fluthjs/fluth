import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, buffer } from '../../index'

describe('buffer operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  // ========== Basic Functionality Tests ==========

  test('should collect values and emit them when trigger fires', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    source$.next(1)
    source$.next(2)
    source$.next(3)
    expect(consoleSpy).not.toHaveBeenCalled()

    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer values:', [1, 2, 3])

    // Send more values
    source$.next(4)
    source$.next(5)
    trigger$.next('trigger again')

    // Should emit the newly collected values [4, 5]
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'buffer values:', [4, 5])
  })

  test('should emit empty buffer when trigger fires without collected values', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer values:', [])
  })

  test('should handle continuous triggers correctly', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    // Send a value
    source$.next(1)

    // Trigger rapidly in succession
    trigger$.next('trigger1')
    // Wait for processing to complete
    await sleep(10)
    // Should emit [1]
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer values:', [1])

    // Trigger again immediately, buffer should be empty now
    trigger$.next('trigger2')
    // Wait for processing to complete
    await sleep(10)
    // Should emit []
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'buffer values:', [])
  })

  test('should continue buffering after each emission', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    // First batch with rejections
    source$.next(1)
    source$.next(Promise.reject('error'))
    source$.next(2)

    trigger$.next('first')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer values:', [1, 2])

    // Second batch with rejections
    source$.next(3)
    source$.next(Promise.reject('another error'))
    source$.next(4)

    trigger$.next('second')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'buffer values:', [3, 4])
  })

  // ========== Edge Cases Tests ==========

  test('should handle large number of values efficiently', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer length:', values.length)
    })

    const largeCount = 1000
    for (let i = 0; i < largeCount; i++) {
      source$.next(i)
    }

    trigger$.next('trigger')

    await sleep(10)

    // Should emit an array containing all values
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer length:', largeCount)
  })

  test('should handle mixed source values with different types', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    // Mix of successful values and rejections
    source$.next(1)
    source$.next(Promise.reject('error'))
    await vi.runAllTimersAsync()
    source$.next(2)
    await vi.runAllTimersAsync()
    source$.next(Promise.resolve(3))
    await vi.runAllTimersAsync()
    source$.next(Promise.reject('another error'))
    await vi.runAllTimersAsync()
    source$.next(4)

    trigger$.next('trigger')

    // Should emit only successfully resolved values [1, 2, 3, 4]
    expect(consoleSpy).toHaveBeenCalledWith('buffer values:', [1, 2, 3, 4])
  })

  // ========== Error Handling Tests ==========

  test('should filter out rejected values from source', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    source$.next(1)
    source$.next(Promise.reject('error')) // This rejection is filtered out

    await vi.runAllTimersAsync()

    trigger$.next('trigger')

    // Should emit only the resolved values [1, 2] (rejection was filtered out)
    expect(consoleSpy).toHaveBeenCalledWith('buffer values:', [1])
  })

  test('should only collect resolved values and ignore rejections', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    source$.next(1)
    source$.next(Promise.reject('error1')) // This will be filtered out
    source$.next(2)
    source$.next(Promise.reject('error2')) // This will be filtered out
    source$.next(3)

    await vi.runAllTimersAsync()

    trigger$.next('trigger')

    // Should only emit resolved values, rejections are filtered out
    expect(consoleSpy).toHaveBeenCalledWith('buffer values:', [1, 2, 3])
  })

  test('should not emit buffer when trigger rejects', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    source$.next(1)
    source$.next(2)

    // Trigger with rejection - should not trigger buffer emission
    trigger$.next(Promise.reject('trigger error'))

    await sleep(10)

    // No emission should happen
    expect(consoleSpy).not.toHaveBeenCalled()

    // Now use a successful trigger
    trigger$.next('success')
    expect(consoleSpy).toHaveBeenCalledWith('buffer values:', [1, 2])
  })

  test('should handle multiple trigger rejections followed by success', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    source$.next(1)
    source$.next(2)

    // Multiple failed triggers
    trigger$.next(Promise.reject('error1'))
    trigger$.next(Promise.reject('error2'))

    await sleep(10)

    // Still no emission
    expect(consoleSpy).not.toHaveBeenCalled()

    // Successful trigger
    trigger$.next('success')
    expect(consoleSpy).toHaveBeenCalledWith('buffer values:', [1, 2])
  })

  // ========== Completion and Cleanup Tests ==========

  test('should keep buffered values when source stream finishes', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    source$.next(1)
    source$.next(2)
    source$.next(3, true)

    // Based on current implementation, source finish doesn't auto-emit buffered values
    expect(consoleSpy).not.toHaveBeenCalled()
    trigger$.next('trigger')

    // Values remain buffered and can still be triggered later
    trigger$.next('trigger after source finish')
    expect(consoleSpy).toHaveBeenCalledWith('buffer values:', [1, 2, 3])
  })

  test('should handle source stream finishing without buffered values', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    // Finish the source stream without any values
    source$.complete()

    // No emission should happen
    expect(consoleSpy).not.toHaveBeenCalled()

    // Trigger after source finish should emit empty buffer
    trigger$.next('trigger after empty source finish')
    expect(consoleSpy).toHaveBeenCalledWith('buffer values:', [])
  })

  test('should complete when trigger finishes', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.afterComplete(() => console.log('buffer finish'))
    trigger$.next('trigger', true)

    // Should emit the collected values and finish
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer finish')
  })

  test('should clean up properly on completion', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    // Send some values
    source$.next(1)
    source$.next(2)

    // Complete the trigger
    trigger$.next('final', true)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer values:', [1, 2])

    // Further values should not cause issues
    source$.next(3)
    // No more emissions should happen
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  // ========== Advanced Features Tests ==========

  test('should wait for pending observable when shouldAwait is true (default)', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$, true)) // shouldAwait=true

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    // Send immediate values
    source$.next(1)
    source$.next(2)

    // Send a promise that takes time to resolve
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('slow-result'), 100)
    })
    source$.next(slowPromise)

    // Trigger immediately - but should wait because there's a pending promise
    trigger$.next('trigger1')
    // No immediate emission because shouldAwait=true and there's a pending promise
    expect(consoleSpy).not.toHaveBeenCalled()

    // Wait for promise to resolve
    await sleep(150)

    // Should now emit all values including the resolved slow promise
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer values:', [1, 2, 'slow-result'])

    // Send more values
    source$.next(3)
    trigger$.next('trigger2')

    // Should emit the new value
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'buffer values:', [3])
  })

  test('should collect values immediately when shouldAwait is false', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$, false)) // shouldAwait=false

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    // Send immediate values
    source$.next(1)
    source$.next(2)

    // Send a promise that takes time to resolve
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('slow-result'), 100)
    })
    source$.next(slowPromise)

    // Trigger immediately - should include current values and the promise
    trigger$.next('trigger1')
    expect(consoleSpy).toHaveBeenCalledTimes(1)

    // The buffer should contain resolved values and pending promise
    const firstCall = consoleSpy.mock.calls[0]
    expect(firstCall[0]).toBe('buffer values:')
    const bufferedValues = firstCall[1]
    expect(bufferedValues).toEqual(expect.arrayContaining([1, 2]))
    // May contain the promise itself or its resolved value
    expect(bufferedValues.length).toBeGreaterThanOrEqual(2)
  })

  test('should handle mixed pending and resolved values with shouldAwait', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$, true))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    // Send resolved value
    source$.next('immediate')

    // Send pending promise
    const pendingPromise = new Promise((resolve) => {
      setTimeout(() => resolve('pending-result'), 50)
    })
    source$.next(pendingPromise)

    // Trigger while the last value is a pending promise - should wait
    trigger$.next('trigger')
    expect(consoleSpy).not.toHaveBeenCalled()

    // Wait for pending to resolve
    await sleep(100)

    // Should now emit all values including the resolved pending promise
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer values:', ['immediate', 'pending-result'])

    // Send another immediate value after the pending resolves
    source$.next('immediate2')
    trigger$.next('trigger2')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'buffer values:', ['immediate2'])
  })
})
