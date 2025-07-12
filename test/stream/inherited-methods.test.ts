import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, promiseConsoleFactory } from '../utils'
import { $, change } from '../../index'

describe('Stream inherited methods from Observable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test stream then plugin', async () => {
    const promise$ = $()
    const plugin = {
      then: (unsubscribe) => {
        setTimeout(() => {
          console.info('unsubscribe')
          unsubscribe()
        }, 150)
      },
    }
    promise$.use(plugin)
    const observer1 = () => promiseConsoleFactory(100, 'observer1')
    promise$.then(observer1)
    promise$.next(Promise.resolve())
    await sleep(110)
    expect(consoleSpy).toHaveBeenCalledWith('observer1')
    consoleSpy.mockClear()
    // unsubscribe has finished
    await sleep(50)
    promise$.next(Promise.resolve())
    await sleep(110)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
  })

  test('test stream thenOnce', async () => {
    const promise$ = $()
    const observer1 = () => promiseConsoleFactory(100, 'observer1')
    const observer2 = () => promiseConsoleFactory(100, 'observer2')
    const observer3 = () => promiseConsoleFactory(100, 'observer3')
    promise$.thenOnce(observer1).then(observer2).then(observer3)
    promise$.next(Promise.resolve())

    await sleep(310)
    expect(consoleSpy).toBeCalledTimes(3)
    consoleSpy.mockClear()
    promise$.next(Promise.resolve())
    await sleep(310)
    expect(consoleSpy).toBeCalledTimes(0)
  })

  test('test thenImmediate', async () => {
    const promise$ = $(1)
    promise$.thenImmediate((value) => {
      console.log(value)
    })
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 1)
  })

  test('test stream catch', async () => {
    const promise$ = $()
    promise$.catch(() => console.log('catch'))
    promise$.next(Promise.reject())
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'catch')
  })

  test('test stream catch data', async () => {
    const promise$ = $<number>()
    promise$.catch((err) => err).then((value) => console.log(value))
    promise$.next(Promise.reject(1))
    await sleep(1)

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 1)
  })

  test('test stream finally', async () => {
    const promise$ = $()
    promise$.finally(() => console.log('finally'))
    promise$.next(Promise.resolve())
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finally')
    promise$.next(Promise.reject())
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'finally')
  })

  test('test stream finishCallback', async () => {
    const promise$ = $()
    promise$.afterComplete((value, status) => console.log(value, status))
    promise$.next(Promise.resolve('1'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, '1', 'resolved')
  })

  test('test stream change', async () => {
    const promise$ = $({ a: 1 })
    promise$.pipe(change((value) => value?.a)).then((value) => console.log(value))
    promise$.next({ a: 2 })
    expect(consoleSpy).toHaveBeenNthCalledWith(1, { a: 2 })
  })
})
