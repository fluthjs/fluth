import { describe, test, expect } from 'vitest'
import { streamFactory } from '../utils'
import { Stream } from '../../index'
import { filter } from '../../src/operators'

describe('Observable readonly value', () => {
  test('should make observable value readonly', () => {
    const { observable$ } = streamFactory()

    // value should be accessible for reading
    expect(observable$.value).toBeUndefined()

    // but writing should be prevented (TypeScript compile error, runtime may vary)
    // This tests the readonly nature of the property
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(observable$), 'value')
    expect(descriptor?.set).toBeUndefined()
    expect(descriptor?.get).toBeDefined()
  })

  test('should update value through proper channels', () => {
    const { stream$, observable$ } = streamFactory()

    // Initial value
    expect(observable$.value).toBeUndefined()

    // Value should update when stream emits
    stream$.next('test value')
    expect(observable$.value).toBe('test value')

    // Value should update for Observable operations
    const mapped$ = observable$.then((val) => `mapped: ${val}`)
    stream$.next('new value')
    expect(observable$.value).toBe('new value')
    expect(mapped$.value).toBe('mapped: new value')
  })

  test('should preserve value readonly in stream instances', () => {
    const stream$ = new Stream('initial')

    // Stream value should be accessible
    expect(stream$.value).toBe('initial')

    // Stream should also have readonly value property
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(stream$), 'value')
    expect(descriptor?.get).toBeDefined()

    // Update through proper method
    stream$.next('updated')
    expect(stream$.value).toBe('updated')
  })

  test('should work with complex data types', () => {
    const { stream$, observable$ } = streamFactory()

    const complexData = { id: 1, name: 'test', nested: { count: 0 } }
    stream$.next(complexData)

    expect(observable$.value).toEqual(complexData)
    expect(observable$.value?.id).toBe(1)
    expect(observable$.value?.nested.count).toBe(0)
  })

  test('should handle error values as readonly', async () => {
    const { stream$, observable$ } = streamFactory()

    const error$ = observable$.then(
      (val) => val,
      (err) => `error: ${err}`,
    )

    stream$.next(Promise.reject('test error'))

    // Wait for async operation
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Error values should also be readonly
    expect(error$.value).toBe('error: test error')
  })

  test('should maintain readonly across pipe operations', () => {
    const { stream$, observable$ } = streamFactory()

    const piped$ = observable$.pipe(filter((val) => val > 0)).then((val) => val * 2)

    stream$.next(5)
    expect(piped$.value).toBe(10)

    // Readonly should be maintained in piped observable
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(piped$), 'value')
    expect(descriptor?.set).toBeUndefined()
    expect(descriptor?.get).toBeDefined()
  })
})
