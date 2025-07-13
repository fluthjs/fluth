import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { Stream, fork } from '../../index'

describe('fork operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test fork', async () => {
    const promise$ = new Stream()
    const promise1$ = fork(promise$)
    promise1$.then(
      (value) => console.log('resolve', value),
      (value) => console.log('reject', value),
    )
    promise1$.afterComplete((value) => console.log('finish', value))

    promise$.next('a')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 'a')

    promise$.next(Promise.reject('b'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'reject', 'b')

    // finish case
    promise$.next('c', true)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'finish', 'c')
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'resolve', 'c')
  })

  test('test fork with unsubscribe', async () => {
    const promise$ = new Stream()
    const promise1$ = fork(promise$)
    promise1$.afterUnsubscribe(() => console.log('unsubscribe'))
    promise$.unsubscribe()
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe')
  })

  test('test fork with multiple values', async () => {
    const promise$ = new Stream()
    const promise1$ = fork(promise$)
    const promise2$ = fork(promise$)

    promise1$.then((value) => console.log('fork1:', value))
    promise2$.then((value) => console.log('fork2:', value))

    promise$.next('test')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'fork1:', 'test')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'fork2:', 'test')

    promise$.next('another')
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'fork1:', 'another')
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'fork2:', 'another')
  })

  test('test fork with promise rejection', async () => {
    const promise$ = new Stream()
    const promise1$ = fork(promise$)

    promise1$.then(
      (value) => console.log('resolved:', value),
      (error) => console.log('rejected:', error),
    )

    promise$.next('success')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolved:', 'success')

    promise$.next(Promise.reject('error'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'rejected:', 'error')
  })

  // Tests for input validation
  test('test fork with invalid input type', () => {
    const invalidInputs = [null, undefined, 'string', 123, {}, [], Promise.resolve('test')]

    invalidInputs.forEach((input) => {
      expect(() => {
        fork(input as any)
      }).toThrow('fork operator only accepts Stream or Observable as input')
    })
  })

  test('test fork with valid input types', () => {
    const stream$ = new Stream()
    const observable$ = stream$.then((value) => value)

    // Should not throw for valid inputs
    expect(() => fork(stream$)).not.toThrow()
    expect(() => fork(observable$)).not.toThrow()
  })

  // Tests for finished stream handling
  test('test fork with finished stream', async () => {
    const promise$ = new Stream()

    // First, complete the stream
    promise$.next('final-value', true)

    // Now try to fork the finished stream
    const fork1$ = fork(promise$)

    let receivedValue = null
    fork1$.then((value) => {
      receivedValue = value
      console.log('fork received:', value)
    })

    // Should not receive any value
    expect(receivedValue).toBe(null)
    expect(consoleSpy).not.toHaveBeenCalledWith('fork received:', expect.anything())
  })

  test('test fork with finished stream returns empty stream', async () => {
    const promise$ = new Stream()

    // Complete the stream
    promise$.next('completed', true)

    // Fork the finished stream
    const fork1$ = fork(promise$)

    let completed = false
    let unsubscribed = false
    let receivedValue = null

    fork1$.then((value) => {
      receivedValue = value
    })

    fork1$.afterComplete(() => {
      completed = true
    })

    fork1$.afterUnsubscribe(() => {
      unsubscribed = true
    })

    // Fork should return an empty stream that doesn't emit
    await sleep(10)

    expect(receivedValue).toBe(null)
    expect(completed).toBe(false)
    expect(unsubscribed).toBe(false)
  })

  test('test fork with finished stream different autoUnsubscribe settings', async () => {
    const promise$ = new Stream()

    // Complete the stream
    promise$.next('completed', true)

    // Fork with different autoUnsubscribe settings
    const autoFork$ = fork(promise$, true)
    const manualFork$ = fork(promise$, false)

    let autoReceived = null
    let manualReceived = null

    autoFork$.then((value) => {
      autoReceived = value
    })
    manualFork$.then((value) => {
      manualReceived = value
    })

    await sleep(10)

    // Both should behave the same way (no emission) regardless of autoUnsubscribe setting
    expect(autoReceived).toBe(null)
    expect(manualReceived).toBe(null)
  })

  // New tests for autoUnsubscribe parameter
  test('test fork with autoUnsubscribe = true (default)', async () => {
    const promise$ = new Stream()
    const promise1$ = fork(promise$, true) // explicit true
    let unsubscribed = false

    promise1$.afterUnsubscribe(() => {
      unsubscribed = true
      console.log('fork unsubscribed')
    })

    promise$.unsubscribe()
    await sleep(1)

    expect(unsubscribed).toBe(true)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'fork unsubscribed')
  })

  test('test fork with autoUnsubscribe = false', async () => {
    const promise$ = new Stream()
    const promise1$ = fork(promise$, false) // explicit false
    let unsubscribed = false

    promise1$.afterUnsubscribe(() => {
      unsubscribed = true
      console.log('fork unsubscribed')
    })

    promise$.unsubscribe()
    await sleep(1)

    expect(unsubscribed).toBe(false)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('test fork autoUnsubscribe behavior with manual unsubscribe', async () => {
    const promise$ = new Stream()
    const promise1$ = fork(promise$, false)
    let unsubscribed = false

    promise1$.afterUnsubscribe(() => {
      unsubscribed = true
      console.log('fork unsubscribed')
    })

    // Manual unsubscribe should still work
    promise1$.unsubscribe()

    expect(unsubscribed).toBe(true)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'fork unsubscribed')
  })

  test('test fork cleanup behavior with autoUnsubscribe = true', async () => {
    const promise$ = new Stream()
    const promise1$ = fork(promise$, true)

    // Add some values to ensure fork is working
    promise1$.then((value) => console.log('received:', value))
    promise$.next('test')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'received:', 'test')

    // Test cleanup when fork unsubscribes
    promise1$.unsubscribe()

    // Input stream should continue working
    promise$.next('after-unsubscribe')
    // Fork should not receive this value
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  test('test fork cleanup behavior with autoUnsubscribe = false', async () => {
    const promise$ = new Stream()
    const promise1$ = fork(promise$, false)

    // Add some values to ensure fork is working
    promise1$.then((value) => console.log('received:', value))
    promise$.next('test')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'received:', 'test')

    // Test cleanup when fork unsubscribes
    promise1$.unsubscribe()

    // Input stream should continue working
    promise$.next('after-unsubscribe')
    // Fork should not receive this value
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  test('test fork with completion and autoUnsubscribe = true', async () => {
    const promise$ = new Stream()
    const promise1$ = fork(promise$, true)
    let completed = false

    promise1$.afterComplete(() => {
      completed = true
      console.log('fork completed')
    })

    promise1$.then((value) => console.log('received:', value))

    // Complete the input stream
    promise$.next('final', true)

    expect(completed).toBe(true)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'fork completed')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'received:', 'final')
  })

  test('test fork with completion and autoUnsubscribe = false', async () => {
    const promise$ = new Stream()
    const promise1$ = fork(promise$, false)
    let completed = false

    promise1$.afterComplete(() => {
      completed = true
      console.log('fork completed')
    })

    promise1$.then((value) => console.log('received:', value))

    // Complete the input stream - fork should NOT be notified of completion
    promise$.next('final', true)

    // Fork should NOT be completed because autoUnsubscribe = false
    expect(completed).toBe(false)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'received:', 'final')
    expect(consoleSpy).not.toHaveBeenCalledWith('fork completed')
  })

  test('test fork with mixed autoUnsubscribe settings on completion', async () => {
    const promise$ = new Stream()
    const autoFork$ = fork(promise$, true)
    const manualFork$ = fork(promise$, false)

    let autoCompleted = false
    let manualCompleted = false

    autoFork$.afterComplete(() => {
      autoCompleted = true
      console.log('auto fork completed')
    })

    manualFork$.afterComplete(() => {
      manualCompleted = true
      console.log('manual fork completed')
    })

    autoFork$.then((value) => console.log('auto received:', value))
    manualFork$.then((value) => console.log('manual received:', value))

    // Complete the input stream
    promise$.next('final', true)

    // Only autoFork should be completed
    expect(autoCompleted).toBe(true)
    expect(manualCompleted).toBe(false)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'auto fork completed')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'auto received:', 'final')
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'manual received:', 'final')
    expect(consoleSpy).not.toHaveBeenCalledWith('manual fork completed')
  })

  // Additional tests for edge cases and complex scenarios
  test('test fork completion propagation with stream restart', async () => {
    const promise$ = new Stream()
    const autoFork$ = fork(promise$, true)
    const manualFork$ = fork(promise$, false)

    let autoCompletionCount = 0
    let manualCompletionCount = 0

    autoFork$.afterComplete(() => {
      autoCompletionCount++
      console.log('auto completion', autoCompletionCount)
    })

    manualFork$.afterComplete(() => {
      manualCompletionCount++
      console.log('manual completion', manualCompletionCount)
    })

    // First completion
    promise$.next('first', true)
    expect(autoCompletionCount).toBe(1)
    expect(manualCompletionCount).toBe(0)

    // Restart the stream and complete again
    promise$.restart()
    promise$.next('second', true)
    // After restart, fork should still only have completed once
    // because completion event is a one-time event per fork instance
    expect(autoCompletionCount).toBe(1)
    expect(manualCompletionCount).toBe(0)

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'auto completion', 1)
    expect(consoleSpy).not.toHaveBeenCalledWith('manual completion', expect.any(Number))
  })

  test('test fork completion behavior with multiple fork instances', async () => {
    const promise$ = new Stream()

    // Create multiple forks before completion
    const autoFork1$ = fork(promise$, true)
    const autoFork2$ = fork(promise$, true)
    const manualFork1$ = fork(promise$, false)
    const manualFork2$ = fork(promise$, false)

    const completionTracker = {
      autoFork1: false,
      autoFork2: false,
      manualFork1: false,
      manualFork2: false,
    }

    autoFork1$.afterComplete(() => {
      completionTracker.autoFork1 = true
    })
    autoFork2$.afterComplete(() => {
      completionTracker.autoFork2 = true
    })
    manualFork1$.afterComplete(() => {
      completionTracker.manualFork1 = true
    })
    manualFork2$.afterComplete(() => {
      completionTracker.manualFork2 = true
    })

    // Complete the source stream
    promise$.next('final', true)

    // Only autoUnsubscribe = true forks should be completed
    expect(completionTracker.autoFork1).toBe(true)
    expect(completionTracker.autoFork2).toBe(true)
    expect(completionTracker.manualFork1).toBe(false)
    expect(completionTracker.manualFork2).toBe(false)
  })

  test('test fork with nested fork chains', async () => {
    const source$ = new Stream()
    const fork1$ = fork(source$, true)
    const fork2$ = fork(fork1$, false)
    const fork3$ = fork(fork2$, true)

    let source_completed = false
    let fork1_completed = false
    let fork2_completed = false
    let fork3_completed = false

    source$.afterComplete(() => {
      source_completed = true
    })
    fork1$.afterComplete(() => {
      fork1_completed = true
    })
    fork2$.afterComplete(() => {
      fork2_completed = true
    })
    fork3$.afterComplete(() => {
      fork3_completed = true
    })

    fork3$.then((value) => console.log('nested result:', value))

    source$.next('test')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'nested result:', 'test')

    // Complete the source
    source$.next('final', true)

    // Check completion propagation
    expect(source_completed).toBe(true)
    expect(fork1_completed).toBe(true) // autoUnsubscribe = true
    expect(fork2_completed).toBe(false) // autoUnsubscribe = false
    expect(fork3_completed).toBe(false) // depends on fork2, which didn't complete
  })

  test('test fork callback cleanup on early unsubscribe', async () => {
    const promise$ = new Stream()
    const autoFork$ = fork(promise$, true)
    const manualFork$ = fork(promise$, false)

    let autoUnsubscribed = false
    let manualUnsubscribed = false

    autoFork$.afterUnsubscribe(() => {
      autoUnsubscribed = true
    })
    manualFork$.afterUnsubscribe(() => {
      manualUnsubscribed = true
    })

    // Manually unsubscribe forks before source completes
    autoFork$.unsubscribe()
    manualFork$.unsubscribe()

    expect(autoUnsubscribed).toBe(true)
    expect(manualUnsubscribed).toBe(true)

    // Now complete the source - should not affect unsubscribed forks
    promise$.next('after-unsubscribe', true)

    // Both forks should remain unsubscribed
    expect(autoUnsubscribed).toBe(true)
    expect(manualUnsubscribed).toBe(true)
  })

  test('test fork with simultaneous unsubscribe and completion', async () => {
    const promise$ = new Stream()
    const fork1$ = fork(promise$, true)
    const fork2$ = fork(promise$, false)

    let fork1_completed = false
    let fork2_completed = false
    let fork1_unsubscribed = false
    let fork2_unsubscribed = false

    fork1$.afterComplete(() => {
      fork1_completed = true
    })
    fork2$.afterComplete(() => {
      fork2_completed = true
    })
    fork1$.afterUnsubscribe(() => {
      fork1_unsubscribed = true
    })
    fork2$.afterUnsubscribe(() => {
      fork2_unsubscribed = true
    })

    // Simulate simultaneous operations
    promise$.next('final', true)
    promise$.unsubscribe()

    await sleep(1)

    // fork1 should be completed and unsubscribed
    expect(fork1_completed).toBe(true)
    expect(fork1_unsubscribed).toBe(true)

    // fork2 should not be completed but should be unsubscribed
    expect(fork2_completed).toBe(false)
    expect(fork2_unsubscribed).toBe(false) // autoUnsubscribe = false
  })

  test('test fork completion timing with async operations', async () => {
    const promise$ = new Stream()
    const fork1$ = fork(promise$, true)

    const completionOrder: string[] = []

    fork1$.afterComplete(() => {
      completionOrder.push('fork completed')
    })

    fork1$.then((value) => {
      completionOrder.push(`received: ${value}`)
    })

    // Complete with async operation
    promise$.next(Promise.resolve('async-value'), true)

    await sleep(1)

    // Check the order of operations
    expect(completionOrder).toEqual(['fork completed', 'received: async-value'])
  })

  test('test fork with error during completion', async () => {
    const promise$ = new Stream()
    const fork1$ = fork(promise$, true)
    const fork2$ = fork(promise$, false)

    let fork1_completed = false
    let fork2_completed = false

    fork1$.afterComplete(() => {
      fork1_completed = true
    })
    fork2$.afterComplete(() => {
      fork2_completed = true
    })

    fork1$.then(
      (value) => console.log('fork1 resolved:', value),
      (error) => console.log('fork1 rejected:', error),
    )

    fork2$.then(
      (value) => console.log('fork2 resolved:', value),
      (error) => console.log('fork2 rejected:', error),
    )

    // Complete with rejection
    promise$.next(Promise.reject('completion-error'), true)

    await sleep(1)

    // Both should receive the error, but only fork1 should be completed
    expect(fork1_completed).toBe(true)
    expect(fork2_completed).toBe(false)

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'fork1 rejected:', 'completion-error')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'fork2 rejected:', 'completion-error')
  })
})
