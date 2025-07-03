import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy } from '../utils'
import { $ } from '../../index'

describe('Observable get method', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('test get method', async () => {
    const promise$ = $({ a: 1, b: { c: 2 } })
    const observable$ = promise$.get((value) => value?.b)
    observable$.then((value) => {
      console.log(value?.c)
    })
    expect(observable$.value?.c).toBe(2)
    promise$.set((value) => {
      value.a = 2
    })
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    promise$.set((value) => {
      value.b.c = 3
    })
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 3)
  })
})
