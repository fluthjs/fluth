import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, delayExec, consoleExec } from '../../index'

describe('plugins test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test delayExec and consoleExec', async () => {
    const promise$ = $().use(delayExec(100), consoleExec)

    promise$
      .then((value) => value + 1)
      .use(delayExec(100), consoleExec)
      .then((value) => value + 1)
      .use(delayExec(100), consoleExec)
    promise$.next(1)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'value', 1)
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'value', 2)
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'value', 3)
  })

  test('test delayExecute plugin', async () => {
    const stream$ = $()
    stream$.use(delayExec(100))
    stream$.then((value) => {
      console.log(value)
    })

    stream$.next(1)
    await sleep(99)
    expect(consoleSpy).not.toHaveBeenCalled()
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledWith(1)
  })
})
