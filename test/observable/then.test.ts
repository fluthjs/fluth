import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, promiseFactory } from '../utils'
import { $ } from '../../index'

describe('Observable then method', () => {
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
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'error')
  })
})
