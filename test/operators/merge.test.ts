import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, streamFactory } from '../utils'
import { merge } from '../../index'

describe('merge operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test merge', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()
    const stream$ = merge(observable1$, observable2$, observable3$)
    stream$.afterComplete((value: string[]) => console.log('finish', value.toString()))
    stream$.then(
      (value: string) => console.log('resolve', value),
      (value: string) => console.log('reject', value),
    )
    /**
     * ---a✅---------b✅--------c✅|----------
     * ----------e❌---------f✅--------g❌|---
     * -------l✅--------m❌--------n✅|-------
     * ---a✅-l✅-e❌-b✅-m❌-f✅-c✅-n✅-g❌|---
     */
    promise1$.next(Promise.resolve('a'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 'a')
    await sleep(30)
    promise3$.next(Promise.resolve('l'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolve', 'l')
    await sleep(30)
    promise2$.next(Promise.reject('e'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'reject', 'e')
    await sleep(30)

    promise1$.next(Promise.resolve('b'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'resolve', 'b')
    await sleep(30)
    promise3$.next(Promise.reject('m'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(5, 'reject', 'm')
    await sleep(30)
    promise2$.next(Promise.resolve('f'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(6, 'resolve', 'f')
    await sleep(30)

    promise1$.next(Promise.resolve('c'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(7, 'resolve', 'c')
    await sleep(30)
    promise3$.next(Promise.resolve('n'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(8, 'resolve', 'n')
    await sleep(30)
    promise2$.next(Promise.reject('g'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(9, 'finish', 'g')
    expect(consoleSpy).toHaveBeenNthCalledWith(10, 'reject', 'g')
  })

  test('merge with unsubscribe', async () => {
    const { observable$: observable1$ } = streamFactory()
    const { observable$: observable2$ } = streamFactory()
    const { observable$: observable3$ } = streamFactory()
    const stream$ = merge(observable1$, observable2$, observable3$)
    stream$.afterUnsubscribe(() => console.log('unsubscribe'))
    observable1$.unsubscribe()
    observable2$.unsubscribe()
    observable3$.unsubscribe()
    expect(consoleSpy).toBeCalledTimes(0)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe')
  })

  test('test merge with single stream', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const stream$ = merge(observable1$)

    stream$.then((value: string) => console.log('merged:', value))

    promise1$.next('single')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'merged:', 'single')

    promise1$.next('another', true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'merged:', 'another')
  })
})
