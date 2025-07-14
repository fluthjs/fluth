import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, streamFactory } from '../utils'
import { partition } from '../../index'

describe('partition operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test partition with basic predicate (odd/even)', async () => {
    const { stream$, observable$ } = streamFactory()
    /**
     * ---1✅--2✅--3❌--4❌--5✅--6✅--7❌|----
     * ---1✅-------3❌------5✅-------7❌|----
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

  test('test partition with resolved and rejected values', async () => {
    const { stream$, observable$ } = streamFactory()

    const [selectedStream$, unselectedStream$] = partition(observable$, (value, status) => {
      // Select resolved values with odd numbers, rejected values with even numbers
      if (status === 'resolved') {
        return value % 2 === 1
      } else {
        return value % 2 === 0
      }
    })

    selectedStream$.then(
      (value: string) => console.log('selected', 'resolve', value),
      (value: string) => console.log('selected', 'reject', value),
    )
    unselectedStream$.then(
      (value: string) => console.log('unselected', 'resolve', value),
      (value: string) => console.log('unselected', 'reject', value),
    )

    stream$.next('1') // resolved odd -> selected
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'selected', 'resolve', '1')

    stream$.next('2') // resolved even -> unselected
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unselected', 'resolve', '2')

    stream$.next(Promise.reject('3')) // rejected odd -> unselected
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'unselected', 'reject', '3')

    stream$.next(Promise.reject('4')) // rejected even -> selected
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'selected', 'reject', '4')
  })

  test('test partition with index parameter', async () => {
    const { stream$, observable$ } = streamFactory()

    const indices: number[] = []
    const [selectedStream$, unselectedStream$] = partition(
      observable$,

      (value, status, index) => {
        indices.push(index)
        return index % 2 === 1 // Select items at odd indices (1, 3, 5...)
      },
    )

    selectedStream$.then((value: string) => console.log('selected', value))
    unselectedStream$.then((value: string) => console.log('unselected', value))

    stream$.next('a')
    await sleep(1)
    stream$.next('b')
    await sleep(1)
    stream$.next('c')
    await sleep(1)
    stream$.next('d')
    await sleep(1)

    expect(indices).toEqual([1, 2, 3, 4])
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'selected', 'a') // index 1
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unselected', 'b') // index 2
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'selected', 'c') // index 3
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'unselected', 'd') // index 4
  })

  test('test partition with thisArg', async () => {
    const { stream$, observable$ } = streamFactory()

    const context = {
      threshold: 3,
      checkLength: function (value: string) {
        return value.length > this.threshold
      },
    }

    const [longStrings$, shortStrings$] = partition(
      observable$,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      function (value, status, index) {
        return this.checkLength(value)
      },
      context,
    )

    longStrings$.then((value: string) => console.log('long:', value))
    shortStrings$.then((value: string) => console.log('short:', value))

    stream$.next('hi')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'short:', 'hi')

    stream$.next('hello')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'long:', 'hello')

    stream$.next('bye')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'short:', 'bye')
  })

  test('test partition with unsubscribe', async () => {
    const { observable$ } = streamFactory()

    const [selectedStream$, unselectedStream$] = partition(
      observable$,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (value, status, index) => value % 2 === 1,
    )

    selectedStream$.afterUnsubscribe(() => console.log('selected unsubscribe'))
    unselectedStream$.afterUnsubscribe(() => console.log('unselected unsubscribe'))

    observable$.unsubscribe()
    await sleep(1)

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'selected unsubscribe')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unselected unsubscribe')
  })

  test('test partition with predicate error', async () => {
    const { stream$, observable$ } = streamFactory()

    // Predicate that throws error
    const [selected$, unselected$] = partition(
      observable$,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (value, status, index) => {
        if (value === 'error') {
          throw new Error('Predicate error')
        }
        return value % 2 === 1
      },
    )

    selected$.then((value: string) => console.log('selected:', value))
    unselected$.then((value: string) => console.log('unselected:', value))

    stream$.next(1)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'selected:', 1)

    stream$.next('error')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unselected:', 'error')
  })

  test('test partition input validation', async () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      partition({} as any, (value, status, index) => true)
    }).toThrow('partition operator only accepts Stream or Observable as input')

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      partition('invalid' as any, (value, status, index) => true)
    }).toThrow('partition operator only accepts Stream or Observable as input')
  })

  test('test partition with already finished stream', async () => {
    const { stream$, observable$ } = streamFactory()

    // Complete the stream first
    stream$.complete()
    await sleep(1)

    const [selectedStream$, unselectedStream$] = partition(
      observable$,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (value, status, index) => value % 2 === 1,
    )

    selectedStream$.afterComplete(() => console.log('selected already finished'))
    unselectedStream$.afterComplete(() => console.log('unselected already finished'))

    await sleep(1)

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'selected already finished')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unselected already finished')
  })

  test('test partition with complex predicate using all parameters', async () => {
    const { stream$, observable$ } = streamFactory()

    const [selectedStream$, unselectedStream$] = partition(observable$, (value, status, index) => {
      // Complex logic: select if value is string AND status is resolved AND index is odd
      return typeof value === 'string' && status === 'resolved' && index % 2 === 1
    })

    selectedStream$.then(
      (value: string) => console.log('selected:', value),
      (value: string) => console.log('selected reject:', value),
    )
    unselectedStream$.then(
      (value: string) => console.log('unselected:', value),
      (value: string) => console.log('unselected reject:', value),
    )

    stream$.next('test1') // string, resolved, index 1 -> selected
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'selected:', 'test1')

    stream$.next('test2') // string, resolved, index 2 -> unselected
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unselected:', 'test2')

    stream$.next(Promise.reject('test3')) // string, rejected, index 3 -> unselected
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'unselected reject:', 'test3')

    stream$.next(123) // number, resolved, index 4 -> unselected
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'unselected:', 123)
  })
})
