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

  // ===== Additional Test Cases for Enhanced Features =====

  test('should validate input types strictly', async () => {
    expect(() => {
      promiseRace(null as any)
    }).toThrow('promiseRace operator only accepts Stream or Observable as input')

    expect(() => {
      promiseRace('invalid' as any, 123 as any)
    }).toThrow('promiseRace operator only accepts Stream or Observable as input')

    expect(() => {
      promiseRace({} as any, [] as any)
    }).toThrow('promiseRace operator only accepts Stream or Observable as input')
  })

  test('should handle empty input arrays', async () => {
    const result$ = promiseRace()
    let emitted = false
    let completed = false

    result$.then(() => {
      emitted = true
    })

    result$.afterComplete(() => {
      completed = true
      console.log('empty-race-complete')
    })

    await sleep(1)

    // Empty race should not emit or complete immediately
    expect(emitted).toBe(false)
    expect(completed).toBe(false)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('should handle single stream race', async () => {
    const { stream$, observable$ } = streamFactory()
    const result$ = promiseRace(observable$)

    result$.then((value: string) => console.log('single-race:', value))

    stream$.next('only-one')
    await sleep(1)

    expect(consoleSpy).toHaveBeenCalledWith('single-race:', 'only-one')
  })

  test('should handle finished stream initialization correctly', async () => {
    const { stream$: stream1$, observable$: obs1$ } = streamFactory()
    const { stream$: stream2$, observable$: obs2$ } = streamFactory()
    const { stream$: stream3$, observable$: obs3$ } = streamFactory()

    // Pre-finish all streams
    stream1$.next('first-finished', true)
    stream2$.next('second-finished', true)
    stream3$.next('third-finished', true)
    await sleep(1)

    const result$ = promiseRace(obs1$, obs2$, obs3$)
    let completeCalled = false

    result$.afterComplete(() => {
      completeCalled = true
      console.log('all-finished-race-complete')
    })

    await sleep(1)

    // Since all input streams are finished, the race should complete
    expect(completeCalled).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith('all-finished-race-complete')
  })

  test('should handle mixed finished and active streams', async () => {
    const { stream$: stream1$, observable$: obs1$ } = streamFactory()
    const { stream$: stream2$, observable$: obs2$ } = streamFactory()
    const { stream$: stream3$, observable$: obs3$ } = streamFactory()

    // Pre-finish one stream
    stream1$.next('pre-finished', true)
    await sleep(1)

    const result$ = promiseRace(obs1$, obs2$, obs3$)
    result$.then((value: string) => console.log('mixed-race:', value))

    // Active streams compete
    stream2$.next('second-wins')

    expect(consoleSpy).toHaveBeenCalledWith('mixed-race:', 'second-wins')

    // Third stream should be ignored
    stream3$.next('third-ignored')
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  test('should handle async promise race correctly', async () => {
    const { stream$: stream1$, observable$: obs1$ } = streamFactory()
    const { stream$: stream2$, observable$: obs2$ } = streamFactory()
    const { stream$: stream3$, observable$: obs3$ } = streamFactory()

    const result$ = promiseRace(obs1$, obs2$, obs3$)
    result$.then((value: string) => console.log('async-race:', value))

    // Send promises with different resolution times
    stream1$.next(new Promise((resolve) => setTimeout(() => resolve('slow'), 100)))
    stream2$.next(new Promise((resolve) => setTimeout(() => resolve('fast'), 20)))
    stream3$.next(new Promise((resolve) => setTimeout(() => resolve('medium'), 50)))

    await sleep(25)
    expect(consoleSpy).toHaveBeenCalledWith('async-race:', 'fast')

    // Later promises should be ignored even if they resolve
    await sleep(80)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  test('should handle completion callback cleanup', async () => {
    const { stream$: stream1$, observable$: obs1$ } = streamFactory()
    const { stream$: stream2$, observable$: obs2$ } = streamFactory()

    const result$ = promiseRace(obs1$, obs2$)
    let completeCalls = 0

    result$.afterComplete(() => {
      completeCalls++
      console.log('race-complete', completeCalls)
    })

    // First stream wins
    stream1$.next('winner')
    await sleep(1)

    // Complete the winning stream
    stream1$.complete()
    await sleep(1)

    expect(completeCalls).toBe(1)
    expect(consoleSpy).toHaveBeenCalledWith('race-complete', 1)

    // Complete the other stream (should not trigger additional complete)
    stream2$.complete()
    await sleep(1)

    expect(completeCalls).toBe(1)
  })

  test('should handle unsubscribe callback cleanup', async () => {
    const { stream$: stream1$, observable$: obs1$ } = streamFactory()
    const { observable$: obs2$ } = streamFactory()

    const result$ = promiseRace(obs1$, obs2$)
    let unsubscribeCalls = 0

    result$.afterUnsubscribe(() => {
      unsubscribeCalls++
      console.log('race-unsubscribe', unsubscribeCalls)
    })

    // First stream wins
    stream1$.next('winner')
    await sleep(1)

    // Unsubscribe the winning stream
    obs1$.unsubscribe()
    await sleep(1)

    expect(unsubscribeCalls).toBe(1)
    expect(consoleSpy).toHaveBeenCalledWith('race-unsubscribe', 1)

    // Unsubscribe the other stream (should not trigger additional unsubscribe)
    obs2$.unsubscribe()
    await sleep(1)

    expect(unsubscribeCalls).toBe(1)
  })

  test('should handle rapid consecutive emissions from winner', async () => {
    const { stream$: stream1$, observable$: obs1$ } = streamFactory()
    const { stream$: stream2$, observable$: obs2$ } = streamFactory()

    const result$ = promiseRace(obs1$, obs2$)
    result$.then((value: string) => console.log('rapid:', value))

    // First stream wins with rapid emissions
    stream1$.next('first')
    stream1$.next('second')
    stream1$.next('third')
    await sleep(1)

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'rapid:', 'first')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'rapid:', 'second')
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'rapid:', 'third')

    // Other stream should be completely ignored
    stream2$.next('ignored1')
    stream2$.next('ignored2')
    await sleep(1)

    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })

  test('should handle mixed resolved and rejected from winner', async () => {
    const { stream$: stream1$, observable$: obs1$ } = streamFactory()
    const { stream$: stream2$, observable$: obs2$ } = streamFactory()

    const result$ = promiseRace(obs1$, obs2$)
    result$.then(
      (value: string) => console.log('mixed-resolved:', value),
      (error: string) => console.log('mixed-rejected:', error),
    )

    // First stream wins with initial resolve
    stream1$.next('initial-resolve')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'mixed-resolved:', 'initial-resolve')

    // Winner continues with rejection
    stream1$.next(Promise.reject('subsequent-reject'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'mixed-rejected:', 'subsequent-reject')

    // Winner resolves again
    stream1$.next('final-resolve')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'mixed-resolved:', 'final-resolve')

    // Other stream emissions should be ignored
    stream2$.next('totally-ignored')
    stream2$.next(Promise.reject('also-ignored'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })

  test('should handle large number of competing streams', async () => {
    const streams = Array.from({ length: 10 }, () => streamFactory())
    const observables = streams.map(({ observable$ }) => observable$)

    const result$ = promiseRace(...observables)
    result$.then((value: string) => console.log('large-race-winner:', value))

    // Let the 5th stream win
    streams[5].stream$.next('stream-5-wins')
    await sleep(1)

    expect(consoleSpy).toHaveBeenCalledWith('large-race-winner:', 'stream-5-wins')

    // All other streams should be ignored
    streams.forEach(({ stream$ }, index) => {
      if (index !== 5) {
        stream$.next(`stream-${index}-ignored`)
      }
    })
    await sleep(1)

    // Only the winner's subsequent emission should be processed
    streams[5].stream$.next('stream-5-again')
    await sleep(1)

    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'large-race-winner:', 'stream-5-again')
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('should handle race result stream unsubscription', async () => {
    const { stream$: stream1$, observable$: obs1$ } = streamFactory()
    const { observable$: obs2$ } = streamFactory()

    const result$ = promiseRace(obs1$, obs2$)
    let emissionCount = 0

    result$.then(() => {
      emissionCount++
    })

    // Winner emits
    stream1$.next('before-unsubscribe')
    await sleep(1)
    expect(emissionCount).toBe(1)

    // Unsubscribe the result stream
    result$.unsubscribe()

    // Further emissions should not be processed
    stream1$.next('after-unsubscribe')
    await sleep(1)
    expect(emissionCount).toBe(1)
  })

  test('should have correct type inference', async () => {
    const { stream$: stream1$, observable$: obs1$ } = streamFactory()
    const { stream$: stream2$, observable$: obs2$ } = streamFactory()
    const { stream$: stream3$, observable$: obs3$ } = streamFactory()

    // Test that type inference works correctly
    const result$ = promiseRace(obs1$, obs2$, obs3$)

    result$.then((value) => {
      // Should infer the union type correctly
      console.log('type-test:', typeof value, value)
    })

    stream1$.next('string-value')
    stream2$.next(42)
    stream3$.next(true)

    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledWith('type-test:', 'string', 'string-value')
  })
})
