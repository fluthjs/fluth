import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy } from '../utils'
import { $ } from '../../index'

describe('Observable catch method', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('test observer catch', async () => {
    const promise$ = $()
    promise$.then(() => Promise.reject('catch')).catch((value) => console.log(value))
    promise$.next(Promise.resolve())
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'catch')
  })
})
