import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, setTimeoutSleep, promiseFactory, promiseConsoleFactory } from './utils'
import { $ } from '../index'

describe('observer test', async () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })
  test('test observer reject', async () => {
    const promise = Promise.resolve()
    const promise$ = $()
    const observer1 = () => promiseFactory(100, 'observer1').then((value) => Promise.reject(value))
    promise$.then(observer1).then(
      () => console.log('resolve'),
      () => console.log('reject'),
    )
    promise$.next(promise)
    await sleep(110)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'reject')
  })

  test('test observer chain then reject', async () => {
    const promise$ = $()
    promise$.then((value) => console.log(value)).then((value) => console.log(value))
    promise$.next(Promise.resolve())
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
    promise$.next(Promise.reject())
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test observer then without onFulfilled and onRejected', async () => {
    // then without onFulfilled and onRejected only bypass resolve value
    const promise$ = $()
    promise$.then().then(
      (value) => console.log(value),
      (error) => console.log(error),
    )

    promise$.next('resolve')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve')
    consoleSpy.mockClear()
    promise$.next(Promise.reject('error'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
  })

  test('test observer unsubscribe', async () => {
    const promise$ = $()
    const observer1 = () => promiseConsoleFactory(100, 'observer1')
    const observer2 = () => promiseConsoleFactory(100, 'observer2')
    const observer3 = () => promiseConsoleFactory(100, 'observer3')
    const observable1$ = promise$.then(observer1)
    const observable2$ = observable1$.then(observer2)
    observable2$.then(observer3)
    promise$.next(Promise.resolve())
    await sleep(310)
    expect(consoleSpy).toBeCalledTimes(3)
    consoleSpy.mockClear()
    observable2$.unsubscribe()
    promise$.next(Promise.resolve())
    await sleep(310)
    expect(consoleSpy).toBeCalledTimes(1)
  })

  test('test observer unsubscribe when sync child observer', async () => {
    const promise$ = $()
    const observer1 = () => console.log('observer1')
    const observer11 = () => console.log('observer11')
    const observer12 = () => console.log('observer12')
    const observer111 = () => console.log('observer111')

    const observable1$ = promise$.then(observer1)
    const observable11$ = observable1$.then(observer11)
    const observable12$ = observable1$.then(observer12)
    const observable111$ = observable11$.then(observer111)

    observable1$.unsubscribe()
    promise$.next(true)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    expect((observable1$ as any)._cacheRootPromise).toBeNull()
    expect((observable11$ as any)._cacheRootPromise).toBeNull()
    expect((observable12$ as any)._cacheRootPromise).toBeNull()
    expect((observable111$ as any)._cacheRootPromise).toBeNull()
  })

  test('test observer unsubscribe when async child observer', async () => {
    const promise$ = $()
    const observer1 = () => promiseConsoleFactory(100, 'observer1')
    const observer11 = () => promiseConsoleFactory(100, 'observer111')
    const observer12 = () => promiseConsoleFactory(100, 'observer12')
    const observer111 = () => promiseConsoleFactory(100, 'observer111')

    const observable1$ = promise$.then(observer1)
    const observable11$ = observable1$.then(observer11)
    const observable12$ = observable1$.then(observer12)
    const observable111$ = observable11$.then(observer111)

    // 从中间节点开始测试
    observable1$.unsubscribe()
    promise$.next(Promise.resolve())
    await sleep(310)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    expect((observable1$ as any)._cacheRootPromise).toBeNull()
    expect((observable11$ as any)._cacheRootPromise).toBeNull()
    expect((observable12$ as any)._cacheRootPromise).toBeNull()
    expect((observable111$ as any)._cacheRootPromise).toBeNull()
  })

  test('test observer unsubscribe when observer is pending', async () => {
    const promise$ = $()
    const observer1 = () => promiseConsoleFactory(100, 'observer1')
    const observer11 = () => promiseConsoleFactory(100, 'observer111')

    const observable1$ = promise$.then(observer1)
    const observable11$ = observable1$.then(observer11)

    // 从中间节点开始测试
    promise$.next(Promise.resolve())
    await sleep(50)
    observable1$.unsubscribe()
    await sleep(160)
    expect(consoleSpy).toHaveBeenCalledTimes(2) // 与根节点测试不同，这里应该为0
    expect((observable1$ as any)._cacheRootPromise).toBeNull()
    expect((observable11$ as any)._cacheRootPromise).toBeNull()
  })

  test('test observer unsubscribe when child observer is pending', async () => {
    const promise$ = $()
    const observer1 = () => promiseConsoleFactory(100, 'observer1')
    const observer11 = () => promiseConsoleFactory(100, 'observer111')

    const observable1$ = promise$.then(observer1)
    const observable11$ = observable1$.then(observer11)

    // 从中间节点开始测试
    promise$.next(Promise.resolve())
    await sleep(150)
    observable1$.unsubscribe()
    await sleep(60)
    expect(consoleSpy).toHaveBeenCalledTimes(2) // 与根节点测试不同，这里应该为0
    expect((observable1$ as any)._cacheRootPromise).toBeNull()
    expect((observable11$ as any)._cacheRootPromise).toBeNull()
  })

  test('test resolved observer thenImmediate will execute immediate', async () => {
    const promise$ = $()
    const observable$ = promise$.then((value) => Promise.resolve(value))
    promise$.next(Promise.resolve('1'))
    await sleep(1)
    observable$.thenImmediate((value) => console.log(value))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, '1')
  })

  test('test afterUnsubscribe', async () => {
    const observable$ = $().then()
    observable$.afterUnsubscribe(() => console.log('unsubscribe1'))
    observable$.afterUnsubscribe(() => console.log('unsubscribe2'))
    observable$.unsubscribe()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe1')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unsubscribe2')
  })

  test('test offUnsubscribe', async () => {
    const observable$ = $().then()
    const callback1 = () => console.log('unsubscribe1')
    const callback2 = () => console.log('unsubscribe2')
    const callback3 = () => console.log('unsubscribe3')

    observable$.afterUnsubscribe(callback1)
    observable$.afterUnsubscribe(callback2)
    observable$.afterUnsubscribe(callback3)

    observable$.offUnsubscribe(callback2)

    observable$.unsubscribe()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe1')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unsubscribe3')
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test offUnsubscribe with non-existent callback', async () => {
    const observable$ = $().then()
    const callback1 = () => console.log('unsubscribe1')
    const callback2 = () => console.log('unsubscribe2')
    const nonExistentCallback = () => console.log('non-existent')

    observable$.afterUnsubscribe(callback1)
    observable$.afterUnsubscribe(callback2)

    // 尝试移除不存在的回调
    observable$.offUnsubscribe(nonExistentCallback)

    observable$.unsubscribe()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe1')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unsubscribe2')
    expect(consoleSpy).toHaveBeenCalledTimes(2)
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

  test('test observer catch', async () => {
    const promise$ = $()
    promise$.then(() => Promise.reject('catch')).catch((value) => console.log(value))
    promise$.next(Promise.resolve())
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'catch')
  })

  test('test observer finally', async () => {
    const promise$ = $()
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

  test('test observer afterComplete', async () => {
    const promise$ = $()
    const promise1$ = promise$.then(() => Promise.resolve('1'))
    promise1$.afterComplete((value) => console.log(`finish1: ${value}`))
    promise1$.afterComplete((value) => console.log(`finish2: ${value}`))
    promise$.next(1, true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finish1: 1')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'finish2: 1')
  })

  test('test offComplete', async () => {
    const promise$ = $()
    const promise1$ = promise$.then(() => Promise.resolve('1'))
    const callback1 = (value) => console.log(`finish1: ${value}`)
    const callback2 = (value) => console.log(`finish2: ${value}`)
    const callback3 = (value) => console.log(`finish3: ${value}`)

    promise1$.afterComplete(callback1)
    promise1$.afterComplete(callback2)
    promise1$.afterComplete(callback3)

    promise1$.offComplete(callback2)

    promise$.next(1, true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finish1: 1')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'finish3: 1')
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test offComplete with non-existent callback', async () => {
    const promise$ = $()
    const promise1$ = promise$.then(() => Promise.resolve('1'))
    const callback1 = (value) => console.log(`finish1: ${value}`)
    const callback2 = (value) => console.log(`finish2: ${value}`)
    const nonExistentCallback = (value) => console.log(`non-existent: ${value}`)

    promise1$.afterComplete(callback1)
    promise1$.afterComplete(callback2)

    promise1$.offComplete(nonExistentCallback)

    promise$.next(1, true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finish1: 1')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'finish2: 1')
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test offComplete when promise is rejected', async () => {
    const promise$ = $()
    const promise1$ = promise$.then(() => Promise.reject('error'))
    const callback1 = (value, status) => console.log(`finish1: ${value}, status: ${status}`)
    const callback2 = (value, status) => console.log(`finish2: ${value}, status: ${status}`)

    promise1$.afterComplete(callback1)
    promise1$.afterComplete(callback2)

    promise1$.offComplete(callback2)

    promise$.next(1, true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finish1: error, status: rejected')
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  test('test observer complete and then order', async () => {
    const promise$ = $()
    const promise1$ = promise$.then(() => Promise.resolve())
    promise1$.afterComplete(() => console.log('finish'))
    promise1$.then(() => console.log('then'))
    promise$.next(Promise.resolve(), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finish')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'then')
  })

  test('test $then immutable', async () => {
    const promise$ = $()
    const promise1$ = promise$.$then((value) => {
      value.key2.key22 = 'test2'
    })
    promise$.next({ key1: { key11: 'test' }, key2: { key22: 'test' } })
    expect(promise$.value === promise1$.value).toBeFalsy()
    expect(promise$.value?.key1 === promise1$.value?.key1).toBeTruthy()
    expect(promise$.value?.key2 === promise1$.value?.key2).toBeFalsy()
    expect(promise$.value?.key2.key22 === promise1$.value?.key2.key22).toBeFalsy()
  })

  test('test $then recipe async', async () => {
    const promise$ = $()
    const promise1$ = promise$.$then(async (value) => {
      await setTimeoutSleep(100)
      value.key2.key22 = 'test2'
    })
    promise$.next({ key1: { key11: 'test' }, key2: { key22: 'test' } })
    await sleep(50)
    expect(promise1$.value).toBeUndefined()
    await sleep(60)
    expect(promise$.value === promise1$.value).toBeFalsy()
    expect(promise$.value?.key1 === promise1$.value?.key1).toBeTruthy()
    expect(promise$.value?.key2 === promise1$.value?.key2).toBeFalsy()
    expect(promise$.value?.key2.key22 === promise1$.value?.key2.key22).toBeFalsy()
  })

  test('test $thenOnce', async () => {
    const promise$ = $<{ num: number; key: object }>()
    const promise1$ = promise$.$thenOnce((value) => {
      value.num = value.num + 1
    })
    promise$.next({ num: 1, key: {} })
    expect(promise$.value === promise1$.value).toBeFalsy()
    expect(promise1$.value?.num).toBe(2)
    promise$.set((value) => {
      value.num += 1
    })
    expect(promise1$.value?.num).toBe(2)
  })

  test('test $thenImmediate', async () => {
    const promise$ = $({ key1: { key11: 'test' }, key2: { key22: 'test' } })
    const promise1$ = promise$.$thenImmediate((value) => {
      value.key2.key22 = 'test2'
    })
    expect(promise$.value === promise1$.value).toBeFalsy()
    expect(promise$.value?.key1 === promise1$.value?.key1).toBeTruthy()
    expect(promise$.value?.key2 === promise1$.value?.key2).toBeFalsy()
    expect(promise$.value?.key2.key22 === promise1$.value?.key2.key22).toBeFalsy()
  })

  test('test filter method', async () => {
    const promise$ = $()
    promise$.filter((value) => value > 2).then(() => console.log('test'))
    promise$.next(1)
    promise$.next(2)
    promise$.next(3)
    promise$.next(4)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test change method', async () => {
    const promise$ = $<{ num: number }>()
    promise$.change((value) => value?.num).then(() => console.log('test'))
    promise$.next({ num: 1 })
    promise$.next({ num: 2 })
    promise$.next({ num: 2 })
    promise$.next({ num: 1 })
    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })

  test('test get method', async () => {
    const promise$ = $({ a: 1, b: { c: 2 } })
    const promise1$ = promise$.get((value) => value?.b)
    promise1$.then((value) => {
      console.log(value?.c)
    })
    expect(promise1$.value?.c).toBe(2)
    promise$.set((value) => {
      value.a = 2
    })
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    promise$.set((value) => {
      value.b.c = 3
    })
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 3)
  })

  test('test skip method without param', async () => {
    const promise$ = $()
    const observable$ = promise$.then()
    observable$.skip().then(() => console.log('test'))
    promise$.next(1)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    promise$.next(2)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  test('test skip method with param', async () => {
    const promise$ = $()
    const observable$ = promise$.then()
    observable$.skip(2).then(() => console.log('test'))
    promise$.next(1)
    promise$.next(2)
    promise$.next(3)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })
})
