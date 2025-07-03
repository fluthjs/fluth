import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
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
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finally')
    promise$.next(Promise.reject())
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'finally')
  })
})
