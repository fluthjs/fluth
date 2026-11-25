import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy } from '../utils'
import { $ } from '../../index'

describe('Observable finally method', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('test observer finally', async () => {
    const promise$ = $()
    const promise1$ = promise$.then(
      () => Promise.resolve(),
      () => Promise.reject(),
    )
    promise1$.finally(() => console.log('finally'))
    promise$.next(Promise.resolve())
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finally')
    promise$.next(Promise.reject())
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'finally')
  })

  test('async finally returning resolved Promise preserves upstream resolved value', async () => {
    const s$ = $<number>()
    const values: number[] = []
    const finally$ = s$.finally(() => Promise.resolve('overwritten') as any)
    finally$.then((v) => values.push(v))

    s$.next(42)
    await vi.runAllTimersAsync()

    expect(finally$.value).toBe(42)
    expect(values).toEqual([42])
  })

  test('async finally returning resolved Promise preserves upstream rejection', async () => {
    const s$ = $<number>()
    const errors: unknown[] = []
    const upstreamError = new Error('upstream failed')

    s$
      .finally(() => Promise.resolve('ignored') as any)
      .catch((err) => {
        errors.push(err)
      })

    s$.next(Promise.reject(upstreamError))
    await vi.runAllTimersAsync()

    expect(errors).toEqual([upstreamError])
  })

  test('async finally returning rejected Promise rejects downstream with cleanup error', async () => {
    const s$ = $<number>()
    const errors: string[] = []

    s$
      .finally(() => Promise.reject(new Error('cleanup failed')))
      .catch((err: Error) => {
        errors.push(err.message)
      })

    s$.next(42)
    await vi.runAllTimersAsync()
    expect(errors).toEqual(['cleanup failed'])

    s$.next(Promise.reject(new Error('upstream failed')))
    await vi.runAllTimersAsync()
    expect(errors).toEqual(['cleanup failed', 'cleanup failed'])
  })

  test('stale async finally settling after a newer emit does not overwrite new value', async () => {
    let resolveFirstFinally!: (value: string) => void
    let rejectSecondFinally!: (reason: Error) => void
    let callCount = 0

    const s$ = $<number>()
    const values: number[] = []
    const errors: unknown[] = []

    const finally$ = s$.finally(() => {
      callCount += 1
      if (callCount === 1) {
        return new Promise<string>((resolve) => {
          resolveFirstFinally = resolve
        }) as any
      }
      if (callCount === 2) {
        return new Promise<string>((_, reject) => {
          rejectSecondFinally = reject
        }) as any
      }
      return undefined
    })

    finally$.then(
      (v) => values.push(v),
      (err) => errors.push(err),
    )

    s$.next(1)
    s$.next(2)
    s$.next(3)
    expect(finally$.value).toBe(3)
    expect(values).toEqual([3])

    resolveFirstFinally('stale-resolved')
    rejectSecondFinally(new Error('stale-rejected'))
    await vi.runAllTimersAsync()

    expect(finally$.value).toBe(3)
    expect(values).toEqual([3])
    expect(errors).toEqual([])
  })
})
