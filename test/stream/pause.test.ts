import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, promiseConsoleFactory } from '../utils'
import { $ } from '../../index'

describe('Stream pause method', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test stream pause', async () => {
    const promise = Promise.resolve()
    const promise$ = $()
    const observer1 = () =>
      promiseConsoleFactory(100, 'observer1').then(() => {
        promise$.pause()
      })
    const observer2 = () => promiseConsoleFactory(100, 'observer2')
    const res = promise$.then(observer1)
    res.then(observer2)
    promise$.next(promise)
    await sleep(110)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'observer1')
    await sleep(100)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })
})
