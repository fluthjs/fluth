import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, promiseConsoleFactory } from '../utils'
import { $ } from '../../index'

describe('Observable execute method', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('test observer execute by operator', async () => {
    const promise$ = $()

    const observer1 = () => promiseConsoleFactory(100, 'observer1')
    const observer2 = () => promiseConsoleFactory(100, 'observer2')
    const observer3 = () => promiseConsoleFactory(100, 'observer3')
    const observable1$ = promise$.then(observer1)
    const observable2$ = observable1$.then(observer2)
    observable2$.then(observer3)
    observable2$.execute()
    expect(consoleSpy).toBeCalledTimes(0)
    promise$.next(Promise.resolve())
    await sleep(310)
    expect(consoleSpy).toBeCalledTimes(3)
    consoleSpy.mockClear()
    observable2$.execute()
    await sleep(110)
    expect(consoleSpy).toBeCalledWith('observer2')
  })
})
