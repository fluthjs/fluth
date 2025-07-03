import { expect, describe, test, vi, beforeEach } from 'vitest'
import { sleep, consoleSpy } from '../utils'
import { $ } from '../../index'

describe('Stream constructor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('test Stream with boundary value', async () => {
    const promise$ = $(0)
    expect(promise$.value).toBe(0)
    const promise1$ = $(undefined)
    expect(promise1$.value).toBe(undefined)
    const promise2$ = $(null)
    expect(promise2$.value).toBe(null)
    const promise3$ = $(false)
    expect(promise3$.value).toBe(false)
  })

  test('test stream base work', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 100)
    })
    const promise$ = $()
    promise$.then((value) => {
      console.log(value)
    })
    promise$.next(promise)

    await sleep(150)

    expect(consoleSpy).toHaveBeenNthCalledWith(1, true)
  })
})
