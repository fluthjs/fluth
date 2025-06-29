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

  test('test partition', async () => {
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

  test('test partition with custom predicate', async () => {
    const { stream$, observable$ } = streamFactory()

    // Partition based on string length
    const [longStrings$, shortStrings$] = partition(observable$, (str) => str.length > 3)

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

  test('test partition with predicate error', async () => {
    const { stream$, observable$ } = streamFactory()

    // Predicate that throws error
    const [selected$, unselected$] = partition(observable$, (value) => {
      if (value === 'error') {
        throw new Error('Predicate error')
      }
      return value % 2 === 1
    })

    selected$.then((value: string) => console.log('selected:', value))
    unselected$.then((value: string) => console.log('unselected:', value))

    stream$.next(1)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'selected:', 1)

    stream$.next('error')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unselected:', 'error')
  })
})
