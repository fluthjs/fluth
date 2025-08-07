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
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 'a')
    await sleep(30)
    promise3$.next(Promise.resolve('l'))
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolve', 'l')
    await sleep(30)
    promise2$.next(Promise.reject('e'))
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'reject', 'e')
    await sleep(30)

    promise1$.next(Promise.resolve('b'))
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'resolve', 'b')
    await sleep(30)
    promise3$.next(Promise.reject('m'))
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(5, 'reject', 'm')
    await sleep(30)
    promise2$.next(Promise.resolve('f'))
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(6, 'resolve', 'f')
    await sleep(30)

    promise1$.next(Promise.resolve('c'), true)
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(7, 'resolve', 'c')
    await sleep(30)
    promise3$.next(Promise.resolve('n'), true)
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(8, 'resolve', 'n')
    await sleep(30)
    promise2$.next(Promise.reject('g'), true)
    await vi.runAllTimersAsync()
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
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe')
  })

  test('test merge with single stream', () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const stream$ = merge(observable1$)

    stream$.then((value: string) => console.log('merged:', value))

    promise1$.next('single')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'merged:', 'single')

    promise1$.next('another', true)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'merged:', 'another')
  })

  test('test merge with empty input', () => {
    const stream$ = merge()
    const results: any[] = []

    stream$.then((value) => results.push(value))

    // Empty merge should create stream but emit nothing
    expect(results).toEqual([])
  })

  test('test merge with invalid input types', () => {
    const invalidInputs = [null, undefined, 'string', 123, {}, [], Promise.resolve('test')]

    invalidInputs.forEach((input) => {
      expect(() => merge(input as any)).toThrow(
        'merge operator only accepts Stream or Observable as input',
      )
    })
  })

  test('test merge with pre-completed streams', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()

    // Complete streams before merge
    promise1$.next('pre-completed-1', true)
    promise2$.next('pre-completed-2', true)

    const stream$ = merge(observable1$, observable2$)
    const results: string[] = []
    let completed = false

    stream$.then((value: string) => results.push(value))
    stream$.afterComplete(() => {
      completed = true
      console.log('merge-completed')
    })

    await vi.runAllTimersAsync()

    // Pre-completed streams should not emit data
    expect(results).toEqual([])
    expect(completed).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith('merge-completed')
  })

  test('test merge with mixed completed and active streams', () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    // Complete first stream before merge
    promise1$.next('pre-completed', true)

    const stream$ = merge(observable1$, observable2$, observable3$)
    const results: string[] = []
    let completed = false

    stream$.then((value: string) => {
      results.push(value)
      console.log('mixed-result:', value)
    })
    stream$.afterComplete(() => {
      completed = true
      console.log('mixed-completed')
    })

    // Pre-completed data should not be emitted
    expect(results).toEqual([])
    expect(completed).toBe(false)

    // Active streams should emit normally
    promise2$.next('active-2')

    expect(results).toEqual(['active-2'])
    expect(consoleSpy).toHaveBeenCalledWith('mixed-result:', 'active-2')

    promise3$.next('active-3', true)

    expect(results).toEqual(['active-2', 'active-3'])

    // Complete remaining stream
    promise2$.next('final-2', true)

    expect(results).toEqual(['active-2', 'active-3', 'final-2'])
    // Merge detect pre-completed first stream, will complete automatically
    expect(completed).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith('mixed-completed')
  })

  test('test merge concurrent emissions', () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    const stream$ = merge(observable1$, observable2$, observable3$)
    const results: string[] = []
    const timestamps: number[] = []

    stream$.then((value: string) => {
      results.push(value)
      timestamps.push(Date.now())
      console.log('concurrent:', value)
    })

    // Emit simultaneously from all streams
    promise1$.next('stream1-data')
    promise2$.next('stream2-data')
    promise3$.next('stream3-data')

    // All emissions should be received
    expect(results).toEqual(['stream1-data', 'stream2-data', 'stream3-data'])
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'concurrent:', 'stream1-data')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'concurrent:', 'stream2-data')
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'concurrent:', 'stream3-data')
  })

  test('test merge with errors from multiple streams', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()

    const stream$ = merge(observable1$, observable2$)
    const results: string[] = []
    const errors: string[] = []

    stream$.then(
      (value: string) => {
        results.push(value)
        console.log('success:', value)
      },
      (error: string) => {
        errors.push(error)
        console.log('error:', error)
      },
    )

    // Mix success and error emissions
    promise1$.next(Promise.resolve('success-1'))
    promise2$.next(Promise.reject('error-1'))
    await vi.runAllTimersAsync()

    expect(results).toEqual(['success-1'])
    expect(errors).toEqual(['error-1'])
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'success:', 'success-1')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'error:', 'error-1')

    // More mixed emissions
    promise1$.next(Promise.reject('error-2'))
    await vi.runAllTimersAsync()
    promise2$.next(Promise.resolve('success-2'), true)
    await vi.runAllTimersAsync()

    expect(results).toEqual(['success-1', 'success-2'])
    expect(errors).toEqual(['error-1', 'error-2'])

    // Complete first stream
    promise1$.next(Promise.resolve('final'), true)
    await vi.runAllTimersAsync()

    expect(results).toEqual(['success-1', 'success-2', 'final'])
  })

  test('test merge finishCount mechanism', () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    const stream$ = merge(observable1$, observable2$, observable3$)
    let completionCount = 0

    stream$.afterComplete(() => {
      completionCount++
      console.log('finish-count-test')
    })

    // Complete streams one by one
    promise1$.next('first', true)
    expect(completionCount).toBe(0) // Should not complete yet

    promise2$.next('second', true)
    expect(completionCount).toBe(0) // Should not complete yet

    promise3$.next('third', true)
    expect(completionCount).toBe(1) // Should complete now
    expect(consoleSpy).toHaveBeenCalledWith('finish-count-test')
  })

  test('test merge partial unsubscribe behavior', async () => {
    const { observable$: observable1$ } = streamFactory()
    const { observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    const stream$ = merge(observable1$, observable2$, observable3$)
    const results: string[] = []
    let unsubscribed = false

    stream$.then((value: string) => results.push(value))
    stream$.afterUnsubscribe(() => {
      unsubscribed = true
      console.log('partial-unsubscribe')
    })

    // Unsubscribe some streams, but not all
    observable1$.unsubscribe()
    observable2$.unsubscribe()

    // Merge should not unsubscribe yet
    expect(unsubscribed).toBe(false)

    // Remaining stream should still work
    promise3$.next('still-working')
    expect(results).toEqual(['still-working'])

    // Unsubscribe last stream
    observable3$.unsubscribe()
    await vi.runAllTimersAsync()

    // Now merge should unsubscribe
    expect(unsubscribed).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith('partial-unsubscribe')
  })

  test('test merge cleanup and memory management', () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()

    const stream$ = merge(observable1$, observable2$)
    const results: string[] = []

    stream$.then((value: string) => results.push(value))

    // Emit some data
    promise1$.next('data-1')
    promise2$.next('data-2')
    expect(results).toEqual(['data-1', 'data-2'])

    // Manually unsubscribe merge stream to trigger cleanup
    let cleanupCalled = false
    stream$.afterUnsubscribe(() => {
      cleanupCalled = true
      console.log('cleanup')
    })

    stream$.unsubscribe()

    expect(cleanupCalled).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith('cleanup')

    // Original streams should not affect results after cleanup
    promise1$.next('after-cleanup')
    promise2$.next('after-cleanup-2')
    expect(results).toEqual(['data-1', 'data-2']) // No new data
  })

  test('test merge with immediate completion check', async () => {
    const factory1 = streamFactory()
    const factory2 = streamFactory()

    // Complete both streams before creating merge
    factory1.stream$.next('pre-1', true)
    factory2.stream$.next('pre-2', true)

    let completedImmediately = false

    const stream$ = merge(factory1.observable$, factory2.observable$)
    stream$.afterComplete(() => {
      completedImmediately = true
      console.log('immediate-completion')
    })

    // Check completion happens in next tick due to Promise.resolve().then()
    expect(completedImmediately).toBe(false)

    await vi.runAllTimersAsync()
    // Merge cannot detect pre-completed streams, so won't complete
    expect(completedImmediately).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith('immediate-completion')
  })
})
