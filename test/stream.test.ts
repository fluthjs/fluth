import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, promiseFactory, promiseConsoleFactory, setTimeoutSleep } from './utils'
import { $, createStream } from '../index'

describe('stream test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })
  test('test stream base work', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 100)
    })
    const promise$ = $()
    promise$.then((value) => {
      console.log(value)
    })
    promise$.next(promise)

    await sleep(150)

    expect(consoleSpy).toHaveBeenNthCalledWith(1, true)
  })

  test('test stream execute order', async () => {
    const promise$ = $()

    promise$.then(
      (r) => console.log('resolve', r),
      (e) => console.log('reject', e),
    )

    promise$.next(1)
    promise$.next(Promise.reject(2))
    promise$.next(3)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolve', 3)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'reject', 2)
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

  test('test stream execute plugin', async () => {
    const promise$ = $()
    const observer1 = () => promiseFactory(100, 'observer1').then((value) => Promise.reject(value))
    const observer2 = () => promiseConsoleFactory(100, 'observer2')
    promise$.then(observer1).then(observer2)
    promise$.next(Promise.resolve())
    await sleep(210)
    // no executePlugin
    expect(consoleSpy).toBeCalledTimes(0)
    const executePlugin = ({ result: promise, unsubscribe }) => {
      setTimeout(() => {
        unsubscribe()
      }, 110)
      return promise.catch((err) => {
        console.log(err)
        return err
      })
    }

    promise$.use({ execute: executePlugin })
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
    const promise$ = $()
    const observer1 = () => promiseFactory(100, 'observer1')
    const observer2 = () => promiseFactory(100, 'observer2')
    promise$.then(observer1).then(observer2)
    const executePlugin = ({ result: promise }) =>
      promise.then((value) => {
        console.log(value)
        Promise.resolve(value)
      })
    promise$.use({ execute: executePlugin })
    promise$.next(Promise.resolve())
    await sleep(210)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'observer1')
  })

  test('test stream chain plugin', async () => {
    const promise$ = createStream({
      chain: (observer) =>
        Object.create(
          {},
          {
            aaa: {
              enumerable: true,
              get: () => {
                return observer.value
              },
            },
          },
        ) as {
          aaa: string
        },
    })()

    const observable$ = promise$.then((value) => value + ' word')
    promise$.next('hello')
    expect(promise$.aaa).toBe('hello')
    expect(observable$.aaa).toBe('hello word')
  })

  test('test stream chain use', async () => {
    const promise$ = createStream({
      chain: (observer) =>
        Object.create(
          {},
          {
            aaa: {
              enumerable: true,
              get: () => {
                return observer.value
              },
            },
          },
        ) as { aaa: string },
    })()

    const newPromise$ = promise$.use({
      chain: (observer) =>
        Object.create({}, { bbb: { enumerable: true, get: () => observer.value + '1' } }) as {
          bbb: string
        },
    })

    const observable$ = newPromise$.then((value) => value + ' word')
    promise$.next('hello')
    expect(promise$.aaa).toBe('hello')
    expect(newPromise$.bbb).toBe('hello1')
    expect(observable$.aaa).toBe('hello word')
    expect(observable$.bbb).toBe('hello word1')
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

  test('test stream finish', async () => {
    const promise$ = $()
    promise$.then((value) => console.log(value))
    promise$.next(Promise.resolve('1'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, '1')
    promise$.next(Promise.resolve('2'), true)
    await sleep(10)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, '2')
    promise$.next(Promise.resolve('3'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test stream finish when multiple deep sync child observer', async () => {
    const promise$ = $()
    const observer1 = () => console.log('observer1')
    const observer11 = () => console.log('observer11')
    const observer12 = () => console.log('observer12')
    const observer111 = () => console.log('observer111')
    const observer2 = () => console.log('observer2')
    const observer3 = () => console.log('observer3')
    const observer4 = () => console.log('observer4')
    const observable1$ = promise$.then(observer1)
    const observable11$ = observable1$.then(observer11)
    const observable12$ = observable1$.then(observer12)
    const observable111$ = observable11$.then(observer111)
    const observable2$ = promise$.then(observer2)
    const observable3$ = promise$.then(observer3)
    const observable4$ = promise$.then(observer4)
    promise$.next(true, true)
    // all observable should be clean
    expect(consoleSpy).toHaveBeenCalledTimes(7)
    expect((promise$ as any)._cacheRootPromise).toBeNull()
    expect((observable1$ as any)._cacheRootPromise).toBeNull()
    expect((observable11$ as any)._cacheRootPromise).toBeNull()
    expect((observable12$ as any)._cacheRootPromise).toBeNull()
    expect((observable111$ as any)._cacheRootPromise).toBeNull()
    expect((observable2$ as any)._cacheRootPromise).toBeNull()
    expect((observable3$ as any)._cacheRootPromise).toBeNull()
    expect((observable4$ as any)._cacheRootPromise).toBeNull()
    consoleSpy.mockClear()
    promise$.next(true)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
  })

  test('test stream finish when multiple deep async child observer', async () => {
    const promise$ = $()
    const observer1 = () => promiseConsoleFactory(100, 'observer1')
    const observer11 = () => promiseConsoleFactory(100, 'observer11')
    const observer12 = () => promiseConsoleFactory(100, 'observer12')
    const observer111 = () => promiseConsoleFactory(100, 'observer111')
    const observer2 = () => promiseConsoleFactory(100, 'observer2')
    const observer3 = () => promiseConsoleFactory(100, 'observer3')
    const observable1$ = promise$.then(observer1)
    const observable11$ = observable1$.then(observer11)
    const observable12$ = observable1$.then(observer12)
    const observable111$ = observable11$.then(observer111)
    const observable2$ = promise$.then(observer2)
    const observable3$ = promise$.then(observer3)
    promise$.next(Promise.resolve(), true)
    await sleep(310)
    expect(consoleSpy).toHaveBeenCalledTimes(6)
    // all observable should be clean
    expect((promise$ as any)._cacheRootPromise).toBeNull()
    expect((observable1$ as any)._cacheRootPromise).toBeNull()
    expect((observable11$ as any)._cacheRootPromise).toBeNull()
    expect((observable12$ as any)._cacheRootPromise).toBeNull()
    expect((observable111$ as any)._cacheRootPromise).toBeNull()
    expect((observable2$ as any)._cacheRootPromise).toBeNull()
    expect((observable3$ as any)._cacheRootPromise).toBeNull()
    consoleSpy.mockClear()
    promise$.next(Promise.resolve())
    await sleep(310)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
  })

  test('test stream unsubscribe when sync child observer', async () => {
    const promise$ = $()
    const observer1 = () => console.log('observer1')
    const observer11 = () => console.log('observer11')
    const observer12 = () => console.log('observer12')
    const observer111 = () => console.log('observer111')
    const observer2 = () => console.log('observer2')
    const observer3 = () => console.log('observer3')
    const observer4 = () => console.log('observer4')
    const observable1$ = promise$.then(observer1)
    const observable11$ = observable1$.then(observer11)
    const observable12$ = observable1$.then(observer12)
    const observable111$ = observable11$.then(observer111)
    const observable2$ = promise$.then(observer2)
    const observable3$ = promise$.then(observer3)
    const observable4$ = promise$.then(observer4)
    promise$.unsubscribe()
    promise$.next(true)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    expect((promise$ as any)._cacheRootPromise).toBeNull()
    expect((observable1$ as any)._cacheRootPromise).toBeNull()
    expect((observable11$ as any)._cacheRootPromise).toBeNull()
    expect((observable12$ as any)._cacheRootPromise).toBeNull()
    expect((observable111$ as any)._cacheRootPromise).toBeNull()
    expect((observable2$ as any)._cacheRootPromise).toBeNull()
    expect((observable3$ as any)._cacheRootPromise).toBeNull()
    expect((observable4$ as any)._cacheRootPromise).toBeNull()
  })

  test('test unsubscribe when async child observer', async () => {
    const promise$ = $()
    const observer1 = () => promiseConsoleFactory(100, 'observer1')
    const observer11 = () => promiseConsoleFactory(100, 'observer111')
    const observer12 = () => promiseConsoleFactory(100, 'observer12')
    const observer111 = () => promiseConsoleFactory(100, 'observer111')
    const observer2 = () => promiseConsoleFactory(100, 'observer2')
    const observer3 = () => promiseConsoleFactory(100, 'observer3')
    const observable1$ = promise$.then(observer1)
    const observable11$ = observable1$.then(observer11)
    const observable12$ = observable1$.then(observer12)
    const observable111$ = observable11$.then(observer111)
    const observable2$ = promise$.then(observer2)
    const observable3$ = promise$.then(observer3)
    promise$.unsubscribe()
    promise$.next(Promise.resolve())
    await sleep(310)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    expect((promise$ as any)._cacheRootPromise).toBeNull()
    expect((observable1$ as any)._cacheRootPromise).toBeNull()
    expect((observable11$ as any)._cacheRootPromise).toBeNull()
    expect((observable12$ as any)._cacheRootPromise).toBeNull()
    expect((observable111$ as any)._cacheRootPromise).toBeNull()
    expect((observable2$ as any)._cacheRootPromise).toBeNull()
    expect((observable3$ as any)._cacheRootPromise).toBeNull()
  })

  test('test unsubscribe when child is pending', async () => {
    const promise$ = $()
    const observer1 = () => promiseConsoleFactory(100, 'observer1')
    const observer11 = () => promiseConsoleFactory(100, 'observer111')
    const observable1$ = promise$.then(observer1)
    const observable11$ = observable1$.then(observer11)
    promise$.next(Promise.resolve())
    await sleep(50)
    promise$.unsubscribe()
    await sleep(160)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
    expect((promise$ as any)._cacheRootPromise).toBeNull()
    expect((observable1$ as any)._cacheRootPromise).toBeNull()
    expect((observable11$ as any)._cacheRootPromise).toBeNull()
  })

  test('test stream finishCallback', async () => {
    const promise$ = $()
    promise$.afterComplete((value, status) => console.log(value, status))
    promise$.next(Promise.resolve('1'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, '1', 'resolved')
  })

  test('test set function when empty init', async () => {
    const promise$ = $()
    promise$.set((state) => {
      state.aaa = '123'
    })
    expect(promise$.value).toEqual(undefined)
  })

  test('test set function when init', async () => {
    const promise$ = $({ aaa: '123' })
    promise$.set((state) => {
      state.aaa = '456'
    })
    expect(promise$.value).toEqual({ aaa: '456' })
  })

  test('test set immutable', async () => {
    const promise$ = $({ key1: { key11: 'test' }, key2: { key22: 'test' } })
    const value = promise$.value
    promise$.set((state) => {
      state.key2.key22 = 'test2'
    })
    expect(value === promise$.value).toBeFalsy()
    expect(value?.key2 === promise$.value?.key2).toBeFalsy()
    expect(value?.key1 === promise$.value?.key1).toBeTruthy()
  })

  test('test set recipe is async function', async () => {
    const promise$ = $({ key1: { key11: 'test' }, key2: { key22: 'test' } })
    const value = promise$.value
    promise$.set(async (state) => {
      await setTimeoutSleep(10)
      state.key2.key22 = 'test2'
    })
    await sleep(11)
    expect(value === promise$.value).toBeFalsy()
    expect(value?.key2 === promise$.value?.key2).toBeFalsy()
    expect(value?.key1 === promise$.value?.key1).toBeTruthy()
  })

  test('test skip method without param', async () => {
    const promise$ = $()
    promise$.skip().then(() => console.log('test'))
    promise$.next(1)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    promise$.next(2)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  test('test skip method with param', async () => {
    const promise$ = $()
    promise$.skip(2).then(() => console.log('test'))
    promise$.next(1)
    promise$.next(2)
    promise$.next(3)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })
})
