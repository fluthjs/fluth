import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy } from '../utils'
import { $ } from '../../index'

describe('Observable change method', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('test change method', async () => {
    const promise$ = $<{ num: number }>()
    promise$.change((value) => value?.num).then(() => console.log('test'))
    promise$.next({ num: 1 })
    promise$.next({ num: 2 })
    promise$.next({ num: 2 })
    promise$.next({ num: 1 })
    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })
})
