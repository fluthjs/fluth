import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy } from '../utils'
import { $, change } from '../../index'

describe('change operator test', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('should execute only when differ result changes', async () => {
    const promise$ = $<{ num: number }>()
    promise$.pipe(change((value) => value?.num)).then(() => console.log('test'))

    promise$.next({ num: 1 })
    promise$.next({ num: 2 })
    promise$.next({ num: 2 }) // Same value, should not execute
    promise$.next({ num: 1 })

    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })

  test('should handle nested object changes', async () => {
    const promise$ = $<{ user: { name: string; age: number } }>()
    promise$.pipe(change((value) => value?.user.name)).then(() => console.log('name changed'))

    promise$.next({ user: { name: 'Alice', age: 25 } })
    promise$.next({ user: { name: 'Bob', age: 25 } })
    promise$.next({ user: { name: 'Bob', age: 30 } }) // Same name, should not execute
    promise$.next({ user: { name: 'Alice', age: 30 } })

    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })

  test('should handle array changes', async () => {
    const promise$ = $<{ items: number[] }>()
    promise$
      .pipe(change((value) => value?.items?.length))
      .then(() => console.log('array length changed'))

    promise$.next({ items: [1, 2] })
    promise$.next({ items: [1, 2, 3] })
    promise$.next({ items: [1, 2, 3] }) // Same length, should not execute
    promise$.next({ items: [1] })

    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })

  test('should handle primitive value changes', async () => {
    const promise$ = $<string>()
    promise$.pipe(change((value) => value)).then(() => console.log('string changed'))

    promise$.next('hello')
    promise$.next('world')
    promise$.next('world') // Same value, should not execute
    promise$.next('hello')

    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })

  test('should handle boolean changes', async () => {
    const promise$ = $<{ active: boolean }>()
    promise$.pipe(change((value) => value?.active)).then(() => console.log('status changed'))

    promise$.next({ active: false })
    promise$.next({ active: true })
    promise$.next({ active: true }) // Same value, should not execute
    promise$.next({ active: false })

    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })

  test('should handle null and undefined values', async () => {
    const promise$ = $<{ data: string | null }>()
    promise$.pipe(change((value) => value?.data)).then(() => console.log('data changed'))

    promise$.next({ data: 'test' })
    promise$.next({ data: null })
    promise$.next({ data: null }) // Same value, should not execute
    promise$.next({ data: 'test' })

    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })

  test('should handle complex differ function', async () => {
    const promise$ = $<{ x: number; y: number }>()
    promise$
      .pipe(change((value) => (value ? value.x + value.y : 0)))
      .then(() => console.log('sum changed'))

    promise$.next({ x: 1, y: 2 }) // sum = 3
    promise$.next({ x: 2, y: 1 }) // sum = 3, should not execute
    promise$.next({ x: 3, y: 2 }) // sum = 5
    promise$.next({ x: 1, y: 4 }) // sum = 5, should not execute
    promise$.next({ x: 0, y: 0 }) // sum = 0

    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })

  test('should handle chained change operations', async () => {
    const promise$ = $<{ count: number }>()
    const changed$ = promise$.pipe(change((value) => value?.count))
    const doubled$ = changed$.pipe(change((value) => (value?.count || 0) * 2))

    doubled$.then(() => console.log('doubled value changed'))

    promise$.next({ count: 1 }) // doubled = 2
    promise$.next({ count: 2 }) // doubled = 4
    promise$.next({ count: 2 }) // doubled = 4, should not execute
    promise$.next({ count: 1 }) // doubled = 2

    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })

  test('should handle change with condition', async () => {
    const promise$ = $<{ value: number }>()
    promise$
      .pipe(change((value) => value?.value))
      .then(() => console.log('value changed'))
      .then(
        () => console.log('condition met'),
        undefined,
        (value: any) => value > 5,
      )

    promise$.next({ value: 3 })
    promise$.next({ value: 7 })
    promise$.next({ value: 8 })
    promise$.next({ value: 4 })

    // Should log 'value changed' 4 times, but 'condition met' only 2 times
    expect(consoleSpy).toHaveBeenCalledTimes(8)
  })

  test('should handle change with multiple observers', async () => {
    const promise$ = $<{ status: string }>()
    const changed$ = promise$.pipe(change((value) => value?.status))

    changed$.then(() => console.log('observer 1'))
    changed$.then(() => console.log('observer 2'))

    promise$.next({ status: 'pending' })
    promise$.next({ status: 'success' })
    promise$.next({ status: 'success' }) // Same status, should not execute
    promise$.next({ status: 'error' })

    // Each observer should be called 3 times
    expect(consoleSpy).toHaveBeenCalledTimes(6)
  })
})
