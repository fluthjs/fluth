import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from './utils'
import { $, delay, delayExec, throttle, debounce, consoleExec, skip } from '../index'

describe('plugins test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test delay chain plugins', async () => {
    const stream$ = $().use(delay)
    const observable$ = stream$.delay(100)

    stream$.next(1)
    expect(stream$.value).toBe(1)
    expect(observable$.value).toBeUndefined()
    await sleep(100)
    expect(observable$.value).toBe(1)
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

  test('test throttle plugins', async () => {
    const stream$ = $().use(throttle)
    stream$.throttle(100).then((value) => {
      console.log(value)
    })

    await sleep(30)
    stream$.next(1)
    await sleep(30)
    stream$.next(2)
    await sleep(30)
    await sleep(30)
    stream$.next(3)
    await sleep(30)
    stream$.next(4)
    await sleep(30)
    stream$.next(5)
    await sleep(30)
    stream$.next(6)
    await sleep(30)
    stream$.next(7)
    await sleep(89)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 3)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 6)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 7)
  })

  test('test debounce plugins', async () => {
    const stream$ = $().use(debounce)
    stream$.debounce(100).then((value) => {
      console.log(value)
    })

    await sleep(60)
    stream$.next(1)
    await sleep(60)
    stream$.next(2)
    await sleep(60)
    stream$.next(3)
    await sleep(60)
    stream$.next(4)
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 4)
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

  test('test combinePlugin', async () => {
    const stream$ = $().use(delay, throttle, debounce)
    stream$
      .delay(100)
      .throttle(100)
      .then((value) => {
        console.log(value)
      })
    stream$.next(1)
    await sleep(30)
    stream$.next(2)
    await sleep(30)
    stream$.next(3)
    await sleep(30)
    stream$.next(4)
    await sleep(9)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 1)
    await sleep(99)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 4)
  })

  test('test remove plugin', async () => {
    const plugin = delayExec(100)
    const stream$ = $().use(plugin)
    stream$.then((value) => {
      console.info(Date.now())
      console.log(value)
    })
    stream$.next(1)
    console.info(Date.now())
    await sleep(99)
    expect(consoleSpy).not.toHaveBeenCalled()
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledWith(1)
    stream$.remove(plugin)
    stream$.next(2)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test delayExec and consoleExec', async () => {
    const promise$ = $().use(delayExec(100), consoleExec)

    promise$.then((value) => value + 1).then((value) => value + 1)
    promise$.next(1)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'value', 1)
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'value', 2)
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'value', 3)
  })

  test('test throttle and consoleExec', async () => {
    const promise$ = $().use(debounce)
    promise$.debounce(100).then((value) => {
      console.log(value)
    })
    promise$.next(1)
    promise$.next(2)
    promise$.next(3)
    promise$.next(4)
    promise$.next(5) // 打印 5
    await sleep(100)
  })

  test('test skip plugin with param', async () => {
    const promise$ = $().use(skip)
    promise$.skip(2).then(() => console.log('test'))
    promise$.next(1)
    promise$.next(2)
    promise$.next(3)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  test('test skipFilter plugin', async () => {
    const promise$ = $().use(skip)
    promise$.skipFilter((time) => time > 2).then(() => console.log('test'))
    promise$.next(1) // time = 2, filter returns false
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    promise$.next(2) // time = 3, filter returns true
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    promise$.next(3) // time = 4, filter returns true
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })
})
