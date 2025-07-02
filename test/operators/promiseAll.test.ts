import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, streamFactory } from '../utils'
import { promiseAll } from '../../index'

describe('promiseAll operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test promiseAll function', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    const stream$ = promiseAll(observable1$, observable2$, observable3$)
    stream$.afterComplete((value: string[]) => console.log('finish', value.toString()))
    stream$.then(
      (value: string[]) => console.log('resolve', value.toString()),
      (value: string[]) => console.log('reject', value.toString()),
    )
    /**
     * input
     * --a✅----------b✅-----------------c✅-------d✅--------e✅--------------g✅|----------
     * ------h✅----------i✅---j✅------------k✅--------l✅------------m✅|-----------------
     * ----------o✅-----------------p✅----------------------------q❌----------------r✅|---
     * output
     * ----[a,h,o]✅-----------[b,j,p]✅----------------------[e,l,q]❌----------[g,m,r]✅|---
     */
    promise1$.next('a')
    await sleep(30)
    promise2$.next('h')
    await sleep(30)
    promise3$.next('o')
    await sleep(30)

    promise1$.next('b')
    await sleep(30)
    promise2$.next('i')
    await sleep(30)
    promise2$.next('j')
    await sleep(30)
    promise3$.next('p')
    await sleep(30)

    promise1$.next('c')
    await sleep(30)
    promise2$.next('k')
    await sleep(30)
    promise1$.next('d')
    await sleep(30)
    promise2$.next('l')
    await sleep(30)
    promise1$.next('e')
    await sleep(30)
    promise3$.next(Promise.reject('q'))
    await sleep(30)

    promise2$.next('m', true)
    await sleep(30)
    promise1$.next('g', true)
    await sleep(30)
    promise3$.next('r', true)
    await sleep(30)

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 'a,h,o')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolve', 'b,j,p')
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'reject', 'e,l,q')
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'finish', 'g,m,r')
    expect(consoleSpy).toHaveBeenNthCalledWith(5, 'resolve', 'g,m,r')
  })

  test('test promiseAll with empty slots prevention', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    const stream$ = promiseAll(observable1$, observable2$, observable3$)
    stream$.then(
      (value: string[]) => console.log('resolve', value.toString()),
      (value: string[]) => console.log('reject', value.toString()),
    )

    // Only resolve stream 1 and 3, leaving stream 2 pending
    // This should not trigger next() due to empty slots check
    promise1$.next('a', true)
    await sleep(30)
    promise3$.next('c', true)
    await sleep(30)

    // Should not have any output yet because stream 2 hasn't resolved
    expect(consoleSpy).toHaveBeenCalledTimes(0)

    // Now resolve stream 2
    promise2$.next('b', true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 'a,b,c')
  })

  test('test promiseAll with all streams unsubscribe', async () => {
    const { observable$: observable1$ } = streamFactory()
    const { observable$: observable2$ } = streamFactory()
    const { observable$: observable3$ } = streamFactory()

    const stream$ = promiseAll(observable1$, observable2$, observable3$)
    stream$.afterComplete(() => console.log('finish'))
    stream$.afterUnsubscribe(() => console.log('unsubscribe'))
    observable1$.unsubscribe()
    observable2$.unsubscribe()
    observable3$.unsubscribe()
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finish')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unsubscribe')
  })

  test('test promiseAll with all streams finish', async () => {
    const { observable$: observable1$, stream$: promise1$ } = streamFactory()
    const { observable$: observable2$, stream$: promise2$ } = streamFactory()
    const { observable$: observable3$, stream$: promise3$ } = streamFactory()

    const stream$ = promiseAll(observable1$, observable2$, observable3$)
    stream$.afterComplete(() => console.log('finish'))
    promise1$.next('a', true)
    promise2$.next('b', true)
    promise3$.next('c', true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finish')
  })

  test('test promiseAll with single stream', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()

    const stream$ = promiseAll(observable1$)
    stream$.then(
      (value: string[]) => console.log('resolve', value.toString()),
      (value: string[]) => console.log('reject', value.toString()),
    )

    promise1$.next('single', true)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 'single')
  })

  test('test promiseAll status reset after completion', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()

    const stream$ = promiseAll(observable1$, observable2$)
    stream$.then(
      (value: string[]) => console.log('resolve', value.toString()),
      (value: string[]) => console.log('reject', value.toString()),
    )

    // First round: both resolve
    promise1$.next('a')
    promise2$.next('b')
    await sleep(10)

    // Second round: one resolves, one rejects
    promise1$.next('c')
    promise2$.next(Promise.reject('d'))
    await sleep(10)

    // Third round: both resolve again
    promise1$.next('e', true)
    promise2$.next('f', true)
    await sleep(10)

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 'a,b')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'reject', 'c,d')
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'resolve', 'e,f')
  })

  test('test promiseAll with mixed pending and resolved states', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    const stream$ = promiseAll(observable1$, observable2$, observable3$)
    stream$.then(
      (value: string[]) => console.log('resolve', value.toString()),
      (value: string[]) => console.log('reject', value.toString()),
    )
    // Resolve first two streams
    promise1$.next('a')
    promise2$.next('b')

    // Should not emit yet because third stream is still pending
    expect(consoleSpy).toHaveBeenCalledTimes(0)

    // Resolve third stream
    promise3$.next('c')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 'a,b,c')
    consoleSpy.mockClear()

    promise3$.next(new Promise((resolve) => setTimeout(() => resolve('f'), 100)))
    promise1$.next('d')
    promise2$.next('e')

    await sleep(99)
    // Should not emit yet because third stream is still pending
    expect(consoleSpy).toHaveBeenCalledTimes(0)

    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 'd,e,f')
  })

  test('test promiseAll handles null status correctly', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()

    // Manually set status to null to test null handling
    observable1$.status = null
    observable2$.status = null

    const stream$ = promiseAll(observable1$, observable2$)
    stream$.then(
      (value: string[]) => console.log('resolve', value.toString()),
      (value: string[]) => console.log('reject', value.toString()),
    )

    promise1$.next('a')
    promise2$.next('b')
    await sleep(10)

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 'a,b')
  })
})
