import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, streamFactory } from './utils'

import {
  fork,
  finish,
  combine,
  concat,
  merge,
  partition,
  race,
  Stream,
} from '../index'

describe('operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
  })

  test('test fork ', async () => {
    const promise$ = new Stream()
    const promise1$ = fork(promise$)
    promise1$.then(
      (data) => console.log('resolve', data),
      (data) => console.log('reject', data),
    )
    promise$.next('a')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 'a')

    promise$.next(Promise.reject('b'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'reject', 'b')

    promise$.next(Promise.resolve('c'), true)
    promise1$.finish.then((data) => console.log('finish', data))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'finish', 'c')
  })

  test('test fork with unsubscribe', async () => {
    const promise$ = new Stream()
    const promise1$ = fork(promise$)
    promise1$.setUnsubscribeCallback(() => console.log('unsubscribe'))
    promise$.unsubscribe()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe')
  })

  test('test finish with resolve', async () => {
    const { promise$: promise1$, subjection$: subjection1$ } = streamFactory()
    const { promise$: promise2$, subjection$: subjection2$ } = streamFactory()
    const { promise$: promise3$, subjection$: subjection3$ } = streamFactory()

    const stream$ = finish(subjection1$, subjection2$, subjection3$)
    stream$.then(
      (data: string[]) => console.log('resolve', data.toString()),
      (data: string[]) => console.log('reject', data.toString()),
    )
    /**
     * ---a✅------b✅------c✅|------
     * ---------e❌------f✅------g✅|---
     * ------l✅------m❌------n✅|---
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
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 'c,g,n')
    stream$.finish.then((data: string[]) =>
      console.log('finish', data.toString()),
    )
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'finish', 'c,g,n')
  })

  test('test finish with reject', async () => {
    const { promise$: promise1$, subjection$: subjection1$ } = streamFactory()
    const { promise$: promise2$, subjection$: subjection2$ } = streamFactory()
    const { promise$: promise3$, subjection$: subjection3$ } = streamFactory()

    const stream$ = finish(subjection1$, subjection2$, subjection3$)
    stream$.then(
      (data: string[]) => console.log('resolve', data.toString()),
      (data: string[]) => console.log('reject', data.toString()),
    )
    /**
     * ---a✅------b✅------c✅|------
     * ---------e❌------f✅------g❌|---
     * ------l✅------m❌------n✅|---
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
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'reject', 'c,g,n')
    stream$.finish.catch((data: string[]) =>
      console.log('finish', data.toString()),
    )
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'finish', 'c,g,n')
  })

  test('test finish with all stream$ unsubscribe', async () => {
    const { subjection$: subjection1$ } = streamFactory()
    const { subjection$: subjection2$ } = streamFactory()
    const { subjection$: subjection3$ } = streamFactory()

    const stream$ = finish(subjection1$, subjection2$, subjection3$)
    stream$.setUnsubscribeCallback(() => console.log('unsubscribe'))
    subjection1$.unsubscribe()
    subjection2$.unsubscribe()
    subjection3$.unsubscribe()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe')
  })

  test('test combine', async () => {
    const { promise$: promise1$, subjection$: subjection1$ } = streamFactory()
    const { promise$: promise2$, subjection$: subjection2$ } = streamFactory()
    const { promise$: promise3$, subjection$: subjection3$ } = streamFactory()

    const stream$ = combine(subjection1$, subjection2$, subjection3$)
    stream$.then(
      (data: string[]) => console.log('resolve', data.toString()),
      (data: string[]) => console.log('reject', data.toString()),
    )
    /**
     * ----a✅--------------------------b✅--------------------------c✅|------------------------
     * -----------------------e❌--------------------------f✅---------------------------g❌|----
     * ------------l✅----------------------------m❌--------------------------n✅|--------------
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
    expect(consoleSpy).toHaveBeenNthCalledWith(7, 'reject', 'c,g,n')
    stream$.finish.catch((data: string[]) =>
      console.log('finish', data.toString()),
    )
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(8, 'finish', 'c,g,n')
  })

  test('test combine with all stream$ unsubscribe', async () => {
    const { subjection$: subjection1$ } = streamFactory()
    const { subjection$: subjection2$ } = streamFactory()
    const { subjection$: subjection3$ } = streamFactory()

    const stream$ = combine(subjection1$, subjection2$, subjection3$)
    stream$.setUnsubscribeCallback(() => console.log('unsubscribe'))
    subjection1$.unsubscribe()
    subjection2$.unsubscribe()
    subjection3$.unsubscribe()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe')
  })

  test('test concat with resolve', async () => {
    const { promise$: promise1$, subjection$: subjection1$ } = streamFactory()
    const { promise$: promise2$, subjection$: subjection2$ } = streamFactory()
    const { promise$: promise3$, subjection$: subjection3$ } = streamFactory()

    const stream$ = concat(subjection1$, subjection2$, subjection3$)
    stream$.then(
      (data: string[]) => console.log('resolve', data.toString()),
      (data: string[]) => console.log('reject', data.toString()),
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
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'resolve', 'n')
    stream$.finish.then((data: string) => console.log('finish', data))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(5, 'finish', 'n')
  })

  test('test concat with current subjection unsubscribe', async () => {
    const { promise$: promise1$, subjection$: subjection1$ } = streamFactory()
    const { subjection$: subjection2$ } = streamFactory()
    const { subjection$: subjection3$ } = streamFactory()

    const stream$ = concat(subjection1$, subjection2$, subjection3$)
    stream$.setUnsubscribeCallback(() => console.log('unsubscribe'))
    promise1$.next(Promise.resolve('a'))
    subjection1$.unsubscribe()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe')
  })

  test('test concat with future subjection unsubscribe', async () => {
    const { promise$: promise1$, subjection$: subjection1$ } = streamFactory()
    const { promise$: promise2$, subjection$: subjection2$ } = streamFactory()
    const { subjection$: subjection3$ } = streamFactory()

    const stream$ = concat(subjection1$, subjection2$, subjection3$)
    stream$.setUnsubscribeCallback(() => console.log('unsubscribe'))
    subjection3$.unsubscribe()
    promise1$.next(Promise.resolve('a'), true)
    promise2$.next(Promise.resolve('b'))
    expect(consoleSpy).toBeCalledTimes(0)
    promise2$.next(Promise.resolve('c'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe')
  })

  test('test merge', async () => {
    const { promise$: promise1$, subjection$: subjection1$ } = streamFactory()
    const { promise$: promise2$, subjection$: subjection2$ } = streamFactory()
    const { promise$: promise3$, subjection$: subjection3$ } = streamFactory()
    const stream$ = merge(subjection1$, subjection2$, subjection3$)
    stream$.then(
      (data: string) => console.log('resolve', data),
      (data: string) => console.log('reject', data),
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
    expect(consoleSpy).toHaveBeenNthCalledWith(9, 'reject', 'g')
    await sleep(1)
    stream$.finish.catch((data: string[]) =>
      console.log('finish', data.toString()),
    )
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(10, 'finish', 'g')
  })

  test('merge with unsubscribe', async () => {
    const { subjection$: subjection1$ } = streamFactory()
    const { subjection$: subjection2$ } = streamFactory()
    const { subjection$: subjection3$ } = streamFactory()
    const stream$ = merge(subjection1$, subjection2$, subjection3$)
    stream$.setUnsubscribeCallback(() => console.log('unsubscribe'))
    subjection1$.unsubscribe()
    subjection2$.unsubscribe()
    expect(consoleSpy).toBeCalledTimes(0)
    subjection3$.unsubscribe()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe')
  })

  test('test partition', async () => {
    const { promise$, subjection$ } = streamFactory()
    /**
     * ---1✅--2✅--3❌--4❌--5✅--6✅--7❌|----
     * ---1✅-------3❌------5✅-------7❌|----
     * --------2✅------4❌-------6✅---------
     */
    const [stream1$, stream2$] = partition(subjection$, (n) => n % 2 === 1)
    stream1$.then(
      (data: string) => console.log('selected', 'resolve', data),
      (data: string) => console.log('selected', 'reject', data),
    )
    stream2$.then(
      (data: string) => console.log('unselected', 'resolve', data),
      (data: string) => console.log('unselected', 'reject', data),
    )
    promise$.next('1')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'selected', 'resolve', '1')

    promise$.next('2')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unselected', 'resolve', '2')

    promise$.next(Promise.reject('3'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'selected', 'reject', '3')

    promise$.next(Promise.reject('4'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'unselected', 'reject', '4')

    promise$.next('5')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(5, 'selected', 'resolve', '5')

    promise$.next('6')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(6, 'unselected', 'resolve', '6')

    promise$.next(Promise.reject('7'), true)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(7, 'selected', 'reject', '7')

    stream1$.finish.catch((data) => console.log('selected finish', data))
    stream2$.finish.finally(() => console.log('unselected finish'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(8, 'selected finish', '7')
  })

  test('test partition with unsubscribe', async () => {
    const { subjection$ } = streamFactory()

    const [stream1$, stream2$] = partition(subjection$, (n) => n % 2 === 1)

    stream1$.setUnsubscribeCallback(() => console.log('selected unsubscribe'))
    stream2$.setUnsubscribeCallback(() => console.log('unselected unsubscribe'))
    subjection$.unsubscribe()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'selected unsubscribe')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unselected unsubscribe')
  })

  test('test race', async () => {
    const { promise$: promise1$, subjection$: subjection1$ } = streamFactory()
    const { promise$: promise2$, subjection$: subjection2$ } = streamFactory()
    const { promise$: promise3$, subjection$: subjection3$ } = streamFactory()

    const stream$ = race(subjection1$, subjection2$, subjection3$)
    stream$.then(
      (data: string[]) => console.log('resolve', data.toString()),
      (data: string[]) => console.log('reject', data.toString()),
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
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'reject', 'c')
    await sleep(30)
    promise3$.next(Promise.resolve('n'), true)
    await sleep(30)
    promise2$.next(Promise.resolve('g'), true)
    await sleep(1)
    stream$.finish.catch((data: string) => console.log('finish', data))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'finish', 'c')
  })

  test('test race with unsubscribe', async () => {
    const { promise$: promise1$, subjection$: subjection1$ } = streamFactory()
    const { promise$: promise2$, subjection$: subjection2$ } = streamFactory()
    const { promise$: promise3$, subjection$: subjection3$ } = streamFactory()

    const stream$ = race(subjection1$, subjection2$, subjection3$)

    promise1$.next(1)
    promise2$.next(2)
    promise3$.next(3)
    stream$.setUnsubscribeCallback(() => console.log('race unsubscribe'))
    await sleep(1)
    subjection2$.unsubscribe()
    subjection3$.unsubscribe()
    expect(consoleSpy).toBeCalledTimes(0)

    subjection1$.unsubscribe()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'race unsubscribe')
  })
})
