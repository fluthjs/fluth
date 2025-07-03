import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, promiseConsoleFactory } from '../utils'
import { $ } from '../../index'

describe('Stream restart method', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test stream restart', async () => {
    const promise$ = $()
    const observer1 = () => promiseConsoleFactory(100, 'observer1')
    const observer2 = () => promiseConsoleFactory(100, 'observer2')
    promise$.pause()
    promise$.then(observer1).then(observer2)
    promise$.next(Promise.resolve())
    await sleep(210)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    promise$.restart()
    promise$.next(Promise.resolve())
    await sleep(210)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })
})
