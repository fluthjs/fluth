import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, promiseConsoleFactory } from '../utils'
import { $ } from '../../index'

describe('Observable unsubscribe method', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
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

    promise$.next(Promise.resolve())
    await sleep(50)
    observable1$.unsubscribe()
    await sleep(160)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    expect((observable1$ as any)._cacheRootPromise).toBeNull()
    expect((observable11$ as any)._cacheRootPromise).toBeNull()
  })

  test('test observer unsubscribe when child observer is pending', async () => {
    const promise$ = $()
    const observer1 = () => promiseConsoleFactory(100, 'observer1')
    const observer11 = () => promiseConsoleFactory(100, 'observer111')

    const observable1$ = promise$.then(observer1)
    const observable11$ = observable1$.then(observer11)

    promise$.next(Promise.resolve())
    await sleep(150)
    observable1$.unsubscribe()
    await sleep(60)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
    expect((observable1$ as any)._cacheRootPromise).toBeNull()
    expect((observable11$ as any)._cacheRootPromise).toBeNull()
  })
})
