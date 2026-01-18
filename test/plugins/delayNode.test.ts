import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, delayNode, consoleNode } from '../../index'

describe('plugins test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test delay and consoleNode', async () => {
    const promise$ = $().use(delayNode(100), consoleNode())

    promise$
      .then((value) => value + 1)
      .use(delayNode(100), consoleNode())
      .then((value) => value + 1)
      .use(delayNode(100), consoleNode())
    promise$.next(1)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 1)
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolve', 2)
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'resolve', 3)
  })

  test('test delayute plugin', async () => {
    const stream$ = $()
    stream$.use(delayNode(100))
    stream$.then((value) => {
      console.log(value)
    })

    stream$.next(1)
    await sleep(99)
    expect(consoleSpy).not.toHaveBeenCalled()
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenCalledWith(1)
  })
})
