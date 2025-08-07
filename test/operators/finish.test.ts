import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, streamFactory } from '../utils'
import { finish, $ } from '../../index'

describe('finish operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
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
    await vi.runAllTimersAsync()
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
    await vi.runAllTimersAsync()
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
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe')
  })

  // Tests for input validation
  test('test finish with invalid input types', () => {
    const invalidInputs = [null, undefined, 'string', 123, {}, [], Promise.resolve('test')]

    invalidInputs.forEach((input) => {
      expect(() => {
        finish(input as any)
      }).toThrow('finish operator only accepts Stream or Observable as input')
    })
  })

  test('test finish with mixed invalid and valid inputs', () => {
    const stream$ = $()
    const observable$ = stream$.then((value) => value)

    // Mixed valid and invalid inputs should throw
    expect(() => {
      finish(stream$, 'invalid' as any, observable$)
    }).toThrow('finish operator only accepts Stream or Observable as input')

    expect(() => {
      finish(null as any, stream$, observable$)
    }).toThrow('finish operator only accepts Stream or Observable as input')
  })

  test('test finish with valid input types', () => {
    const stream$ = $()
    const observable$ = stream$.then((value) => value)

    // Should not throw for valid inputs
    expect(() => finish(stream$)).not.toThrow()
    expect(() => finish(observable$)).not.toThrow()
    expect(() => finish(stream$, observable$)).not.toThrow()
  })

  // Tests for finished stream handling
  test('test finish with already finished streams', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    // Complete some streams before using finish
    promise1$.next('value1', true)
    promise2$.next('value2', true)

    const stream$ = finish(observable1$, observable2$, observable3$)
    let result: string[] = []

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

    // Now complete the remaining stream
    promise3$.next('value3', true)

    // Should get all values including the pre-finished ones
    expect(result).toEqual(['value1', 'value2', 'value3'])
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'result:', 'value1,value2,value3')
  })

  test('test finish with finished streams having different statuses', () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    // Complete streams with different statuses
    promise1$.next('resolved1', true)
    promise2$.next(Promise.reject('rejected1'))
    promise2$.next('resolved2', true)

    const stream$ = finish(observable1$, observable2$, observable3$)
    let result: string[] = []
    let isRejected = false

    stream$.then(
      (value: string[]) => {
        result = value
        console.log('result:', value.toString())
      },
      (error: string[]) => {
        result = error
        isRejected = true
        console.log('error:', error.toString())
      },
    )

    // Complete the remaining stream
    promise3$.next('resolved3', true)
    // Should get all final values
    expect(result).toEqual(['resolved1', 'resolved2', 'resolved3'])
    expect(isRejected).toBe(false)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'result:', 'resolved1,resolved2,resolved3')
  })

  test('test finish with all streams already finished', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    // Complete all streams before using finish
    promise1$.next('finished1', true)
    promise2$.next('finished2', true)
    promise3$.next('finished3', true)

    const stream$ = finish(observable1$, observable2$, observable3$)
    let result: string[] = []
    let completed = false

    stream$.then((value: string[]) => {
      result = value
      console.log('all-finished:', value.toString())
    })

    stream$.afterComplete(() => {
      completed = true
      console.log('finish-completed')
    })

    await vi.runAllTimersAsync()

    // Should immediately emit with all finished values
    expect(result).toEqual(['finished1', 'finished2', 'finished3'])
    expect(completed).toBe(true)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'finish-completed')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'all-finished:', 'finished1,finished2,finished3')
  })

  // Tests for reject status tracking
  test('test finish with streams finishing with rejected status', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    const stream$ = finish(observable1$, observable2$, observable3$)
    let result: string[] = []
    let isRejected = false

    stream$.then(
      (value: string[]) => {
        result = value
        console.log('resolved:', value.toString())
      },
      (error: string[]) => {
        result = error
        isRejected = true
        console.log('rejected:', error.toString())
      },
    )

    // Complete streams with normal values
    promise1$.next('normal1', true)
    promise2$.next('normal2', true)
    // Complete the last stream with rejected final value
    promise3$.next(Promise.reject('final-error'), true)

    await vi.runAllTimersAsync()

    // Should be rejected because one stream finished with rejected status
    expect(isRejected).toBe(true)
    expect(result).toEqual(['normal1', 'normal2', 'final-error'])
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'rejected:', 'normal1,normal2,final-error')
  })

  test('test finish with mixed completion statuses', async () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    const stream$ = finish(observable1$, observable2$, observable3$)
    let result: string[] = []
    let isRejected = false

    stream$.then(
      (value: string[]) => {
        result = value
        console.log('resolved:', value.toString())
      },
      (error: string[]) => {
        result = error
        isRejected = true
        console.log('rejected:', error.toString())
      },
    )

    // First stream completes with rejected status
    promise1$.next('value1')
    promise1$.next(Promise.reject('error1'), true)

    // Second stream completes normally
    promise2$.next('value2', true)

    // Third stream completes normally
    promise3$.next('value3', true)

    await vi.runAllTimersAsync()

    // Should be rejected because one stream finished with rejected status
    expect(isRejected).toBe(true)
    expect(result).toEqual(['error1', 'value2', 'value3'])
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'rejected:', 'error1,value2,value3')
  })

  // Tests for edge cases
  test('test finish with single stream', () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()

    const stream$ = finish(observable1$)
    let result = ''

    stream$.then((value: string[]) => {
      result = value[0]
      console.log('single:', value.toString())
    })

    promise1$.next('single-value', true)

    expect(result).toBe('single-value')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'single:', 'single-value')
  })

  test('test finish with empty input', () => {
    // Should handle empty input gracefully
    const stream$ = finish()
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

    // Should immediately complete with empty array
    expect(result).toEqual([])
    expect(completed).toBe(false)
  })

  test('test finish with combination of finished and active streams', () => {
    const { stream$: promise1$, observable$: observable1$ } = streamFactory()
    const { stream$: promise2$, observable$: observable2$ } = streamFactory()
    const { stream$: promise3$, observable$: observable3$ } = streamFactory()

    // Pre-finish some streams
    promise1$.next('pre-finished', true)
    promise2$.next('active-stream')

    const stream$ = finish(observable1$, observable2$, observable3$)
    let result: string[] = []

    stream$.then((value: string[]) => {
      result = value
      console.log('mixed:', value.toString())
    })

    // Complete the remaining active streams
    promise2$.next('final-active', true)
    promise3$.next('last-stream', true)

    expect(result).toEqual(['pre-finished', 'final-active', 'last-stream'])
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'mixed:', 'pre-finished,final-active,last-stream')
  })
})
