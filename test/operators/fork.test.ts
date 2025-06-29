import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { Stream, fork } from '../../index'

describe('fork operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test fork', async () => {
    const promise$ = new Stream()
    const promise1$ = fork(promise$)
    promise1$.then(
      (value) => console.log('resolve', value),
      (value) => console.log('reject', value),
    )
    promise1$.afterComplete((value) => console.log('finish', value))

    promise$.next('a')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 'a')

    promise$.next(Promise.reject('b'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'reject', 'b')

    // finish case
    promise$.next('c', true)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'finish', 'c')
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'resolve', 'c')
  })

  test('test fork with unsubscribe', async () => {
    const promise$ = new Stream()
    const promise1$ = fork(promise$)
    promise1$.afterUnsubscribe(() => console.log('unsubscribe'))
    promise$.unsubscribe()
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe')
  })

  test('test fork with multiple values', async () => {
    const promise$ = new Stream()
    const promise1$ = fork(promise$)
    const promise2$ = fork(promise$)

    promise1$.then((value) => console.log('fork1:', value))
    promise2$.then((value) => console.log('fork2:', value))

    promise$.next('test')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'fork1:', 'test')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'fork2:', 'test')

    promise$.next('another')
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'fork1:', 'another')
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'fork2:', 'another')
  })

  test('test fork with promise rejection', async () => {
    const promise$ = new Stream()
    const promise1$ = fork(promise$)

    promise1$.then(
      (value) => console.log('resolved:', value),
      (error) => console.log('rejected:', error)
    )

    promise$.next('success')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolved:', 'success')

    promise$.next(Promise.reject('error'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'rejected:', 'error')
  })
})