import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, map } from '../../index'

describe('map operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('basic mapping with sync projection', () => {
    const stream$ = $()
    const mapped$ = stream$.pipe(map((value: number) => value * 2))

    mapped$.then((value) => {
      console.log('mapped:', value)
    })

    stream$.next(1)
    stream$.next(2)

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'mapped:', 2)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'mapped:', 4)
  })

  test('mapping with async projection (PromiseLike)', async () => {
    const stream$ = $()
    const mapped$ = stream$.pipe(map((value: string) => Promise.resolve(`${value}-async`)))

    mapped$.then((value) => {
      console.log('async-mapped:', value)
    })

    stream$.next('a')
    await vi.runAllTimersAsync()

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'async-mapped:', 'a-async')
  })

  test('error handling when projection throws', async () => {
    const stream$ = $()
    const mapped$ = stream$.pipe(
      map((value: string) => {
        if (value === 'error') throw new Error('map-error')
        return value
      }),
    )

    mapped$.then(
      (value) => console.log('resolved:', value),
      (err) => console.log('rejected:', (err as any)?.message || err),
    )

    stream$.next('error')
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'rejected:', 'map-error')

    stream$.next('ok')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolved:', 'ok')
  })

  test('chained map operations', () => {
    const stream$ = $()
    const mapped$ = stream$.pipe(
      map((n: number) => n + 1),
      map((n: number) => n * 3),
    )

    mapped$.then((value) => console.log('chained:', value))

    stream$.next(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'chained:', 6)
  })

  test('upstream rejection should propagate through map', async () => {
    const stream$ = $()
    const mapped$ = stream$.pipe(map((v: string) => `${v}!`))

    mapped$.then(
      (value) => console.log('resolved:', value),
      (error) => console.log('rejected:', error),
    )

    stream$.next(Promise.reject('oops'))
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'rejected:', 'oops')
  })

  test('identity mapping and nullish values should pass through', () => {
    const stream$ = $()
    const mapped$ = stream$.pipe(map(<T>(v: T) => v))

    mapped$.then((value) => console.log('id:', value))

    stream$.next(undefined)
    stream$.next(null as any)
    stream$.next(0 as any)

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'id:', undefined)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'id:', null)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'id:', 0)
  })

  test('projection returns rejected promise should reject downstream', async () => {
    const stream$ = $()
    const mapped$ = stream$.pipe(map((v: string) => Promise.reject(`${v}-fail`)))

    mapped$.then(
      (v) => console.log('resolved:', v),
      (e) => console.log('rejected:', e),
    )

    stream$.next('x')
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'rejected:', 'x-fail')
  })

  test('no initial emission before first next (map does not emit immediately)', () => {
    const stream$ = $<number>()
    const mapped$ = stream$.pipe(map((n) => (n ?? 0) * 2))
    mapped$.then((v) => console.log('immediate:', v))
    // no next yet
    expect(consoleSpy).toHaveBeenCalledTimes(0)
  })

  test('unsubscribe mapped stream prevents further emissions', async () => {
    const stream$ = $()
    const mapped$ = stream$.pipe(map((v: number) => v + 1))
    mapped$.then((v) => console.log('u:', v))

    stream$.next(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'u:', 2)

    mapped$.unsubscribe()
    stream$.next(2)
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  test('unsubscribe while async projection pending should suppress emission', async () => {
    const stream$ = $()
    const mapped$ = stream$.pipe(
      map((v: number) => new Promise<number>((resolve) => setTimeout(() => resolve(v + 1), 50))),
    )

    mapped$.then((v) => console.log('late:', v))

    stream$.next(1)
    mapped$.unsubscribe()

    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenCalledTimes(0)
  })
})
