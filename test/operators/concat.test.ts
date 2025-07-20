import { beforeEach, describe, expect, test, vi } from 'vitest'
import { $, concat } from '../../index'
import { streamFactory, sleep, consoleSpy } from '../utils'

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

  test('test concat basic functionality with sequential emission', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    const stream$ = concat(observable1$, observable2$, observable3$)
    const results: string[] = []
    let completed = false

    stream$.then((value: string) => {
      results.push(value)
      console.log('resolve', value)
    })

    stream$.afterComplete(() => {
      completed = true
      console.log('concat-completed')
    })

    // Emit from first stream
    promise1$.next('a')
    await sleep(1)
    expect(results).toEqual(['a'])

    promise1$.next('b')
    await sleep(1)
    expect(results).toEqual(['a', 'b'])

    // Second stream emits but should not be output yet (first stream not completed)
    promise2$.next('c')
    await sleep(1)
    expect(results).toEqual(['a', 'b']) // 'c' should not be emitted yet

    // Complete first stream
    promise1$.next('final1', true)
    await sleep(1)
    expect(results).toEqual(['a', 'b', 'final1'])

    // Previous 'c' is discarded, only new emissions from second stream count
    promise2$.next('d', true)
    await sleep(1)
    expect(results).toEqual(['a', 'b', 'final1', 'd']) // 'c' is discarded!

    // Third stream should emit after second completes
    expect(consoleSpy).not.toHaveBeenCalledWith('concat-completed')
    promise3$.next('e', true)
    await sleep(1)
    expect(results).toEqual(['a', 'b', 'final1', 'd', 'e'])
    expect(completed).toBe(true)

    expect(consoleSpy).toHaveBeenCalledWith('concat-completed')
  })

  test('test concat with rejected streams', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()

    const stream$ = concat(observable1$, observable2$)
    const results: string[] = []
    const errors: string[] = []

    stream$.then(
      (value: string) => {
        results.push(value)
        console.log('resolve', value)
      },
      (error: string) => {
        errors.push(error)
        console.log('reject', error)
      },
    )

    // First stream emits normally then rejects
    promise1$.next('success1')
    await sleep(1)
    expect(results).toEqual(['success1'])

    promise1$.next(Promise.reject('error1'), true)
    await sleep(1)
    expect(errors).toEqual(['error1'])

    // Second stream should emit after first completes (even with error)
    promise2$.next('success2', true)
    await sleep(1)
    expect(results).toEqual(['success1', 'success2'])

    expect(consoleSpy).toHaveBeenCalledWith('reject', 'error1')
    expect(consoleSpy).toHaveBeenCalledWith('resolve', 'success2')
  })

  test('test concat with all streams unsubscribe', async () => {
    const { observable$: observable1$ } = streamFactory()
    const { observable$: observable2$ } = streamFactory()
    const { observable$: observable3$ } = streamFactory()

    const stream$ = concat(observable1$, observable2$, observable3$)
    stream$.afterUnsubscribe(() => console.log('unsubscribe'))

    observable1$.unsubscribe()
    observable2$.unsubscribe()
    observable3$.unsubscribe()
    await sleep(1)

    expect(consoleSpy).toHaveBeenCalledWith('unsubscribe')
  })

  test('test concat with invalid input types', () => {
    const invalidInputs = [null, undefined, 'string', 123, {}, [], Promise.resolve('test')]

    invalidInputs.forEach((input) => {
      expect(() => {
        concat(input as any)
      }).toThrow('concat operator only accepts Stream or Observable as input')
    })
  })

  test('test concat with mixed invalid and valid inputs', () => {
    const stream$ = $()
    const observable$ = stream$.then((value) => value)

    expect(() => {
      concat(stream$, 'invalid' as any, observable$)
    }).toThrow('concat operator only accepts Stream or Observable as input')
  })

  test('test concat with valid input types', () => {
    const stream$ = $()
    const observable$ = stream$.then((value) => value)

    expect(() => concat(stream$)).not.toThrow()
    expect(() => concat(observable$)).not.toThrow()
    expect(() => concat(stream$, observable$)).not.toThrow()
  })

  test('test concat with already finished streams', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()

    // Complete streams before concat
    promise1$.next('finished1', true)
    promise2$.next('finished2', true)

    const stream$ = concat(observable1$, observable2$)
    const results: string[] = []

    stream$.then((value: string) => {
      results.push(value)
      console.log('result', value)
    })

    await sleep(1)

    // Already finished streams' previous data should not be emitted
    // concat should complete immediately since all streams are finished
    expect(results).toEqual([])
  })

  test('test concat with single stream', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()

    const stream$ = concat(observable1$)
    const results: string[] = []

    stream$.then((value: string) => {
      results.push(value)
      console.log('single', value)
    })

    promise1$.next('only-value', true)
    await sleep(1)

    expect(results).toEqual(['only-value'])
    expect(consoleSpy).toHaveBeenCalledWith('single', 'only-value')
  })

  test('test concat with empty input', async () => {
    const stream$ = concat()
    let completed = false

    stream$.afterComplete(() => {
      completed = true
      console.log('empty-completed')
    })

    await sleep(1)

    // Empty concat should not complete
    expect(completed).toBe(false)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('test concat with early stream unsubscribe', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { observable$: observable3$ } = streamFactory()

    const stream$ = concat(observable1$, observable2$, observable3$)
    const results: string[] = []
    let concatUnsubscribed = false

    stream$.afterUnsubscribe(() => {
      concatUnsubscribed = true
      console.log('concat-unsubscribe')
    })

    stream$.then((value: string) => {
      results.push(value)
      console.log('result', value)
    })

    // Emit from first stream
    promise1$.next('a')
    await sleep(1)
    expect(results).toEqual(['a'])

    // Unsubscribe first stream while it's active
    observable1$.unsubscribe()
    await sleep(1)

    // concat should NOT be unsubscribed, should continue to second stream
    expect(concatUnsubscribed).toBe(false)

    // Second stream should now be active and able to emit
    promise2$.next('b', true)
    await sleep(1)
    expect(results).toEqual(['a', 'b'])

    // concat still should not be unsubscribed
    expect(concatUnsubscribed).toBe(false)
  })

  test('test concat with mixed completed and active streams', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    // Complete first stream before concat
    promise1$.next('pre-completed', true)

    const stream$ = concat(observable1$, observable2$, observable3$)
    const results: string[] = []

    stream$.then((value: string) => {
      results.push(value)
      console.log('mixed', value)
    })

    await sleep(1)

    // Pre-completed data should not be emitted, concat cannot detect pre-completion
    expect(results).toEqual([])

    // Second stream should NOT be active because first stream completion wasn't detected
    promise2$.next('active2', true)
    await sleep(1)
    // Second stream data should NOT be emitted because concat is still waiting for first stream
    expect(results).toEqual(['active2'])

    // Third stream should also NOT emit
    promise3$.next('active3', true)
    await sleep(1)
    expect(results).toEqual(['active2', 'active3'])

    // Only when first stream emits new data after concat creation should it work
    promise1$.next('new-data-after-concat')
    await sleep(1)
    expect(results).toEqual(['active2', 'active3'])
  })

  test('test concat with complex sequence and errors', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    const stream$ = concat(observable1$, observable2$, observable3$)
    const results: string[] = []
    const errors: string[] = []

    stream$.then(
      (value: string) => {
        results.push(value)
        console.log('resolve', value)
      },
      (error: string) => {
        errors.push(error)
        console.log('reject', error)
      },
    )

    // Complex emission pattern: success, error, success
    promise1$.next('a')
    await sleep(1)
    promise1$.next(Promise.reject('error-a'))
    await sleep(1)
    promise1$.next('b', true)
    await sleep(1)

    expect(results).toEqual(['a', 'b'])
    expect(errors).toEqual(['error-a'])

    // Second stream: only success
    promise2$.next('c', true)
    await sleep(1)

    expect(results).toEqual(['a', 'b', 'c'])

    // Third stream: error then success
    promise3$.next(Promise.reject('error-c'))
    await sleep(1)
    promise3$.next('d', true)
    await sleep(1)

    expect(results).toEqual(['a', 'b', 'c', 'd'])
    expect(errors).toEqual(['error-a', 'error-c'])

    expect(consoleSpy).toHaveBeenCalledWith('reject', 'error-a')
    expect(consoleSpy).toHaveBeenCalledWith('reject', 'error-c')
  })

  test('test concat cleanup and memory management', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()

    const stream$ = concat(observable1$, observable2$)
    let unsubscribeCalled = false

    stream$.afterUnsubscribe(() => {
      unsubscribeCalled = true
      console.log('cleanup')
    })

    // Emit some values
    promise1$.next('test1', true)
    await sleep(1)
    promise2$.next('test2', true)
    await sleep(1)

    // Unsubscribe should trigger cleanup
    stream$.unsubscribe()
    await sleep(1)

    expect(unsubscribeCalled).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith('cleanup')
  })
})
