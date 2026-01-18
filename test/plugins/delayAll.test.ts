import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, delayAll, consoleNode } from '../../index'

describe('delayAll plugin test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test delayAll delays all nodes', async () => {
    // Chain: root(1) -> then(+1=2) -> then(+1=3) -> consoleNode
    // Each node is delayed serially: node resolves -> delay -> next node
    const promise$ = $().use(delayAll(100))

    promise$
      .then((value) => value + 1)
      .then((value) => value + 1)
      .use(consoleNode())

    promise$.next(1)

    // 0ms: nothing resolved yet
    expect(consoleSpy).toHaveBeenCalledTimes(0)

    // 100ms: root node resolves with value 1, passes to first then
    await sleep(100)
    expect(consoleSpy).toHaveBeenCalledTimes(0)

    // 200ms: first then resolves with value 2, passes to second then
    await sleep(100)
    expect(consoleSpy).toHaveBeenCalledTimes(0)

    // 300ms: second then resolves with value 3, consoleNode logs
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 3)
  })

  test('test delayAll with consoleNode on each node', async () => {
    // Chain: root(1) -> then(+1=2) -> then(+1=3)
    // Each node has consoleNode, so we can observe the serial delay
    const promise$ = $().use(delayAll(100), consoleNode())

    promise$
      .then((value) => value + 1)
      .use(consoleNode())
      .then((value) => value + 1)
      .use(consoleNode())

    promise$.next(1)

    // 0ms: nothing resolved yet
    expect(consoleSpy).toHaveBeenCalledTimes(0)

    // 100ms: root resolves, logs 1
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'resolve', 1)

    // 200ms: first then resolves, logs 2
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolve', 2)

    // 300ms: second then resolves, logs 3
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'resolve', 3)
  })

  test('test delayAll with sync value', async () => {
    const stream$ = $()
    stream$.use(delayAll(100))
    stream$.then((value) => {
      console.log(value)
    })

    stream$.next(1)
    await sleep(99)
    expect(consoleSpy).not.toHaveBeenCalled()
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenCalledWith(1)
  })

  test('test delayAll with promise value', async () => {
    const stream$ = $()
    stream$.use(delayAll(100))
    stream$.then((value) => {
      console.log(value)
    })

    stream$.next(Promise.resolve(42))
    await sleep(99)
    expect(consoleSpy).not.toHaveBeenCalled()
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenCalledWith(42)
  })

  test('test delayAll vs delay - delayAll affects all nodes serially', async () => {
    // Chain: root(1) -> then(+1=2) -> then(+1=3) -> then(set result)
    // delayAll delays EVERY node serially: 50ms * 3 nodes = 150ms total
    const promise$ = $().use(delayAll(50))

    let result: number | undefined

    promise$
      .then((value) => value + 1)
      .then((value) => value + 1)
      .then((value) => {
        result = value
      })

    promise$.next(1)

    // 0ms: nothing resolved yet
    expect(result).toBeUndefined()

    // 50ms: root resolves with 1, passes to first then
    await sleep(50)
    expect(result).toBeUndefined()

    // 100ms: first then resolves with 2, passes to second then
    await sleep(50)
    expect(result).toBeUndefined()

    // 150ms: second then resolves with 3, passes to third then which sets result
    await sleep(50)
    expect(result).toBe(3)
  })

  test('test delayAll with multiple next calls', async () => {
    const stream$ = $().use(delayAll(100))
    const results: number[] = []

    stream$.then((value) => {
      results.push(value)
    })

    stream$.next(1)
    stream$.next(2)
    stream$.next(3)

    await sleep(100)
    // Only the last value should be processed due to observable behavior
    expect(results).toEqual([3])
  })
})
