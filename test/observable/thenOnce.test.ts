import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, promiseConsoleFactory } from '../utils'
import { $ } from '../../index'

describe('Observable thenOnce method', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('test observer thenOnce', async () => {
    const promise$ = $()
    const observer1 = () => promiseConsoleFactory(100, 'observer1')
    const observer2 = () => promiseConsoleFactory(100, 'observer2')
    const observer3 = () => promiseConsoleFactory(100, 'observer3')
    promise$.then(observer1).thenOnce(observer2).then(observer3)
    promise$.next(Promise.resolve())

    await sleep(310)
    expect(consoleSpy).toBeCalledTimes(3)
    consoleSpy.mockClear()
    promise$.next(Promise.resolve())
    await sleep(310)
    expect(consoleSpy).toBeCalledTimes(1)
  })
})
