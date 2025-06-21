import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, streamFactory } from './utils'

import {
  fork,
  finish,
  combine,
  concat,
  merge,
  partition,
  promiseRace,
  promiseAll,
  Stream,
} from '../index'

describe('operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test fork ', async () => {
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

  test('test finish with resolve', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    const stream$ = finish(observable1$, observable2$, observable3$)
    stream$.afterComplete((value: string[]) => console.log('finish', value.toString()))
    stream$.then(
      (value: string[]) => console.log('resolve', value.toString()),
      (value: string[]) => console.log('reject', value.toString()),
    )
    /**
     * input
     * ---a✅------b✅------c✅|------
     * ---------e❌------f✅------g✅|---
     * ------l✅------m❌------n✅|---
     * output
     * --------------------[c,g,n]✅|---
     */
    promise1$.next(Promise.resolve('a'))
    await sleep(30)
    promise3$.next(Promise.resolve('l'))
    await sleep(30)
    promise2$.next(Promise.reject('e'))
    await sleep(30)

    promise1$.next(Promise.resolve('b'))
    await sleep(30)
    promise3$.next(Promise.reject('m'))
    await sleep(30)
    promise2$.next(Promise.resolve('f'))
    await sleep(30)

    promise1$.next(Promise.resolve('c'), true)
    await sleep(30)
    promise3$.next(Promise.resolve('n'), true)
    await sleep(30)
    promise2$.next(Promise.resolve('g'), true)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finish', 'c,g,n')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolve', 'c,g,n')
  })

  test('test finish with reject', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    const stream$ = finish(observable1$, observable2$, observable3$)
    stream$.afterComplete((value: string[]) => console.log('finish', value.toString()))
    stream$.then(
      (value: string[]) => console.log('resolve', value.toString()),
      (value: string[]) => console.log('reject', value.toString()),
    )
    /**
     * input
     * ---a✅------b✅------c✅|------
     * ---------e❌------f✅------g❌|---
     * ------l✅------m❌------n✅|---
     * output
     * --------------------[c,g,n]❌|---
     */
    promise1$.next(Promise.resolve('a'))
    await sleep(30)
    promise3$.next(Promise.resolve('l'))
    await sleep(30)
    promise2$.next(Promise.reject('e'))
    await sleep(30)

    promise1$.next(Promise.resolve('b'))
    await sleep(30)
    promise3$.next(Promise.reject('m'))
    await sleep(30)
    promise2$.next(Promise.resolve('f'))
    await sleep(30)

    promise1$.next(Promise.resolve('c'), true)
    await sleep(30)
    promise3$.next(Promise.resolve('n'), true)
    await sleep(30)
    promise2$.next(Promise.reject('g'), true)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finish', 'c,g,n')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'reject', 'c,g,n')
  })

  test('test finish with all stream$ unsubscribe', async () => {
    const { observable$: observable1$ } = streamFactory()
    const { observable$: observable2$ } = streamFactory()
    const { observable$: observable3$ } = streamFactory()

    const stream$ = finish(observable1$, observable2$, observable3$)
    stream$.afterUnsubscribe(() => console.log('unsubscribe'))
    observable1$.unsubscribe()
    observable2$.unsubscribe()
    observable3$.unsubscribe()
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe')
  })

  test('test combine', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    const stream$ = combine(observable1$, observable2$, observable3$)
    stream$.afterComplete((value: string[]) => console.log('finish', value.toString()))
    stream$.then(
      (value: string[]) => console.log('resolve', value.toString()),
      (value: string[]) => console.log('reject', value.toString()),
    )
    /**
     * input
     * ----a✅--------------------------b✅--------------------------c✅|------------------------
     * -----------------------e❌--------------------------f✅---------------------------g❌|----
     * ------------l✅----------------------------m❌--------------------------n✅|--------------
     * output
     * -----------------[a,e,l]❌-[b,e,l]❌-[b,e,m]❌-[b,f,m]❌-[c,f,m]❌-[c,f,n]✅-[c,g,n]❌|----
     */
    promise1$.next(Promise.resolve('a'))
    await sleep(30)
    promise3$.next(Promise.resolve('l'))
    await sleep(30)
    promise2$.next(Promise.reject('e'))
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'reject', 'a,e,l')
    await sleep(30)

    promise1$.next(Promise.resolve('b'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'reject', 'b,e,l')
    await sleep(30)
    promise3$.next(Promise.reject('m'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'reject', 'b,e,m')
    await sleep(30)
    promise2$.next(Promise.resolve('f'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'reject', 'b,f,m')
    await sleep(30)

    promise1$.next(Promise.resolve('c'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(5, 'reject', 'c,f,m')
    await sleep(30)
    promise3$.next(Promise.resolve('n'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(6, 'resolve', 'c,f,n')
    await sleep(30)
    promise2$.next(Promise.reject('g'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(7, 'finish', 'c,g,n')
    expect(consoleSpy).toHaveBeenNthCalledWith(8, 'reject', 'c,g,n')
  })

  test('test combine with all stream$ unsubscribe', async () => {
    const { observable$: observable1$ } = streamFactory()
    const { observable$: observable2$ } = streamFactory()
    const { observable$: observable3$ } = streamFactory()

    const stream$ = combine(observable1$, observable2$, observable3$)
    stream$.afterUnsubscribe(() => console.log('unsubscribe'))
    observable1$.unsubscribe()
    observable2$.unsubscribe()
    observable3$.unsubscribe()
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe')
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
     * input
     * ---a✅-------b✅|-------------
     * ---------e✅---- ---f❌|-----
     * ------l✅--------m❌------n✅|---
     * output
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

  test('test concat with current observable unsubscribe', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { observable$: observable2$ } = streamFactory()
    const { observable$: observable3$ } = streamFactory()

    const stream$ = concat(observable1$, observable2$, observable3$)
    stream$.afterUnsubscribe(() => console.log('unsubscribe'))
    promise1$.next(Promise.resolve('a'))
    observable1$.unsubscribe()
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe')
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
     * input
     * ---a✅---------b✅--------c✅|----------
     * ----------e❌---------f✅--------g❌|---
     * -------l✅--------m❌--------n✅|-------
     * output
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

  test('test partition', async () => {
    const { stream$, observable$ } = streamFactory()
    /**
     * input
     * ---1✅--2✅--3❌--4❌--5✅--6✅--7❌|----
     * ---1✅-------3❌------5✅-------7❌|----
     * output
     * --------2✅------4❌-------6✅---------
     */
    const [stream1$, stream2$] = partition(observable$, (n) => n % 2 === 1)
    stream1$.afterComplete((value) => console.log('selected finish', value))
    stream2$.afterComplete(() => console.log('unselected finish'))
    stream1$.then(
      (value: string) => console.log('selected', 'resolve', value),
      (value: string) => console.log('selected', 'reject', value),
    )
    stream2$.then(
      (value: string) => console.log('unselected', 'resolve', value),
      (value: string) => console.log('unselected', 'reject', value),
    )
    stream$.next('1')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'selected', 'resolve', '1')

    stream$.next('2')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unselected', 'resolve', '2')

    stream$.next(Promise.reject('3'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'selected', 'reject', '3')

    stream$.next(Promise.reject('4'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'unselected', 'reject', '4')

    stream$.next('5')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(5, 'selected', 'resolve', '5')

    stream$.next('6')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(6, 'unselected', 'resolve', '6')

    stream$.next(Promise.reject('7'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(7, 'selected finish', '7')
    expect(consoleSpy).toHaveBeenNthCalledWith(8, 'selected', 'reject', '7')
  })

  test('test partition with unsubscribe', async () => {
    const { observable$ } = streamFactory()

    const [stream1$, stream2$] = partition(observable$, (n) => n % 2 === 1)

    stream1$.afterUnsubscribe(() => console.log('selected unsubscribe'))
    stream2$.afterUnsubscribe(() => console.log('unselected unsubscribe'))
    observable$.unsubscribe()
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'selected unsubscribe')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unselected unsubscribe')
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
     * input
     * ---a✅------b✅------c❌|------
     * ---------e❌------f✅------g✅|---
     * ------l✅------m❌------n✅|---
     * output
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
    stream$.afterUnsubscribe(() => console.log('promiseRace unsubscribe'))
    await sleep(1)
    observable1$.unsubscribe()
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'promiseRace unsubscribe')
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
    promise1$.next(Promise.resolve('a'))
    await sleep(30)
    promise2$.next(Promise.resolve('h'))
    await sleep(30)
    promise3$.next(Promise.resolve('o'))
    await sleep(30)

    promise1$.next(Promise.resolve('b'))
    await sleep(30)
    promise2$.next(Promise.resolve('i'))
    await sleep(30)
    promise2$.next(Promise.resolve('j'))
    await sleep(30)
    promise3$.next(Promise.resolve('p'))
    await sleep(30)

    promise1$.next(Promise.resolve('c'))
    await sleep(30)
    promise2$.next(Promise.resolve('k'))
    await sleep(30)
    promise1$.next(Promise.resolve('d'))
    await sleep(30)
    promise2$.next(Promise.resolve('l'))
    await sleep(30)
    promise1$.next(Promise.resolve('e'))
    await sleep(30)
    promise3$.next(Promise.reject('q'))
    await sleep(30)

    promise2$.next(Promise.resolve('m'), true)
    await sleep(30)
    promise1$.next(Promise.resolve('g'), true)
    await sleep(30)
    promise3$.next(Promise.resolve('r'), true)
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
    promise1$.next(Promise.resolve('a'), true)
    await sleep(30)
    promise3$.next(Promise.resolve('c'), true)
    await sleep(30)

    // Should not have any output yet because stream 2 hasn't resolved
    expect(consoleSpy).toHaveBeenCalledTimes(0)

    // Now resolve stream 2
    promise2$.next(Promise.resolve('b'), true)
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
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe')
  })

  test('test promiseAll with all streams finish', async () => {
    const { observable$: observable1$, stream$: promise1$ } = streamFactory()
    const { observable$: observable2$, stream$: promise2$ } = streamFactory()
    const { observable$: observable3$, stream$: promise3$ } = streamFactory()

    const stream$ = promiseAll(observable1$, observable2$, observable3$)
    stream$.afterComplete(() => console.log('finish'))
    promise1$.next(Promise.resolve('a'), true)
    promise2$.next(Promise.resolve('b'), true)
    promise3$.next(Promise.resolve('c'), true)
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
})
