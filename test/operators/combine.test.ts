import { beforeEach, describe, expect, test, vi } from 'vitest'
import { $, combine } from '../../index'
import { streamFactory, sleep, consoleSpy } from '../utils'

describe('combine operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
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
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'reject', 'a,e,l')
    await sleep(30)

    promise1$.next(Promise.resolve('b'))
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'reject', 'b,e,l')
    await sleep(30)
    promise3$.next(Promise.reject('m'))
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'reject', 'b,e,m')
    await sleep(30)
    promise2$.next(Promise.resolve('f'))
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'reject', 'b,f,m')
    await sleep(30)

    promise1$.next(Promise.resolve('c'), true)
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(5, 'reject', 'c,f,m')
    await sleep(30)
    promise3$.next(Promise.resolve('n'), true)
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(6, 'resolve', 'c,f,n')
    await sleep(30)
    promise2$.next(Promise.reject('g'), true)
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(7, 'finish', 'c,g,n')
    expect(consoleSpy).toHaveBeenNthCalledWith(8, 'reject', 'c,g,n')
  })

  test('test combine with streams init value', () => {
    const { stream$: promise1$ } = streamFactory()
    const { stream$: promise2$ } = streamFactory()
    promise1$.next('a1')
    promise2$.next('b1')

    const stream$ = combine(promise1$, promise2$)

    expect(stream$.value).toEqual(['a1', 'b1'])
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
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe')
  })

  // Tests for input validation
  test('test combine with invalid input types', () => {
    const invalidInputs = [null, undefined, 'string', 123, {}, [], Promise.resolve('test')]

    invalidInputs.forEach((input) => {
      expect(() => {
        combine(input as any)
      }).toThrow('combine operator only accepts Stream or Observable as input')
    })
  })

  test('test combine with mixed invalid and valid inputs', () => {
    const stream$ = $()
    const observable$ = stream$.then((value) => value)

    // Mixed valid and invalid inputs should throw
    expect(() => {
      combine(stream$, 'invalid' as any, observable$)
    }).toThrow('combine operator only accepts Stream or Observable as input')

    expect(() => {
      combine(null as any, stream$, observable$)
    }).toThrow('combine operator only accepts Stream or Observable as input')
  })

  test('test combine with valid input types', () => {
    const stream$ = $()
    const observable$ = stream$.then((value) => value)

    // Should not throw for valid inputs
    expect(() => combine(stream$)).not.toThrow()
    expect(() => combine(observable$)).not.toThrow()
    expect(() => combine(stream$, observable$)).not.toThrow()
  })

  // Tests for already finished streams
  test('test combine with already finished streams', () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    // Complete some streams before using combine
    promise1$.next('finished1', true)
    promise2$.next('finished2', true)

    const stream$ = combine(observable1$, observable2$, observable3$)
    let result: string[] = []
    let completed = false

    stream$.then(
      (value: string[]) => {
        result = value
        console.log('result:', value.toString())
      },
      (error: string[]) => {
        result = error
        console.log('error:', error.toString())
      },
    )

    stream$.afterComplete(() => {
      completed = true
      console.log('combine-completed')
    })

    // Now complete the remaining stream
    promise3$.next('active3', true)

    // Should get all values including the pre-finished ones
    expect(result).toEqual(['finished1', 'finished2', 'active3'])
    expect(completed).toBe(true)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'combine-completed')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'result:', 'finished1,finished2,active3')
  })

  test('test combine with all streams already finished', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    // Complete all streams before using combine
    promise1$.next('finished1', true)
    promise2$.next('finished2', true)
    promise3$.next('finished3', true)

    const stream$ = combine(observable1$, observable2$, observable3$)
    let result: string[] = []
    let completed = false

    stream$.then(
      (value: string[]) => {
        result = value
        console.log('all-finished result:', value.toString())
      },
      (error: string[]) => {
        result = error
        console.log('all-finished error:', error.toString())
      },
    )

    stream$.afterComplete(() => {
      completed = true
      console.log('all-finished-completed')
    })
    await vi.runAllTimersAsync()
    // when all streams are already finished, the output stream should be finished
    expect(result).toEqual([])
    expect(completed).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith('all-finished-completed')
  })

  test('test combine with finished streams having rejected status', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()

    // Complete one stream normally, reject the other
    promise1$.next('success1', true)
    promise2$.next(Promise.reject('error2'), true)

    const stream$ = combine(observable1$, observable2$)
    let result: string[] = []
    let errorResult: string[] = []

    stream$.then(
      (value: string[]) => {
        result = value
        console.log('rejected result:', value.toString())
      },
      (error: string[]) => {
        errorResult = error
        console.log('rejected error:', error.toString())
      },
    )

    await vi.runAllTimersAsync()

    // Should propagate the rejected status - only errorResult should have values
    expect(result).toEqual([])
    expect(errorResult).toEqual(['success1', 'error2'])
    expect(consoleSpy).toHaveBeenCalledWith('rejected error:', 'success1,error2')
  })

  // This test is commented out because combine may not handle finished/active stream combinations as expected
  test('test combine with combination of finished and active streams', () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    // Complete some streams before combine
    promise1$.next('pre-finished1', true)
    promise2$.next('pre-finished2', true)

    const stream$ = combine(observable1$, observable2$, observable3$)
    let result: string[] = []
    let completed = false

    stream$.then(
      (value: string[]) => {
        result = value
        console.log('mixed result:', value.toString())
      },
      (error: string[]) => {
        result = error
        console.log('mixed error:', error.toString())
      },
    )

    stream$.afterComplete(() => {
      completed = true
      console.log('mixed-completed')
    })

    // Should not emit yet since one stream is still active
    expect(result).toEqual([])
    expect(completed).toBe(false)

    // Now complete the remaining stream
    promise3$.next('active3', true)

    // Should emit after all streams are complete
    expect(result).toEqual(['pre-finished1', 'pre-finished2', 'active3'])
    expect(completed).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith('mixed-completed')
    expect(consoleSpy).toHaveBeenCalledWith('mixed result:', 'pre-finished1,pre-finished2,active3')
  })

  // Tests for single stream and empty input
  test('test combine with single stream', () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()

    const stream$ = combine(observable1$)
    let result: string[] = []

    stream$.then((value: string[]) => {
      result = value
      console.log('single:', value.toString())
    })

    promise1$.next('single-value', true)

    expect(result).toEqual(['single-value'])
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'single:', 'single-value')
  })

  test('test combine with empty input', () => {
    // Should handle empty input gracefully
    const stream$ = combine()
    let result: string[] = []
    let completed = false

    stream$.then((value: string[]) => {
      result = value
      console.log('empty:', value.toString())
    })

    stream$.afterComplete(() => {
      completed = true
      console.log('empty-completed')
    })

    // Should not complete immediately with empty input
    expect(result).toEqual([])
    expect(completed).toBe(false)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('test combine with streams that emit multiple values', () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()

    const stream$ = combine(observable1$, observable2$)
    const results: string[][] = []

    stream$.then((value: string[]) => {
      results.push([...value])
      console.log('emit:', value.toString())
    })

    // First values
    promise1$.next('a1')
    promise2$.next('b1')

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual(['a1', 'b1'])

    // Update first stream
    promise1$.next('a2')

    expect(results).toHaveLength(2)
    expect(results[1]).toEqual(['a2', 'b1'])

    // Update second stream
    promise2$.next('b2')

    expect(results).toHaveLength(3)
    expect(results[2]).toEqual(['a2', 'b2'])

    // Complete both streams
    promise1$.next('a3', true)

    expect(results).toHaveLength(4)
    expect(results[3]).toEqual(['a3', 'b2'])

    promise2$.next('b3', true)

    expect(results).toHaveLength(5)
    expect(results[4]).toEqual(['a3', 'b3'])
  })
})
