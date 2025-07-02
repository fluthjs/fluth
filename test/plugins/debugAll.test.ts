import { expect, describe, test, vi, beforeEach } from 'vitest'
import { $, debugAll } from '../../index'

describe('debugAll plugins test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('test debugAll plugin returns original result', async () => {
    const plugin = debugAll()

    // Test synchronous value with root=true (should trigger debugger)
    const syncResult = plugin.executeAll({ result: 'sync-value', root: true })
    expect(syncResult).toBe('sync-value')

    // Test Promise value with root=true (should trigger debugger)
    const promiseValue = Promise.resolve('async-value')
    const asyncResult = plugin.executeAll({ result: promiseValue, root: true })
    expect(asyncResult).toBe(promiseValue)

    // Verify the promise resolves correctly
    const resolvedValue = await promiseValue
    expect(resolvedValue).toBe('async-value')

    // Test with root=false and no onfulfilled/onrejected (should skip debugger)
    const skipResult = plugin.executeAll({ result: 'skip-value', root: false })
    expect(skipResult).toBe('skip-value')
  })

  test('test debugAll with Promise rejection', async () => {
    const plugin = debugAll()
    const rejectedPromise = Promise.reject(new Error('test error'))

    const result = plugin.executeAll({ result: rejectedPromise, root: true })
    expect(result).toBe(rejectedPromise)

    try {
      await rejectedPromise
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe('test error')
    }
  })

  test('test debugAll with edge cases', async () => {
    const plugin = debugAll()

    // Test with null
    const nullResult = plugin.executeAll({ result: null, root: true })
    expect(nullResult).toBe(null)

    // Test with undefined
    const undefinedResult = plugin.executeAll({ result: undefined, root: true })
    expect(undefinedResult).toBe(undefined)

    // Test with empty string
    const emptyStringResult = plugin.executeAll({ result: '', root: true })
    expect(emptyStringResult).toBe('')

    // Test with zero
    const zeroResult = plugin.executeAll({ result: 0, root: true })
    expect(zeroResult).toBe(0)

    // Test with false
    const falseResult = plugin.executeAll({ result: false, root: true })
    expect(falseResult).toBe(false)
  })

  test('test debugAll integration with stream', async () => {
    const stream$ = $()
    const plugin = debugAll()
    stream$.use(plugin)

    // Test that the plugin doesn't interfere with stream operations
    let receivedValue: any
    stream$.then((value) => {
      receivedValue = value
    })

    stream$.next('test-value')
    expect(receivedValue).toBe('test-value')

    // Test with Promise
    const promiseValue = Promise.resolve('async-test')
    stream$.next(promiseValue)
    const resolvedValue = await promiseValue
    expect(resolvedValue).toBe('async-test')
  })

  test('test debugAll plugin removal', async () => {
    const plugin = debugAll()
    const stream$ = $().use(plugin)

    let callCount = 0
    stream$.then((value) => {
      callCount++
      return value
    })

    stream$.next(1)
    expect(callCount).toBe(1)

    stream$.remove(plugin)
    stream$.next(2)
    expect(callCount).toBe(2)
  })

  test('test debugAll executeAll vs execute difference', async () => {
    // Test executeAll: should execute on all nodes in the stream chain
    const stream$ = $()
    stream$.use(debugAll())

    const child1 = stream$.then((value) => value + '-child1')
    child1.then((value) => value + '-child2')

    // When using executeAll, the plugin should execute on all nodes
    let finalResult: any
    child1.then((value) => {
      finalResult = value
    })

    stream$.next('test')
    expect(finalResult).toBe('test-child1')
  })

  test('test debugAll executeAll propagation in stream chain', async () => {
    // Create a stream chain to test executeAll propagation
    const rootStream = $()
    rootStream.use(debugAll())

    const step1 = rootStream.then((value) => {
      return value * 2
    })

    const step2 = step1.then((value) => {
      return value + 10
    })

    let finalResult: any
    step2.then((value) => {
      finalResult = value.toString()
      return finalResult
    })

    // Trigger the stream
    rootStream.next(5)

    expect(finalResult).toBe('20')
  })

  test('test debugAll with onfulfilled and onrejected parameters', async () => {
    const plugin = debugAll()

    const mockOnFulfilled = vi.fn((value) => value + '-fulfilled')
    const mockOnRejected = vi.fn((error) => 'handled-' + error.message)

    // Test with onfulfilled
    const result1 = plugin.executeAll({
      result: 'test-value',
      root: false,
      onfulfilled: mockOnFulfilled,
    })
    expect(result1).toBe('test-value')

    // Test with onrejected
    const result2 = plugin.executeAll({
      result: 'test-value',
      root: false,
      onrejected: mockOnRejected,
    })
    expect(result2).toBe('test-value')
  })

  test('test debugAll skip pass through node', async () => {
    const plugin = debugAll()

    // Should skip when root=false and no onfulfilled/onrejected
    const result = plugin.executeAll({
      result: 'pass-through-value',
      root: false,
    })

    expect(result).toBe('pass-through-value')
  })

  test('test debugAll with complex objects', async () => {
    const plugin = debugAll()

    const complexObject = {
      name: 'test',
      nested: {
        value: 42,
        array: [1, 2, 3],
      },
    }

    const result = plugin.executeAll({ result: complexObject, root: true })
    expect(result).toBe(complexObject)
    expect(result).toEqual({
      name: 'test',
      nested: {
        value: 42,
        array: [1, 2, 3],
      },
    })
  })
})
