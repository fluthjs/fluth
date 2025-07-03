import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $ } from '../../index'

describe('Observable thenImmediate method', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('test resolved observer thenImmediate will execute immediate', async () => {
    const promise$ = $()
    const observable$ = promise$.then((value) => Promise.resolve(value))
    promise$.next(Promise.resolve('1'))
    await sleep(1)
    observable$.thenImmediate((value) => console.log(value))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, '1')
  })
})
