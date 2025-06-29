import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, delayExec, debounce, consoleExec } from '../../index'

describe('consoleExec plugins test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test consoleExec plugin', async () => {
    const stream$ = $()
    stream$.use(consoleExec)

    stream$.next(1)
    expect(consoleSpy).toHaveBeenCalledWith('value', 1)

    const promise = Promise.resolve(2)
    stream$.next(promise)
    await promise
    expect(consoleSpy).toHaveBeenCalledWith('value', 2)

    stream$.next(3)
    stream$.next(4)
    expect(consoleSpy).toHaveBeenCalledWith('value', 3)
    expect(consoleSpy).toHaveBeenCalledWith('value', 4)
    expect(consoleSpy).toHaveBeenCalledTimes(4)
  })

  test('test remove consoleExec plugin', async () => {
    const plugin = delayExec(100)
    const stream$ = $().use(plugin)
    stream$.then((value) => {
      console.log(value)
    })
    stream$.next(1)
    await sleep(99)
    expect(consoleSpy).not.toHaveBeenCalled()
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledWith(1)
    stream$.remove(plugin)
    stream$.next(2)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test debounce and consoleExec', async () => {
    const promise$ = $()
    promise$
      .pipe(debounce(100))
      .use(consoleExec)
      .then((value) => console.log(value))
    promise$.next(1)
    promise$.next(2)
    promise$.next(3)
    promise$.next(4)
    promise$.next(5) // 打印 5
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'value', 1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'value', 2)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'value', 3)
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'value', 4)
    expect(consoleSpy).toHaveBeenNthCalledWith(5, 'value', 5)
    await sleep(200)
    expect(consoleSpy).toHaveBeenNthCalledWith(6, 'value', 5)
    expect(consoleSpy).toHaveBeenNthCalledWith(7, 5)
  })
})
