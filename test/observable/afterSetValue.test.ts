import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { streamFactory, sleep } from '../utils'
import { Stream } from '../../index'
import { filter } from '../../src/operators'

describe('Observable afterSetValue lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should call afterSetValue callback when value is set', () => {
    const { stream$, observable$ } = streamFactory()
    const callback = vi.fn()

    observable$.afterSetValue(callback)

    // Trigger value change
    stream$.next('test value')

    expect(callback).toHaveBeenCalledWith('test value')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  test('should call afterSetValue callback on error values', async () => {
    const { stream$, observable$ } = streamFactory()
    const callback = vi.fn()

    const error$ = observable$.then(
      (val) => val,
      (err) => err,
    )

    error$.afterSetValue(callback)

    // Trigger error
    stream$.next(Promise.reject('test error'))
    await vi.runAllTimersAsync()

    expect(callback).toHaveBeenCalledWith('test error')
  })

  test('should support multiple afterSetValue callbacks', () => {
    const { stream$, observable$ } = streamFactory()
    const callback1 = vi.fn()
    const callback2 = vi.fn()
    const callback3 = vi.fn()

    observable$.afterSetValue(callback1)
    observable$.afterSetValue(callback2)
    observable$.afterSetValue(callback3)

    stream$.next('test value')

    expect(callback1).toHaveBeenCalledWith('test value')
    expect(callback2).toHaveBeenCalledWith('test value')
    expect(callback3).toHaveBeenCalledWith('test value')
  })

  test('should remove afterSetValue callback with offAfterSetValue', () => {
    const { stream$, observable$ } = streamFactory()
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    observable$.afterSetValue(callback1)
    observable$.afterSetValue(callback2)

    // Remove one callback
    observable$.offAfterSetValue(callback1)

    stream$.next('test value')

    expect(callback1).not.toHaveBeenCalled()
    expect(callback2).toHaveBeenCalledWith('test value')
  })

  test('should not add duplicate callbacks', () => {
    const { stream$, observable$ } = streamFactory()
    const callback = vi.fn()

    // Add the same callback multiple times
    observable$.afterSetValue(callback)
    observable$.afterSetValue(callback)
    observable$.afterSetValue(callback)

    stream$.next('test value')

    // Should only be called once
    expect(callback).toHaveBeenCalledTimes(1)
  })

  test('should work with async operations', async () => {
    const { stream$, observable$ } = streamFactory()
    const callback = vi.fn()

    const async$ = observable$.then(async (val) => {
      await sleep(50)
      return `async: ${val}`
    })

    async$.afterSetValue(callback)

    stream$.next('test value')

    await sleep(100)

    expect(callback).toHaveBeenCalledWith('async: test value')
  })

  test('should trigger callback for each value change', () => {
    const { stream$, observable$ } = streamFactory()
    const callback = vi.fn()

    observable$.afterSetValue(callback)

    // Multiple value changes
    stream$.next('value1')
    stream$.next('value2')
    stream$.next('value3')

    expect(callback).toHaveBeenCalledTimes(3)
    expect(callback).toHaveBeenNthCalledWith(1, 'value1')
    expect(callback).toHaveBeenNthCalledWith(2, 'value2')
    expect(callback).toHaveBeenNthCalledWith(3, 'value3')
  })

  test('should work with piped operations', () => {
    const { stream$, observable$ } = streamFactory()
    const callback = vi.fn()

    const piped$ = observable$.then((val) => val * 2)
    piped$.afterSetValue(callback)

    stream$.next(5)

    expect(callback).toHaveBeenCalledWith(10)
  })

  test('should handle callback errors gracefully', () => {
    const { stream$, observable$ } = streamFactory()
    const errorCallback = vi.fn(() => {
      throw new Error('Callback error')
    })
    const normalCallback = vi.fn()

    observable$.afterSetValue(errorCallback)
    observable$.afterSetValue(normalCallback)

    // Should not throw despite callback error
    expect(() => {
      stream$.next('test value')
    }).not.toThrow()

    // Normal callback should still be called
    expect(normalCallback).toHaveBeenCalledWith('test value')
  })

  test('should work with Stream set method', () => {
    const stream$ = new Stream({ count: 0 })
    const callback = vi.fn()

    stream$.afterSetValue(callback)

    // Use set method to update
    stream$.set((draft) => {
      draft.count = 5
    })

    expect(callback).toHaveBeenCalledWith({ count: 5 })
  })

  test('should not call removed callbacks', () => {
    const { stream$, observable$ } = streamFactory()
    const callback = vi.fn()

    observable$.afterSetValue(callback)

    // First call should work
    stream$.next('value1')
    expect(callback).toHaveBeenCalledWith('value1')

    // Remove callback
    observable$.offAfterSetValue(callback)

    // Second call should not trigger callback
    stream$.next('value2')
    expect(callback).toHaveBeenCalledTimes(1) // Still only 1 call
  })

  test('should work with complex data transformations', () => {
    const { stream$, observable$ } = streamFactory()
    const values: any[] = []

    const transformed$ = observable$
      .pipe(filter((val) => val > 0))
      .then((val) => ({ original: val, doubled: val * 2 }))

    transformed$.afterSetValue((val) => values.push(val))

    stream$.next(5)
    stream$.next(-1) // Should be filtered out
    stream$.next(10)

    expect(values).toEqual([
      { original: 5, doubled: 10 },
      { original: 10, doubled: 20 },
    ])
  })
})
