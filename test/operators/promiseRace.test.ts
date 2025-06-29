import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, streamFactory } from '../utils'
import { promiseRace } from '../../index'

describe('promiseRace operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test promiseRace', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    const stream$ = promiseRace(observable1$, observable2$, observable3$)
    stream$.afterComplete((value: string) => console.log('finish', value))
    stream$.then(
      (value: string[]) => console.log('resolve', value.toString()),
      (value: string[]) => console.log('reject', value.toString()),
    )
    /**
     * ---a✅------b✅------c❌|------
     * ---------e❌------f✅------g✅|---
     * ------l✅------m❌------n✅|---
     * ---a✅------b✅------c❌|------
     */
    promise1$.next(Promise.resolve('a'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 'a')
    await sleep(30)
    promise3$.next(Promise.resolve('l'))
    await sleep(30)
    promise2$.next(Promise.reject('e'))
    await sleep(30)

    promise1$.next(Promise.resolve('b'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolve', 'b')
    await sleep(30)
    promise3$.next(Promise.reject('m'))
    await sleep(30)
    promise2$.next(Promise.resolve('f'))
    await sleep(30)

    promise1$.next(Promise.reject('c'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'finish', 'c')
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'reject', 'c')
  })

  test('test promiseRace with unsubscribe', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    const stream$ = promiseRace(observable1$, observable2$, observable3$)

    promise1$.next(1)
    promise2$.next(2)
    promise3$.next(3)
    stream$.afterUnsubscribe(() => console.log('race unsubscribe'))
    await sleep(1)
    observable1$.unsubscribe()
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'race unsubscribe')
  })

  test('test race with second stream winning', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    const stream$ = promiseRace(observable1$, observable2$, observable3$)
    stream$.then((value: string) => console.log('winner:', value))

    // Second stream emits first
    promise2$.next('second wins')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'winner:', 'second wins')

    // Other streams emit but should be ignored
    promise1$.next('first too late')
    promise3$.next('third too late')
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledTimes(1)

    // Only the winning stream's subsequent emissions should be processed
    promise2$.next('second again')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'winner:', 'second again')
  })

  test('test race with rejection', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()

    const stream$ = promiseRace(observable1$, observable2$)
    stream$.then(
      (value: string) => console.log('resolved:', value),
      (error: string) => console.log('rejected:', error),
    )

    // First stream rejects first
    promise1$.next(Promise.reject('first error'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'rejected:', 'first error')

    // Second stream emits but should be ignored
    promise2$.next('second value')
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })
})
