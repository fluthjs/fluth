import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, streamFactory } from '../utils'
import { $, skipUntil } from '../../index'

describe('skipUntil operator test', () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('should skip source values until trigger resolves once, then pass through', () => {
    const source$ = $()
    const trigger$ = $()
    const result$ = source$.pipe(skipUntil(trigger$))

    result$.then(
      (value) => console.log('pass:', value),
      (error) => console.log('rej:', error),
    )

    source$.next(1)
    source$.next(2)
    expect(consoleSpy).not.toHaveBeenCalled()

    trigger$.next('go')

    source$.next(3)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'pass:', 3)

    source$.next(4)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'pass:', 4)
  })

  test('trigger rejections should not enable pass-through', async () => {
    const source$ = $()
    const trigger$ = $()
    const result$ = source$.pipe(skipUntil(trigger$))

    result$.then((value) => console.log('passed:', value))

    // Rejected trigger should not enable
    trigger$.next(Promise.reject('err'))
    await vi.runAllTimersAsync()

    source$.next(5)
    expect(consoleSpy).not.toHaveBeenCalled()

    // Resolve trigger to enable
    trigger$.next('ok')
    source$.next(6)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'passed:', 6)
  })

  test('values resolved before enabling are skipped, later values pass through', async () => {
    const source$ = $()
    const trigger$ = $()
    const result$ = source$.pipe(skipUntil(trigger$))

    result$.then((value) => console.log('v:', value))

    const slow = new Promise((resolve) => setTimeout(() => resolve('slow'), 50))
    source$.next(slow)
    await sleep(60)

    // still not enabled
    expect(consoleSpy).not.toHaveBeenCalled()

    // enable
    trigger$.next('go')
    // prior resolved value should not emit retroactively
    expect(consoleSpy).not.toHaveBeenCalled()

    // subsequent value should pass
    source$.next('after')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'v:', 'after')
  })

  test('downstream should receive rejections normally after enabling', async () => {
    const source$ = $()
    const trigger$ = $()
    const result$ = source$.pipe(skipUntil(trigger$))

    result$.then(
      (value) => console.log('res:', value),
      (error) => console.log('rej:', error),
    )

    trigger$.next('enable')

    source$.next(Promise.reject('x'))
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'rej:', 'x')

    source$.next('y')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'res:', 'y')
  })

  test('should clean up on unsubscribe', () => {
    const { stream$: s, observable$: so } = streamFactory()
    const { stream$: t, observable$: to } = streamFactory()
    const result$ = so.pipe(skipUntil(to))

    result$.then((value) => console.log('got:', value))

    s.next(1)
    expect(consoleSpy).not.toHaveBeenCalled()

    t.next('enable')
    s.next(2)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'got:', 2)

    result$.unsubscribe()
    consoleSpy.mockClear()

    s.next(3)
    t.next('again')
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('trigger may occur before any source emission; first subsequent value passes', () => {
    const source$ = $()
    const trigger$ = $()
    const result$ = source$.pipe(skipUntil(trigger$))

    result$.then((value) => console.log('v:', value))

    trigger$.next('early')
    expect(consoleSpy).not.toHaveBeenCalled()

    source$.next('first')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'v:', 'first')
  })
})
