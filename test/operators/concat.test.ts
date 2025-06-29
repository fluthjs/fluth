import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, streamFactory } from '../utils'
import { concat } from '../../index'

describe('concat operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test concat with resolve', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    const stream$ = concat(observable1$, observable2$, observable3$)
    stream$.afterComplete((value: string) => console.log('finish', value))
    stream$.then(
      (value: string[]) => console.log('resolve', value.toString()),
      (value: string[]) => console.log('reject', value.toString()),
    )
    /**
     * ---a✅-------b✅|-------------
     * ---------e✅---- ---f❌|-----
     * ------l✅--------m❌------n✅|---
     * ---a✅-------b✅----f❌ --n✅|-----
     */
    promise1$.next(Promise.resolve('a'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 'a')
    await sleep(30)
    promise3$.next(Promise.resolve('l'))
    await sleep(30)
    promise2$.next(Promise.reject('e'))
    await sleep(30)

    promise1$.next(Promise.resolve('b'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolve', 'b')
    await sleep(30)
    promise3$.next(Promise.reject('m'))
    await sleep(30)
    promise2$.next(Promise.reject('f'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'reject', 'f')
    await sleep(30)

    promise3$.next(Promise.resolve('n'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'finish', 'n')
    expect(consoleSpy).toHaveBeenNthCalledWith(5, 'resolve', 'n')
  })

  test('test concat with future observable unsubscribe', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { observable$: observable3$ } = streamFactory()

    const stream$ = concat(observable1$, observable2$, observable3$)
    stream$.afterUnsubscribe(() => console.log('unsubscribe'))
    observable3$.unsubscribe()
    promise1$.next(Promise.resolve('a'), true)
    promise2$.next(Promise.resolve('b'))
    promise2$.next(Promise.resolve('c'), true)
    expect(consoleSpy).toBeCalledTimes(0)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe')
  })
})
