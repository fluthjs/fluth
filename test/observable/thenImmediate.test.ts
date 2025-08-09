import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, consoleAll } from '../../index'

describe('Observable thenImmediate method', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('test resolved observer thenImmediate will execute immediate', async () => {
    const promise$ = $()
    const observable$ = promise$.then((value) => Promise.resolve(value))
    promise$.next(Promise.resolve('1'))
    await vi.runAllTimersAsync()
    observable$.thenImmediate((value) => console.log(value))
    expect(consoleSpy).toHaveBeenNthCalledWith(1, '1')
  })

  test('test thenImmediate node will not trigger children observer execute', async () => {
    const promise$ = $(1).use(consoleAll())

    promise$.thenImmediate((value) => value + 1).then((value) => value * 2)

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 2)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  test('thenImmediate should not execute immediately when parent is pending, but execute after resolve', async () => {
    const promise$ = $(new Promise((resolve) => setTimeout(() => resolve('p1'), 10)))
    // create thenImmediate before parent resolves
    promise$.thenImmediate((value) => console.log('immediate:', value))
    // should not run yet
    expect(consoleSpy).not.toHaveBeenCalled()
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'immediate:', 'p1')
  })

  test('thenImmediate should execute immediately when parent already rejected and onRejected is provided', async () => {
    const promise$ = $()
    // make parent rejected first
    promise$.next(Promise.reject('err'))
    await vi.runAllTimersAsync()
    // now attach thenImmediate with onRejected handler -> should execute immediately
    promise$.thenImmediate(undefined, (error) => console.log('rej:', error))
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'rej:', 'err')
  })

  test('multiple thenImmediate chained on already resolved node should both execute immediately in order', async () => {
    const promise$ = $(10)
    const o1 = promise$.thenImmediate((v) => {
      console.log('o1:', v)
      return v + 1
    })
    o1.thenImmediate((v) => console.log('o2:', v))
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'o1:', 10)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'o2:', 11)
  })

  test('thenImmediate with already finished stream should not execute immediately', async () => {
    const promise$ = $('final')
    // finish the stream with a value
    promise$.next('final', true)
    await vi.runAllTimersAsync()
    // attach thenImmediate after finish -> should execute immediately
    promise$.thenImmediate((v) => console.log('finished:', v))
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('thenImmediate without onRejected should not log when parent already rejected (status propagation only)', async () => {
    const promise$ = $()
    promise$.next(Promise.reject('E'))
    await vi.runAllTimersAsync()
    // attach thenImmediate without reject handler; no console output expected
    promise$.thenImmediate((v) => console.log('ok:', v))
    expect(consoleSpy).not.toHaveBeenCalled()
  })
})
