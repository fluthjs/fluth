import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, streamFactory } from '../utils'
import { $, audit, consoleAll } from '../../index'

describe('audit operator test', () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  // ========== Basic Functionality Tests ==========

  test('should emit latest resolved value when trigger fires', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Set initial value but should not emit immediately
    source$.next(1)
    expect(consoleSpy).not.toHaveBeenCalled()

    // Should emit latest resolved value after trigger fires
    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 1)

    // Update values but don't emit immediately
    source$.next(2)
    source$.next(3)
    expect(consoleSpy).toHaveBeenCalledTimes(1)

    // Trigger again should emit latest resolved value
    trigger$.next('trigger again')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'audited:', 3)
  })

  test('should emit latest resolved value only, not all intermediate values', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Send multiple resolved values quickly
    source$.next(1)
    source$.next(2)
    source$.next(3)
    source$.next(4)
    source$.next(5)

    // Trigger should only emit the latest resolved value
    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 5)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  test('should emit current resolved values at each trigger time', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // First round
    source$.next('a')
    trigger$.next('trigger1')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 'a')

    // Second round - include rejected value
    source$.next('b')
    source$.next(Promise.reject('error'))
    source$.next('c')
    await vi.runAllTimersAsync()
    trigger$.next('trigger2')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'audited:', 'c')

    // Third round
    source$.next('d')
    trigger$.next('trigger3')
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'audited:', 'd')
  })

  test('should emit same resolved value multiple times for rapid triggers', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    source$.next('stable value')

    // Rapid consecutive triggers should emit the same resolved value multiple times
    trigger$.next('trigger1')
    trigger$.next('trigger2')
    trigger$.next('trigger3')

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 'stable value')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'audited:', 'stable value')
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'audited:', 'stable value')
  })

  // ========== Edge Cases Tests ==========

  test('should emit undefined when trigger fires before source has resolved value', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Trigger fires before source has any resolved value, should emit undefined
    trigger$.next('early trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', undefined)

    // Set resolved value to source
    source$.next('first value')

    // Trigger should emit this resolved value
    trigger$.next('trigger after value')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'audited:', 'first value')
  })

  test('should handle undefined and null resolved values correctly', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Test undefined value (resolved)
    source$.next(undefined)
    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', undefined)

    // Test null value (resolved)
    source$.next(null)
    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'audited:', null)

    // Test 0 value (resolved)
    source$.next(0)
    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'audited:', 0)

    // Test empty string (resolved)
    source$.next('')
    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'audited:', '')
  })

  test('should handle complex resolved objects', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', JSON.stringify(value))
    })

    const complexObject = {
      id: 1,
      data: [1, 2, 3],
      nested: { value: 'test' },
    }

    source$.next(complexObject)
    trigger$.next('trigger')

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', JSON.stringify(complexObject))
  })

  // ========== Error Handling Tests ==========

  test('should ignore rejected values and not update currentValue', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Set a resolved value first
    source$.next('good value')
    trigger$.next('trigger1')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 'good value')

    // Send a rejected promise - should not update currentValue
    source$.next(Promise.reject('error'))
    await vi.runAllTimersAsync()

    // Trigger should still emit the last resolved value, not the rejected one
    trigger$.next('trigger2')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'audited:', 'good value')
  })

  test('should emit undefined when only rejected values exist', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Send only rejected promises
    source$.next(Promise.reject('error1'))
    await vi.runAllTimersAsync()
    source$.next(Promise.reject('error2'))
    await vi.runAllTimersAsync()

    // Since no resolved values exist, should emit undefined
    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', undefined)
  })

  test('should only track resolved values in mixed resolved and rejected sequence', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Send mixed values
    source$.next('success1')
    source$.next(Promise.reject('error1'))
    await vi.runAllTimersAsync()
    source$.next('success2')
    source$.next(Promise.reject('error2'))
    await vi.runAllTimersAsync()

    // Should emit the latest resolved value (success2)
    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 'success2')

    // Send more values with rejected at the end
    source$.next('success3')
    source$.next(Promise.reject('error3'))
    await vi.runAllTimersAsync()

    // Should still emit success3, not the rejected value
    trigger$.next('trigger2')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'audited:', 'success3')
  })

  test('should handle rejected promise values correctly', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then(
      (value) => console.log('resolved:', value),
      (error) => console.log('rejected:', error),
    )

    // Send sequence: resolved -> rejected -> resolved
    source$.next('value1')
    source$.next(Promise.reject('should be ignored'))
    await vi.runAllTimersAsync()
    source$.next('value2')

    // Should emit value2 (latest resolved), not the rejected promise
    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolved:', 'value2')

    // Send only rejected value after some resolved values
    source$.next(Promise.reject('another rejection'))
    await vi.runAllTimersAsync()

    // Should still emit value2 (last resolved value)
    trigger$.next('trigger2')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolved:', 'value2')
  })

  test('should continue working when trigger errors but source has resolved values', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    source$.next('test value')

    // Trigger errors should not affect audit's normal operation
    trigger$.next(Promise.reject('trigger error'))
    await vi.runAllTimersAsync()

    expect(consoleSpy).not.toHaveBeenCalled()

    // Subsequent normal triggers should still work with resolved values
    trigger$.next('normal trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 'test value')
  })

  // ========== Async Processing Tests ==========

  test('should handle async resolved values', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Send async promise that resolves
    const asyncValue = new Promise((resolve) => {
      setTimeout(() => resolve('async result'), 50)
    })
    source$.next(asyncValue)

    await sleep(60)

    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 'async result')
  })

  test('should not update currentValue with async rejected values', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Set a good value first
    source$.next('good value')

    // Send async promise that rejects
    const asyncReject = new Promise((_, reject) => {
      setTimeout(() => reject('async error'), 50)
    })
    source$.next(asyncReject)

    await sleep(60)

    // Should still emit the last good value, not affected by rejection
    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 'good value')
  })

  // ========== Advanced Features Tests ==========

  test('should wait for pending observable when shouldAwait is true (default)', async () => {
    const source$ = $()
    const trigger$ = $()
    // shouldAwait defaults to true
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Send a promise that takes time to resolve
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('slow-result'), 100)
    })
    source$.next(slowPromise)

    // Trigger while source is still pending
    trigger$.next('trigger-while-pending')

    // Should not emit immediately because shouldAwait=true and status is PENDING
    expect(consoleSpy).not.toHaveBeenCalled()

    // Wait for promise to resolve
    await sleep(150)

    // Should now emit the resolved value
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 'slow-result')
  })

  test('should emit immediately when shouldAwait is false', async () => {
    const source$ = $()
    const trigger$ = $()
    // shouldAwait set to false
    const audited$ = source$.pipe(audit(trigger$, false))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Send a promise that takes time to resolve
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('slow-result'), 100)
    })
    source$.next(slowPromise)

    // Trigger while source is still pending
    trigger$.next('trigger-while-pending')

    // Should emit immediately because shouldAwait=false, even though status is PENDING
    // Will emit the current resolved value (which is undefined since promise hasn't resolved yet)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', undefined)
  })

  test('should not create duplicate pending observables', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Send a promise that takes time to resolve
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('slow-result'), 100)
    })
    source$.next(slowPromise)

    // Multiple rapid triggers while source is pending
    trigger$.next('trigger1')
    trigger$.next('trigger2')
    trigger$.next('trigger3')

    // When status is PENDING and shouldAwait=true, no immediate emission
    // Only creates pending observable on first trigger
    expect(consoleSpy).not.toHaveBeenCalled()

    // Wait for promise to resolve
    await sleep(150)

    // Should emit the resolved value once from the pending observable
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 'slow-result')
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  test('should handle mixed resolved and pending values correctly', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Start with resolved value
    source$.next('resolved-value')
    trigger$.next('trigger1')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 'resolved-value')

    // Send pending promise
    const pendingPromise = new Promise((resolve) => {
      setTimeout(() => resolve('pending-result'), 100)
    })
    source$.next(pendingPromise)

    // Trigger while pending
    trigger$.next('trigger2')
    expect(consoleSpy).toHaveBeenCalledTimes(1) // Should not emit immediately

    // Wait for resolution
    await sleep(150)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'audited:', 'pending-result')

    // Send another resolved value
    source$.next('final-value')
    trigger$.next('trigger3')
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'audited:', 'final-value')
  })

  // ========== Completion and Cleanup Tests ==========

  test('should complete when trigger stream finishes', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    audited$.afterComplete(() => {
      console.log('audit completed')
    })

    source$.next('value')

    // Trigger completion should cause audit to complete
    trigger$.next('final trigger', true)
    // Complete callback is triggered first, then audited value
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audit completed')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'audited:', 'value')
  })

  test('should handle source stream finishing', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    audited$.afterComplete(() => {
      console.log('audit completed')
    })

    // Source completion should cause audit to complete
    source$.next('value', true)

    // Trigger can still emit the last resolved value
    trigger$.next('trigger')

    // Complete callback not triggered
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 'value')
  })

  test('should clean up properly on unsubscribe', async () => {
    const { stream$: source$, observable$: sourceObs$ } = streamFactory()
    const { stream$: trigger$, observable$: triggerObs$ } = streamFactory()
    const audited$ = sourceObs$.pipe(audit(triggerObs$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    source$.next('test value')
    trigger$.next('trigger')

    // Verify normal working
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 'test value')

    // Should have no more output after cleanup
    audited$.unsubscribe()
    consoleSpy.mockClear()

    source$.next('after unsubscribe')
    trigger$.next('trigger after unsubscribe')

    expect(consoleSpy).not.toHaveBeenCalled()
  })

  // ========== Internal Implementation Tests ==========

  test('should use observable$.value directly for immediate value access', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Set multiple values in rapid succession
    source$.next('value1')
    source$.next('value2')
    source$.next('value3')

    // Trigger should emit the latest observable$.value directly
    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 'value3')

    // Update value and trigger again
    source$.next('value4')
    trigger$.next('trigger2')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'audited:', 'value4')
  })

  test('should clean up pending observable after resolution', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Send a promise that takes time to resolve
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('slow-result'), 100)
    })
    source$.next(slowPromise)

    // Trigger while pending - should create pendingObservable$
    trigger$.next('trigger-while-pending')
    expect(consoleSpy).not.toHaveBeenCalled()

    // Wait for resolution
    await sleep(150)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 'slow-result')

    // Set immediate value
    source$.next('immediate-value')

    // Trigger again - should emit the new resolved value
    trigger$.next('trigger-after-resolution')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'audited:', 'immediate-value')
  })

  test('should handle recursive triggerNext call when observable resolves from pending', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$, true))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Send a pending promise
    const pendingPromise = new Promise((resolve) => {
      setTimeout(() => resolve('resolved-from-pending'), 100)
    })
    source$.next(pendingPromise)

    // Trigger while source is pending - should set up pendingObservable$
    trigger$.next('trigger-while-pending')
    expect(consoleSpy).not.toHaveBeenCalled()

    // Wait for promise to resolve - should trigger recursive triggerNext call
    await sleep(150)

    // Should emit the resolved value via recursive triggerNext
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 'resolved-from-pending')
    expect(consoleSpy).toHaveBeenCalledTimes(1)

    // Verify pendingObservable$ is cleared after resolution
    // Set immediate value and trigger again
    source$.next('immediate-value')
    trigger$.next('trigger-after-resolution')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'audited:', 'immediate-value')
  })

  test('should inherit plugin from source', async () => {
    const source$ = $(0).use(consoleAll())
    const trigger$ = $()
    source$.pipe(audit(trigger$)).then((v) => v + 1)

    source$.next(1)
    trigger$.next('trigger')

    source$.next(2)
    trigger$.next('trigger2')

    trigger$.complete()

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolve', 1)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'resolve', 2)
  })
})
