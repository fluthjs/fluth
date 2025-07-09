import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, streamFactory } from '../utils'
import { $, audit } from '../../index'

describe('audit operator test', () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('basic usage - audit emits latest resolved value when trigger fires', async () => {
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

  test('audit emits undefined when trigger fires before source has resolved value', async () => {
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

  test('audit emits latest resolved value only, not all intermediate values', async () => {
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

  test('audit ignores rejected values - does not update currentValue', async () => {
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
    await sleep(1)

    // Trigger should still emit the last resolved value, not the rejected one
    trigger$.next('trigger2')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'audited:', 'good value')
  })

  test('audit with only rejected values emits undefined', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Send only rejected promises
    source$.next(Promise.reject('error1'))
    await sleep(1)
    source$.next(Promise.reject('error2'))
    await sleep(1)

    // Since no resolved values exist, should emit undefined
    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', undefined)
  })

  test('audit with mixed resolved and rejected values - only tracks resolved', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    // Send mixed values
    source$.next('success1')
    source$.next(Promise.reject('error1'))
    await sleep(1)
    source$.next('success2')
    source$.next(Promise.reject('error2'))
    await sleep(1)

    // Should emit the latest resolved value (success2)
    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 'success2')

    // Send more values with rejected at the end
    source$.next('success3')
    source$.next(Promise.reject('error3'))
    await sleep(1)

    // Should still emit success3, not the rejected value
    trigger$.next('trigger2')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'audited:', 'success3')
  })

  test('multiple triggers emit current resolved values at each trigger time', async () => {
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
    await sleep(1)
    trigger$.next('trigger2')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'audited:', 'c')

    // Third round
    source$.next('d')
    trigger$.next('trigger3')
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'audited:', 'd')
  })

  test('audit with trigger stream finishing', async () => {
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

  test('audit with source stream finishing', async () => {
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

  test('audit with rapid trigger firing', async () => {
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

  test('audit with async resolved values', async () => {
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

  test('audit with async rejected values does not update currentValue', async () => {
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

  test('audit unsubscribe cleanup', async () => {
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

  test('audit with undefined and null resolved values', async () => {
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

  test('audit with complex resolved objects', async () => {
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

  test('audit behavior when trigger errors but source has resolved values', async () => {
    const source$ = $()
    const trigger$ = $()
    const audited$ = source$.pipe(audit(trigger$))

    audited$.then((value) => {
      console.log('audited:', value)
    })

    source$.next('test value')

    // Trigger errors should not affect audit's normal operation
    trigger$.next(Promise.reject('trigger error'))
    await sleep(1)

    expect(consoleSpy).not.toHaveBeenCalled()

    // Subsequent normal triggers should still work with resolved values
    trigger$.next('normal trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'audited:', 'test value')
  })

  test('audit rejects handling - rejected promise values are ignored', async () => {
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
    await sleep(1)
    source$.next('value2')

    // Should emit value2 (latest resolved), not the rejected promise
    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolved:', 'value2')

    // Send only rejected value after some resolved values
    source$.next(Promise.reject('another rejection'))
    await sleep(1)

    // Should still emit value2 (last resolved value)
    trigger$.next('trigger2')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolved:', 'value2')
  })
})
