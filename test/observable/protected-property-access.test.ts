import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { streamFactory } from '../utils'
import { Stream } from '../../index'
import { filter } from '../../src/operators'

describe('Observable _getProtectedProperty access', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should access _v property through _getProtectedProperty', () => {
    const { stream$, observable$ } = streamFactory()

    // Initial state
    expect(observable$._getProtectedProperty('_v')).toBeUndefined()

    // After setting value
    stream$.next('test value')
    expect(observable$._getProtectedProperty('_v')).toBe('test value')

    // Should match public value getter
    expect(observable$._getProtectedProperty('_v')).toBe(observable$.value)
  })

  test('should access flag properties through _getProtectedProperty', () => {
    const { stream$, observable$ } = streamFactory()

    // Check initial flags
    expect(observable$._getProtectedProperty('_finishFlag')).toBe(false)
    expect(observable$._getProtectedProperty('_unsubscribeFlag')).toBe(false)
    expect(observable$._getProtectedProperty('_onceFlag')).toBe(false)
    expect(observable$._getProtectedProperty('_cleanFlag')).toBe(false)

    // Trigger finish
    stream$.next('test', true)
    expect(observable$._getProtectedProperty('_finishFlag')).toBe(true)

    // Trigger unsubscribe
    observable$.unsubscribe()
    expect(observable$._getProtectedProperty('_unsubscribeFlag')).toBe(true)
    expect(observable$._getProtectedProperty('_cleanFlag')).toBe(true)
  })

  test('should work with operators using _getProtectedProperty', () => {
    const { stream$ } = streamFactory()

    const filtered$ = stream$.pipe(filter((val) => val !== undefined))

    // Check that operators can access protected properties
    stream$.next('initial')
    expect(filtered$._getProtectedProperty('_v')).toBe('initial')

    stream$.next('updated')
    expect(filtered$._getProtectedProperty('_v')).toBe('updated')
  })

  test('should maintain consistency between value getter and _v property', () => {
    const { stream$, observable$ } = streamFactory()

    const testValues = ['string', 42, { id: 1 }, [1, 2, 3], null]

    for (const testValue of testValues) {
      stream$.next(testValue)

      expect(observable$._getProtectedProperty('_v')).toBe(observable$.value)
      expect(observable$._getProtectedProperty('_v')).toBe(testValue)
    }
  })

  test('should work with error scenarios', async () => {
    const { stream$, observable$ } = streamFactory()

    const error$ = observable$.then(
      (val) => val,
      (err) => `error: ${err}`,
    )

    stream$.next(Promise.reject('test error'))
    await vi.runAllTimersAsync()

    expect(error$._getProtectedProperty('_v')).toBe('error: test error')
    expect(error$._getProtectedProperty('_v')).toBe(error$.value)
  })

  test('should work in complex operator chains', () => {
    const { stream$ } = streamFactory()

    const complex$ = stream$
      .pipe(filter((val) => val > 0))
      .then((val) => val * 2)
      .then((val) => ({ result: val }))

    stream$.next(5)

    const expectedValue = { result: 10 }
    expect(complex$._getProtectedProperty('_v')).toEqual(expectedValue)
    expect(complex$._getProtectedProperty('_v')).toEqual(complex$.value)
  })

  test('should handle concurrent access correctly', async () => {
    const { stream$, observable$ } = streamFactory()

    const async$ = observable$.then(async (val) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return `async: ${val}`
    })

    // Trigger multiple concurrent operations
    stream$.next('value1')
    stream$.next('value2')
    stream$.next('value3')

    // Wait for async operations to complete
    await vi.runAllTimersAsync()

    // Should have the final value
    expect(async$._getProtectedProperty('_v')).toBe('async: value3')
    expect(async$._getProtectedProperty('_v')).toBe(async$.value)
  })

  test('should work with stream set operations', () => {
    const stream$ = new Stream({ count: 0, name: 'test' })

    expect(stream$._getProtectedProperty('_v')).toEqual({ count: 0, name: 'test' })

    stream$.set((draft) => {
      draft.count = 10
      draft.name = 'updated'
    })

    expect(stream$._getProtectedProperty('_v')).toEqual({ count: 10, name: 'updated' })
    expect(stream$._getProtectedProperty('_v')).toEqual(stream$.value)
  })
})
