import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, streamFactory } from '../utils'
import { promiseAll, promiseAllNoAwait } from '../../index'

describe('promiseAll operator', () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  // ===== Basic Functionality Tests =====
  describe('Basic Functionality', () => {
    test('should handle single stream', async () => {
      const { stream$, observable$ } = streamFactory()
      const result$ = promiseAll(observable$)

      result$.then(
        (value) => console.log('resolved', value.toString()),
        (error) => console.log('rejected', error.toString()),
      )

      stream$.next('single-value', true)
      expect(consoleSpy).toHaveBeenCalledWith('resolved', 'single-value')
    })

    test('should combine two streams successfully', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()

      const result$ = promiseAll(obs1$, obs2$)
      result$.then((values) => console.log('combined', values.toString()))

      stream1$.next('first')
      stream2$.next('second')
      expect(consoleSpy).toHaveBeenCalledWith('combined', 'first,second')
    })

    test('should combine multiple streams in correct order', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()
      const { stream$: stream3$, observable$: obs3$ } = streamFactory()

      const result$ = promiseAll(obs1$, obs2$, obs3$)
      result$.then((values) => console.log('ordered', values.toString()))

      stream1$.next('A')
      stream2$.next('B')
      stream3$.next('C')
      expect(consoleSpy).toHaveBeenCalledWith('ordered', 'A,B,C')
    })

    test('should wait for all streams before emitting', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()
      const { stream$: stream3$, observable$: obs3$ } = streamFactory()

      const result$ = promiseAll(obs1$, obs2$, obs3$)
      result$.then((values) => console.log('all-ready', values.toString()))

      // Only resolve first two streams
      stream1$.next('ready1')
      stream2$.next('ready2')
      // Should not emit yet
      expect(consoleSpy).not.toHaveBeenCalled()

      // Resolve third stream
      stream3$.next('ready3')
      expect(consoleSpy).toHaveBeenCalledWith('all-ready', 'ready1,ready2,ready3')
    })
  })

  // ===== Error Handling Tests =====
  describe('Error Handling', () => {
    test('should handle single stream rejection', async () => {
      const { stream$, observable$ } = streamFactory()
      const result$ = promiseAll(observable$)

      result$.then(
        (value) => console.log('resolved', value.toString()),
        (error) => console.log('rejected', error.toString()),
      )

      stream$.next(Promise.reject('error'))
      await sleep(10)
      expect(consoleSpy).toHaveBeenCalledWith('rejected', 'error')
    })

    test('should handle mixed resolved and rejected streams', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()

      const result$ = promiseAll(obs1$, obs2$)
      result$.then(
        (values) => console.log('resolved', values.toString()),
        (errors) => console.log('rejected', errors.toString()),
      )

      stream1$.next('success')
      stream2$.next(Promise.reject('failure'))
      await sleep(10)
      expect(consoleSpy).toHaveBeenCalledWith('rejected', 'success,failure')
    })

    test('should handle multiple rejections', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()

      const result$ = promiseAll(obs1$, obs2$)
      result$.then(
        (values) => console.log('resolved', values.toString()),
        (errors) => console.log('rejected', errors.toString()),
      )

      stream1$.next(Promise.reject('error1'))
      stream2$.next(Promise.reject('error2'))
      await sleep(10)
      expect(consoleSpy).toHaveBeenCalledWith('rejected', 'error1,error2')
    })

    test('should handle async promise rejections', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()

      const result$ = promiseAll(obs1$, obs2$)
      result$.then(
        (values) => console.log('resolved', values.toString()),
        (errors) => console.log('rejected', errors.toString()),
      )

      stream1$.next('success')
      stream2$.next(new Promise((_, reject) => setTimeout(() => reject('async-error'), 50)))

      await sleep(25)
      expect(consoleSpy).not.toHaveBeenCalled()

      await sleep(30)
      expect(consoleSpy).toHaveBeenCalledWith('rejected', 'success,async-error')
    })
  })

  // ===== Edge Cases and Boundary Conditions =====
  describe('Edge Cases', () => {
    test('should handle rapid consecutive updates', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()

      const result$ = promiseAll(obs1$, obs2$)
      result$.then(
        (values) => console.log('rapid', values.toString()),
        (errors) => console.log('rapid-error', errors.toString()),
      )

      // Rapid updates with sync values
      stream1$.next('rapid1')
      stream2$.next('rapid2')
      expect(consoleSpy).toHaveBeenNthCalledWith(1, 'rapid', 'rapid1,rapid2')

      // Update with rejection (async)
      stream1$.next('rapid3')
      stream2$.next(Promise.reject('rapid4'))
      await sleep(1)
      expect(consoleSpy).toHaveBeenNthCalledWith(2, 'rapid-error', 'rapid3,rapid4')

      // Back to sync values
      stream1$.next('rapid5')
      stream2$.next('rapid6')
      expect(consoleSpy).toHaveBeenNthCalledWith(3, 'rapid', 'rapid5,rapid6')
    })

    test('should handle mixed sync and async values', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()
      const { stream$: stream3$, observable$: obs3$ } = streamFactory()

      const result$ = promiseAll(obs1$, obs2$, obs3$)
      result$.then((values) => console.log('mixed', values.toString()))

      stream1$.next('sync')
      stream2$.next(new Promise((resolve) => setTimeout(() => resolve('async'), 50)))
      stream3$.next('sync2')

      await sleep(25)
      expect(consoleSpy).not.toHaveBeenCalled()

      await sleep(30)
      expect(consoleSpy).toHaveBeenCalledWith('mixed', 'sync,async,sync2')
    })
  })

  // ===== Status Management Tests =====
  describe('Status Management', () => {
    test('should reset promise status after each emission', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()

      const result$ = promiseAll(obs1$, obs2$)
      result$.then(
        (values) => console.log('reset', values.toString()),
        (errors) => console.log('reset-error', errors.toString()),
      )

      // First emission (sync)
      stream1$.next('first1')
      stream2$.next('first2')
      expect(consoleSpy).toHaveBeenNthCalledWith(1, 'reset', 'first1,first2')

      // Second emission with rejection (async)
      stream1$.next('second1')
      stream2$.next(Promise.reject('second2'))
      await sleep(10)
      expect(consoleSpy).toHaveBeenNthCalledWith(2, 'reset-error', 'second1,second2')

      // Third emission successful again (sync)
      stream1$.next('third1')
      stream2$.next('third2')
      expect(consoleSpy).toHaveBeenNthCalledWith(3, 'reset', 'third1,third2')
    })

    test('should handle pending status correctly', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()

      const result$ = promiseAll(obs1$, obs2$)
      result$.then((values) => console.log('pending', values.toString()))

      // Set one stream to pending state
      stream1$.next(new Promise((resolve) => setTimeout(() => resolve('delayed'), 100)))
      stream2$.next('immediate')

      await sleep(50)
      expect(consoleSpy).not.toHaveBeenCalled()

      // Update the non-pending stream (sync)
      stream2$.next('updated')
      expect(consoleSpy).not.toHaveBeenCalled()

      await sleep(50)
      expect(consoleSpy).toHaveBeenCalledWith('pending', 'delayed,updated')
    })

    test('should handle status updates during async operations', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()

      const result$ = promiseAll(obs1$, obs2$)
      result$.then((values) => console.log('async-status', values.toString()))

      // Set one stream to pending
      stream1$.next(new Promise((resolve) => setTimeout(() => resolve('delayed'), 100)))
      stream2$.next('immediate')

      await sleep(10)
      // The result should not have emitted yet
      expect(consoleSpy).not.toHaveBeenCalled()

      await sleep(100)
      // Now it should have emitted
      expect(consoleSpy).toHaveBeenCalledWith('async-status', 'delayed,immediate')
    })

    test('should set output stream status to pending when input has pending promise', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()

      const result$ = promiseAll(obs1$, obs2$)
      let resultEmitted = false

      result$.then(() => {
        resultEmitted = true
      })

      // Send a promise that won't resolve immediately
      let resolvePending: ((value: string) => void) | undefined
      const pendingPromise = new Promise<string>((resolve) => {
        resolvePending = resolve
      })

      stream1$.next(pendingPromise)
      stream2$.next('immediate')

      await sleep(10)

      // The result should not have emitted yet
      expect(resultEmitted).toBe(false)

      // Resolve the promise
      if (resolvePending) {
        resolvePending('resolved-delayed')
      }
      await sleep(10)

      // Now it should have emitted
      expect(resultEmitted).toBe(true)
    })

    test('should reset pending status when all promises resolve', async () => {
      const { stream$: stream1$ } = streamFactory()
      const { stream$: stream2$ } = streamFactory()

      const result$ = promiseAll(stream1$, stream2$)
      let emittedValues: string[] = []

      result$.then((values) => {
        emittedValues = values
      })

      // First emission with pending promise
      let resolveFirst: ((value: string) => void) | undefined
      const firstPromise = new Promise<string>((resolve) => {
        resolveFirst = resolve
      })

      stream1$.next(firstPromise)
      stream2$.next('sync1')

      // Should be pending
      await sleep(10)
      expect(result$.status).toBe('pending')
      expect(emittedValues).toEqual([])

      // Resolve first promise
      if (resolveFirst) {
        resolveFirst('async1')
      }
      await sleep(10)

      // Should have emitted and no longer pending
      expect(result$.status).not.toBe('pending')
      expect(emittedValues).toEqual(['async1', 'sync1'])

      // Second emission with sync values
      stream1$.next('sync2')
      stream2$.next('sync3')

      // Should emit immediately and not be pending
      expect(result$.status).not.toBe('pending')
      expect(emittedValues).toEqual(['sync2', 'sync3'])
    })
  })

  // ===== Lifecycle Management Tests =====
  describe('Lifecycle Management', () => {
    test('should complete when all input streams finish', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()

      const result$ = promiseAll(obs1$, obs2$)
      result$.afterComplete(() => console.log('lifecycle-complete'))

      stream1$.next('final1', true)
      stream2$.next('final2', true)
      expect(consoleSpy).toHaveBeenCalledWith('lifecycle-complete')
    })

    test('should unsubscribe when all input streams unsubscribe', async () => {
      const { observable$: obs1$ } = streamFactory()
      const { observable$: obs2$ } = streamFactory()

      const result$ = promiseAll(obs1$, obs2$)
      result$.afterComplete(() => console.log('unsubscribe-complete'))
      result$.afterUnsubscribe(() => console.log('unsubscribe-callback'))

      obs1$.unsubscribe()
      obs2$.unsubscribe()
      await sleep(1)
      expect(consoleSpy).toHaveBeenCalledWith('unsubscribe-complete')
      expect(consoleSpy).toHaveBeenCalledWith('unsubscribe-callback')
    })

    test('should clean up callbacks on unsubscribe', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()

      const result$ = promiseAll(obs1$, obs2$)
      result$.afterUnsubscribe(() => console.log('cleanup'))

      // Process some values (sync)
      stream1$.next('before-cleanup')
      stream2$.next('before-cleanup')

      // Unsubscribe result stream
      result$.unsubscribe()
      await sleep(10)

      // Further unsubscribes should not trigger additional callbacks
      obs1$.unsubscribe()
      obs2$.unsubscribe()
      await sleep(10)

      expect(consoleSpy).toHaveBeenCalledWith('cleanup')
      expect(consoleSpy).toHaveBeenCalledTimes(1)
    })

    test('should clean up internal arrays after completion', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()

      const result$ = promiseAll(obs1$, obs2$)
      let capturedValue: any[] = []
      let thenCalled = false
      let completeCalled = false

      result$.afterComplete((value) => {
        capturedValue = value
        completeCalled = true
      })

      result$.then(() => {
        thenCalled = true
      })

      // Both streams complete together
      stream1$.next('cleanup1', true)
      stream2$.next('cleanup2', true)

      // Check that then was called
      expect(thenCalled).toBe(true)
      // Check that complete was called
      expect(completeCalled).toBe(true)
      expect(capturedValue).toEqual(['cleanup1', 'cleanup2'])
    })
  })

  // ===== Complex Scenarios =====
  describe('Complex Scenarios', () => {
    beforeEach(() => {
      consoleSpy.mockClear()
    })

    test('should handle complex timing patterns', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()
      const { stream$: stream3$, observable$: obs3$ } = streamFactory()

      const result$ = promiseAll(obs1$, obs2$, obs3$)
      let resolveCount = 0
      let rejectCount = 0
      let completeCount = 0

      result$.afterComplete(() => completeCount++)
      result$.then(
        () => resolveCount++,
        () => rejectCount++,
      )

      // Complex timing pattern - all sync until rejection
      stream1$.next('a')
      await sleep(30)
      stream2$.next('h')
      await sleep(30)
      stream3$.next('o')
      await sleep(30)
      // First emission
      expect(resolveCount).toBe(1)

      stream1$.next('b')
      await sleep(30)
      stream2$.next('i')
      await sleep(30)
      stream2$.next('j')
      await sleep(30)
      stream3$.next('p')
      await sleep(30)
      // Second emission
      expect(resolveCount).toBe(2)

      stream1$.next('c')
      await sleep(30)
      stream2$.next('k')
      await sleep(30)
      stream1$.next('d')
      await sleep(30)
      stream2$.next('l')
      await sleep(30)
      stream1$.next('e')
      await sleep(30)
      stream3$.next(Promise.reject('q'))
      await sleep(30)
      // Third emission (rejection)
      expect(rejectCount).toBe(1)

      stream2$.next('m', true)
      await sleep(30)
      stream1$.next('g', true)
      await sleep(30)
      stream3$.next('r', true)
      await sleep(30)
      // Final emissions
      expect(completeCount).toBe(1)
      expect(resolveCount).toBe(3)
    })

    test('should handle large number of streams', async () => {
      const streams = Array.from({ length: 10 }, () => streamFactory())
      const observables = streams.map(({ observable$ }) => observable$)

      const result$ = promiseAll(...observables)
      result$.then((values) => console.log('large-count', values.length))

      // Emit values to all streams (sync)
      streams.forEach(({ stream$ }, index) => {
        stream$.next(`value${index}`)
      })
      expect(consoleSpy).toHaveBeenCalledWith('large-count', 10)
    })
  })

  // ===== promiseAllNoAwait Specific Tests =====
  describe('promiseAllNoAwait Behavior', () => {
    test('should not wait for pending promises during status reset', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()

      const result$ = promiseAllNoAwait(obs1$, obs2$)
      result$.then((values) => console.log('no-await', values.toString()))

      // Set both streams to pending state
      stream1$.next(new Promise((resolve) => setTimeout(() => resolve('delayed1'), 100)))
      stream2$.next(new Promise((resolve) => setTimeout(() => resolve('delayed2'), 50)))

      await sleep(60)
      // Send new values while promises are still pending
      stream1$.next('immediate1')
      await sleep(10)
      expect(consoleSpy).toHaveBeenCalledWith('no-await', 'immediate1,delayed2')
    })

    test('should behave same as promiseAll for non-pending cases', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()

      const resultAwait$ = promiseAll(obs1$, obs2$)
      const resultNoAwait$ = promiseAllNoAwait(obs1$, obs2$)

      resultAwait$.then((values) => console.log('await-version', values.toString()))
      resultNoAwait$.then((values) => console.log('no-await-version', values.toString()))

      stream1$.next('sync1')
      stream2$.next('sync2')
      expect(consoleSpy).toHaveBeenCalledWith('await-version', 'sync1,sync2')
      expect(consoleSpy).toHaveBeenCalledWith('no-await-version', 'sync1,sync2')
    })
  })

  // ===== Function Behavior Comparison =====
  describe('Function Comparison', () => {
    test('should demonstrate difference in pending promise handling', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()

      const awaitResult$ = promiseAll(obs1$, obs2$)
      const noAwaitResult$ = promiseAllNoAwait(obs1$, obs2$)

      awaitResult$.then((values) => console.log('await-behavior', values.toString()))
      noAwaitResult$.then((values) => console.log('no-await-behavior', values.toString()))

      // Send async values
      stream1$.next(new Promise((resolve) => setTimeout(() => resolve('async1'), 50)))
      stream2$.next('sync2')

      await sleep(25)
      // Update while first promise is still pending
      stream2$.next('sync2-updated')
      await sleep(50)

      expect(consoleSpy).toHaveBeenCalledWith('await-behavior', 'async1,sync2-updated')
      expect(consoleSpy).toHaveBeenCalledWith('no-await-behavior', 'async1,sync2-updated')
    })

    test('should have identical type inference', async () => {
      const { stream$: stream1$, observable$: obs1$ } = streamFactory()
      const { stream$: stream2$, observable$: obs2$ } = streamFactory()
      const { stream$: stream3$, observable$: obs3$ } = streamFactory()

      // Both should have identical return types
      const result1$ = promiseAll(obs1$, obs2$, obs3$)
      const result2$ = promiseAllNoAwait(obs1$, obs2$, obs3$)

      result1$.then((values) =>
        console.log('type-test1', typeof values[0], typeof values[1], typeof values[2]),
      )
      result2$.then((values) =>
        console.log('type-test2', typeof values[0], typeof values[1], typeof values[2]),
      )

      stream1$.next('string')
      stream2$.next(42)
      stream3$.next(true)
      expect(consoleSpy).toHaveBeenCalledWith('type-test1', 'string', 'number', 'boolean')
      expect(consoleSpy).toHaveBeenCalledWith('type-test2', 'string', 'number', 'boolean')
    })
  })
})
