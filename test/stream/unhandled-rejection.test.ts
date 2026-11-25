import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  $,
  combine,
  merge,
  concat,
  finish,
  fork,
  partition,
  promiseAll,
  promiseRace,
} from '../../index'

const flushRealTimers = () => new Promise((resolve) => setTimeout(resolve, 20))

describe('unhandledRejection regression tests', () => {
  let unhandledReasons: unknown[] = []
  const onUnhandledRejection = (reason: unknown) => {
    unhandledReasons.push(reason)
  }

  beforeEach(() => {
    vi.useRealTimers()
    unhandledReasons = []
    process.on('unhandledRejection', onUnhandledRejection)
  })

  afterEach(() => {
    process.off('unhandledRejection', onUnhandledRejection)
  })

  test('paused stream receiving next(Promise.reject(...)) should not trigger unhandledRejection', async () => {
    const stream$ = $<number>()
    const caught: unknown[] = []
    stream$.catch((err) => {
      caught.push(err)
    })

    stream$.pause()
    stream$.next(Promise.reject(new Error('paused reject')))

    await flushRealTimers()
    expect(unhandledReasons).toEqual([])
    expect(caught).toEqual([])
  })

  test('completed stream receiving next(Promise.reject(...)) should not trigger unhandledRejection', async () => {
    const stream$ = $<number>()
    const caught: unknown[] = []
    stream$.catch((err) => {
      caught.push(err)
    })

    stream$.complete()
    stream$.next(Promise.reject(new Error('completed reject')))

    await flushRealTimers()
    expect(unhandledReasons).toEqual([])
    expect(caught).toEqual([])
  })

  test('merge should not trigger unhandledRejection when paused or completed and upstream rejects', async () => {
    const a$ = $<number>()
    const pausedMerge$ = merge(a$)
    pausedMerge$.pause()

    const b$ = $<number>()
    const completedMerge$ = merge(b$)
    completedMerge$.complete()

    a$.next(Promise.reject(new Error('merge paused reject')))
    b$.next(Promise.reject(new Error('merge completed reject')))

    await flushRealTimers()
    expect(unhandledReasons).toEqual([])
  })

  test('combine, concat, finish, fork, partition, promiseAll, promiseRace should not trigger unhandledRejection when paused or completed', async () => {
    // combine
    const c1$ = $<number>()
    const c2$ = $<number>()
    const combinePaused$ = combine(c1$, c2$)
    combinePaused$.pause()
    c1$.next(1)
    c2$.next(Promise.reject(new Error('combine paused reject')))

    const c3$ = $<number>()
    const c4$ = $<number>()
    const combineCompleted$ = combine(c3$, c4$)
    combineCompleted$.complete()
    c3$.next(1)
    c4$.next(Promise.reject(new Error('combine completed reject')))

    // concat
    const k1$ = $<number>()
    const k2$ = $<number>()
    const concatPaused$ = concat(k1$, k2$)
    concatPaused$.pause()
    k1$.next(Promise.reject(new Error('concat paused reject')))

    const k3$ = $<number>()
    const k4$ = $<number>()
    const concatCompleted$ = concat(k3$, k4$)
    concatCompleted$.complete()
    k3$.next(Promise.reject(new Error('concat completed reject')))

    // finish
    const f1$ = $<number>()
    const finishPaused$ = finish(f1$)
    finishPaused$.pause()
    f1$.next(Promise.reject(new Error('finish paused reject')), true)

    const f2$ = $<number>()
    const finishCompleted$ = finish(f2$)
    finishCompleted$.complete()
    f2$.next(Promise.reject(new Error('finish completed reject')), true)

    // fork
    const fk1$ = $<number>()
    const forkPaused$ = fork(fk1$)
    forkPaused$.pause()
    fk1$.next(Promise.reject(new Error('fork paused reject')))

    const fk2$ = $<number>()
    const forkCompleted$ = fork(fk2$)
    forkCompleted$.complete()
    fk2$.next(Promise.reject(new Error('fork completed reject')))

    // partition (including partial complete where only one branch is completed/paused)
    const pt1$ = $<number>()
    const [selectedPaused$] = partition(pt1$, () => true)
    selectedPaused$.pause()
    pt1$.next(Promise.reject(new Error('partition paused reject')))

    const pt2$ = $<number>()
    const [selectedCompleted$] = partition(pt2$, () => true)
    selectedCompleted$.complete()
    pt2$.next(Promise.reject(new Error('partition completed reject')))

    // promiseAll
    const pa1$ = $<number>()
    const pa2$ = $<number>()
    const promiseAllPaused$ = promiseAll(pa1$, pa2$)
    promiseAllPaused$.pause()
    pa1$.next(1)
    pa2$.next(Promise.reject(new Error('promiseAll paused reject')))

    const pa3$ = $<number>()
    const pa4$ = $<number>()
    const promiseAllCompleted$ = promiseAll(pa3$, pa4$)
    promiseAllCompleted$.complete()
    pa3$.next(1)
    pa4$.next(Promise.reject(new Error('promiseAll completed reject')))

    // promiseRace
    const pr1$ = $<number>()
    const pr2$ = $<number>()
    const promiseRacePaused$ = promiseRace(pr1$, pr2$)
    promiseRacePaused$.pause()
    pr1$.next(Promise.reject(new Error('promiseRace paused reject')))

    const pr3$ = $<number>()
    const pr4$ = $<number>()
    const promiseRaceCompleted$ = promiseRace(pr3$, pr4$)
    promiseRaceCompleted$.complete()
    pr3$.next(Promise.reject(new Error('promiseRace completed reject')))

    await flushRealTimers()
    expect(unhandledReasons).toEqual([])
  })

  test('Stream.set with throwing async setter should propagate error to downstream catch without unhandledRejection', async () => {
    const stream$ = $({ count: 1 })
    const caught: unknown[] = []
    stream$.catch((err) => {
      caught.push(err)
    })

    const boom = new Error('async setter failed')
    stream$.set(async (draft) => {
      draft.count = 2
      await Promise.resolve()
      throw boom
    })

    await flushRealTimers()
    expect(caught).toEqual([boom])
    expect(unhandledReasons).toEqual([])
  })

  test('Stream.set with throwing async setter on paused stream should not trigger unhandledRejection', async () => {
    const stream$ = $({ count: 1 })
    stream$.pause()

    stream$.set(async (draft) => {
      draft.count = 2
      await Promise.resolve()
      throw new Error('async setter failed while paused')
    })

    await flushRealTimers()
    expect(unhandledReasons).toEqual([])
  })

  test('executePlugin replacing throwing node result should not trigger unhandledRejection', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      const stream$ = $<number>()
      const received: unknown[] = []

      stream$
        .then(() => {
          throw new Error('sync node error')
        })
        .use({
          execute: () => 'recovered',
        })
        .then((val) => {
          received.push(val)
        })

      stream$.next(1)

      await flushRealTimers()
      expect(received).toEqual(['recovered'])
      expect(unhandledReasons).toEqual([])
    } finally {
      errorSpy.mockRestore()
    }
  })

  test('executePlugin replacing rejected promise result should not trigger unhandledRejection', async () => {
    const stream$ = $<number>()
    const received: unknown[] = []

    stream$
      .then(() => Promise.reject(new Error('async node error')))
      .use({
        execute: () => 'recovered-async',
      })
      .then((val) => {
        received.push(val)
      })

    stream$.next(1)

    await flushRealTimers()
    expect(received).toEqual(['recovered-async'])
    expect(unhandledReasons).toEqual([])
  })
})
