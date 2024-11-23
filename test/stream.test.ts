import { expect, describe, test, vi, beforeEach } from 'vitest'
import {
  consoleSpy,
  sleep,
  promiseFactory,
  promiseConsoleFactory,
} from './utils'
import { Stream } from '../index'

describe('stream test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
  })
  test('test stream base work', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 100)
    })
    const promise$ = new Stream()
    promise$.then((data) => {
      console.log(data)
    })
    promise$.next(promise)

    await sleep(150)

    expect(consoleSpy).toHaveBeenNthCalledWith(1, true)
  })

  test('test stream pause', async () => {
    const promise = Promise.resolve()
    const promise$ = new Stream()
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

  test('test stream restart', async () => {
    const promise$ = new Stream()
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

  test('test stream then plugin', async () => {
    const promise$ = new Stream()
    promise$.plugin.then.push((unsubscribe) =>
      setTimeout(() => {
        console.info('unsubscribe')
        unsubscribe()
      }, 150),
    )
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

  test('test stream remove then plugin', async () => {
    const promise$ = new Stream()
    const observer1 = () => promiseConsoleFactory(100, 'observer1')
    promise$.plugin.then.push((unsubscribe) => () => unsubscribe())
    promise$.then(observer1)
    promise$.next(Promise.resolve())
    await sleep(110)
    expect(consoleSpy).toHaveBeenCalledWith('observer1')
    consoleSpy.mockClear()
    promise$.plugin.then = []
    const observer2 = () => promiseConsoleFactory(100, 'observer2')
    promise$.then(observer2)
    promise$.next(Promise.resolve())
    await sleep(110)
    expect(consoleSpy).toHaveBeenCalledWith('observer2')
    consoleSpy.mockClear()
    promise$.next(Promise.resolve())
    await sleep(110)
    expect(consoleSpy).toHaveBeenCalledWith('observer2')
  })

  test('test stream thenOnce', async () => {
    const promise$ = new Stream()
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

  test('test stream execute plugin', async () => {
    const promise$ = new Stream()
    const observer1 = () =>
      promiseFactory(100, 'observer1').then((data) => Promise.reject(data))
    const observer2 = () => promiseConsoleFactory(100, 'observer2')
    promise$.then(observer1).then(observer2)
    promise$.next(Promise.resolve())
    await sleep(210)
    // no executePlugin
    expect(consoleSpy).toBeCalledTimes(0)
    const executePlugin = (
      promise: Promise<unknown>,
      unsubscribe: () => void,
    ) => {
      setTimeout(() => {
        unsubscribe()
      }, 110)
      return promise.catch((err) => {
        console.log(err)
        return err
      })
    }
    promise$.plugin.execute.push(executePlugin)
    promise$.next(Promise.resolve())
    await sleep(210)
    // executePlugin catch work
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'observer1')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'observer2')
    consoleSpy.mockClear()
    promise$.next(Promise.resolve())
    await sleep(210)
    // executePlugin unsubscribe work
    expect(consoleSpy).toBeCalledTimes(0)
  })

  test('test stream add execute plugin', async () => {
    const promise$ = new Stream()
    const observer1 = () => promiseFactory(100, 'observer1')
    const observer2 = () => promiseFactory(100, 'observer2')
    promise$.then(observer1).then(observer2)
    const executePlugin = (promise: Promise<unknown>) =>
      promise.then((data) => {
        console.log(data)
        Promise.resolve(data)
      })
    promise$.plugin.execute.push(executePlugin)
    promise$.next(Promise.resolve())
    await sleep(210)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'observer1')
    consoleSpy.mockClear()
    promise$.plugin.execute = []
    promise$.next(Promise.resolve())
    await sleep(210)
    expect(consoleSpy).toBeCalledTimes(0)
  })

  test('test stream finish promise', async () => {
    const promise$ = new Stream()
    promise$.then((data) => console.log(data))
    promise$.next(Promise.resolve('1'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, '1')
    promise$.next(Promise.resolve('2'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, '2')
    promise$.next(Promise.resolve('3'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
    promise$.finish.then((data) => console.log(data))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, '2')
  })

  test('test stream catch', async () => {
    const promise$ = new Stream()
    promise$.catch(() => console.log('catch'))
    promise$.next(Promise.reject())
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'catch')
  })

  test('test stream finally', async () => {
    const promise$ = new Stream()
    promise$.finally(() => console.log('finally'))
    promise$.next(Promise.resolve())
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finally')
    promise$.next(Promise.reject())
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'finally')
  })

  test('test stream finish', async () => {
    const promise$ = new Stream()
    promise$.finish.then((data) => console.log(data))
    promise$.next(Promise.resolve('1'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, '1')
  })
})

describe('observer test', async () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
  })
  test('test observer reject', async () => {
    const promise = Promise.resolve()
    const promise$ = new Stream()
    const observer1 = () =>
      promiseFactory(100, 'observer1').then((data) => Promise.reject(data))
    promise$.then(observer1).then(
      () => console.log('resolve'),
      () => console.log('reject'),
    )
    promise$.next(promise)
    await sleep(110)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'reject')
  })

  test('test observer unsubscribe', async () => {
    const promise$ = new Stream()
    const observer1 = () => promiseConsoleFactory(100, 'observer1')
    const observer2 = () => promiseConsoleFactory(100, 'observer2')
    const observer3 = () => promiseConsoleFactory(100, 'observer3')
    const subjection1$ = promise$.then(observer1)
    const subjection2$ = subjection1$.then(observer2)
    subjection2$.then(observer3)
    promise$.next(Promise.resolve())
    await sleep(310)
    expect(consoleSpy).toBeCalledTimes(3)
    consoleSpy.mockClear()
    subjection2$.unsubscribe()
    promise$.next(Promise.resolve())
    await sleep(310)
    expect(consoleSpy).toBeCalledTimes(1)
  })

  test('test observer unsubscribe', async () => {
    const promise$ = new Stream()
    const observer1 = () => promiseConsoleFactory(100, 'observer1')
    const observer2 = () => promiseConsoleFactory(100, 'observer2')
    const observer3 = () => promiseConsoleFactory(100, 'observer3')
    promise$.then(observer1).then(observer2).then(observer3)
    promise$.next(Promise.resolve())
    await sleep(310)
    expect(consoleSpy).toBeCalledTimes(3)
    consoleSpy.mockClear()
    promise$.unsubscribe()
    promise$.next(Promise.resolve())
    await sleep(310)
    expect(consoleSpy).toBeCalledTimes(0)
  })

  test('test resolved observer thenImmediate will execute immediate', async () => {
    const promise$ = new Stream()
    const subjection$ = promise$.then((data) => Promise.resolve(data))
    promise$.next(Promise.resolve('1'))
    await sleep(1)
    subjection$.thenImmediate((data) => console.log(data))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, '1')
  })

  test('test observer thenOnce', async () => {
    const promise$ = new Stream()
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

  test('test observer execute by operator', async () => {
    const promise$ = new Stream()

    const observer1 = () => promiseConsoleFactory(100, 'observer1')
    const observer2 = () => promiseConsoleFactory(100, 'observer2')
    const observer3 = () => promiseConsoleFactory(100, 'observer3')
    const subjection1$ = promise$.then(observer1)
    const subjection2$ = subjection1$.then(observer2)
    subjection2$.then(observer3)
    subjection2$.execute()
    expect(consoleSpy).toBeCalledTimes(0)
    promise$.next(Promise.resolve())
    await sleep(310)
    expect(consoleSpy).toBeCalledTimes(3)
    consoleSpy.mockClear()
    subjection2$.execute()
    await sleep(110)
    expect(consoleSpy).toBeCalledWith('observer2')
  })

  test('test observer catch', async () => {
    const promise$ = new Stream()
    promise$
      .then(() => Promise.reject('catch'))
      .catch((data) => console.log(data))
    promise$.next(Promise.resolve())
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'catch')
  })

  test('test observer finally', async () => {
    const promise$ = new Stream()
    const promise1$ = promise$.then(
      () => Promise.resolve(),
      () => Promise.reject(),
    )
    promise1$.finally(() => console.log('finally'))
    promise$.next(Promise.resolve())
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finally')
    promise$.next(Promise.reject())
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'finally')
  })

  test('test observer finish', async () => {
    const promise$ = new Stream()
    const promise1$ = promise$.then(() => Promise.resolve('1'))
    promise1$.finish.then((data) => console.log(data))
    promise$.next(Promise.resolve('1'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, '1')
  })

  test('test observer finish and then order', async () => {
    const promise$ = new Stream()
    const promise1$ = promise$.then(() => Promise.resolve())
    promise1$.then(() => console.log('then'))
    promise1$.finish.then(() => console.log('finish'))
    promise$.next(Promise.resolve(), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finish')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'then')
  })
})
