import { expect, describe, test, vi, beforeEach } from 'vitest'
import { $, debugAll, PromiseStatus } from '../../index'

describe('debugAll plugins test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('test debugAll plugin returns original result', async () => {
    const plugin = debugAll()

    // Test synchronous value with root=true (should trigger debugger)
    const syncResult = plugin.executeAll({ result: 'sync-value', status: null, root: true })
    expect(syncResult).toBe('sync-value')

    // Test Promise value with root=true (should trigger debugger)
    const promiseValue = Promise.resolve('async-value')
    const asyncResult = plugin.executeAll({ result: promiseValue, status: null, root: true })
    expect(asyncResult).toBe(promiseValue)

    // Verify the promise resolves correctly
    const resolvedValue = await promiseValue
    expect(resolvedValue).toBe('async-value')

    // Test with root=false and no onfulfilled/onrejected (should skip debugger)
    const skipResult = plugin.executeAll({ result: 'skip-value', status: null, root: false })
    expect(skipResult).toBe('skip-value')
  })

  test('test debugAll with Promise rejection', async () => {
    const plugin = debugAll()
    const rejectedPromise = Promise.reject(new Error('test error'))

    const result = plugin.executeAll({ result: rejectedPromise, status: null, root: true })
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
    const nullResult = plugin.executeAll({ result: null, status: null, root: true })
    expect(nullResult).toBe(null)

    // Test with undefined
    const undefinedResult = plugin.executeAll({ result: undefined, status: null, root: true })
    expect(undefinedResult).toBe(undefined)

    // Test with empty string
    const emptyStringResult = plugin.executeAll({ result: '', status: null, root: true })
    expect(emptyStringResult).toBe('')

    // Test with zero
    const zeroResult = plugin.executeAll({ result: 0, status: null, root: true })
    expect(zeroResult).toBe(0)

    // Test with false
    const falseResult = plugin.executeAll({ result: false, status: null, root: true })
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
      status: null,
      root: false,
      onfulfilled: mockOnFulfilled,
    })
    expect(result1).toBe('test-value')

    // Test with onrejected
    const result2 = plugin.executeAll({
      result: 'test-value',
      status: null,
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
      status: null,
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

    const result = plugin.executeAll({ result: complexObject, status: null, root: true })
    expect(result).toBe(complexObject)
    expect(result).toEqual({
      name: 'test',
      nested: {
        value: 42,
        array: [1, 2, 3],
      },
    })
  })

  test('test debugAll with condition function for resolve', async () => {
    // Test condition function that returns true (should trigger debugger)
    const conditionTrue = vi.fn(() => true)
    const plugin1 = debugAll(conditionTrue)

    const result1 = plugin1.executeAll({ result: 'test-value', status: null, root: true })
    expect(result1).toBe('test-value')
    expect(conditionTrue).toHaveBeenCalledWith('test-value')

    // Test condition function that returns false (should skip debugger)
    const conditionFalse = vi.fn(() => false)
    const plugin2 = debugAll(conditionFalse)

    const result2 = plugin2.executeAll({ result: 'test-value', status: null, root: true })
    expect(result2).toBe('test-value')
    expect(conditionFalse).toHaveBeenCalledWith('test-value')
  })

  test('test debugAll with conditionError function for reject', async () => {
    // Test conditionError function that returns true (should trigger debugger)
    const conditionErrorTrue = vi.fn(() => true)
    const plugin1 = debugAll(undefined, conditionErrorTrue)

    const rejectedPromise = Promise.reject(new Error('test error'))
    const result1 = plugin1.executeAll({ result: rejectedPromise, status: null, root: true })
    expect(result1).toBe(rejectedPromise)

    try {
      await rejectedPromise
    } catch (error) {
      expect(conditionErrorTrue).toHaveBeenCalledWith(error)
    }

    // Test conditionError function that returns false (should skip debugger)
    const conditionErrorFalse = vi.fn(() => false)
    const plugin2 = debugAll(undefined, conditionErrorFalse)

    const rejectedPromise2 = Promise.reject(new Error('test error 2'))
    const result2 = plugin2.executeAll({ result: rejectedPromise2, status: null, root: true })
    expect(result2).toBe(rejectedPromise2)

    try {
      await rejectedPromise2
    } catch (error) {
      expect(conditionErrorFalse).toHaveBeenCalledWith(error)
    }
  })

  test('test debugAll with both condition and conditionError', async () => {
    const condition = vi.fn(() => true)
    const conditionError = vi.fn(() => false)
    const plugin = debugAll(condition, conditionError)

    // Test resolve path
    const result1 = plugin.executeAll({ result: 'success-value', status: null, root: true })
    expect(result1).toBe('success-value')
    expect(condition).toHaveBeenCalledWith('success-value')

    // Test reject path
    const rejectedPromise = Promise.reject(new Error('test error'))
    const result2 = plugin.executeAll({ result: rejectedPromise, status: null, root: true })
    expect(result2).toBe(rejectedPromise)

    try {
      await rejectedPromise
    } catch (error) {
      expect(conditionError).toHaveBeenCalledWith(error)
    }
  })

  test('test debugAll plugin with status parameter and shouldDebug logic', async () => {
    const plugin = debugAll()

    // Test 1: Root node always debugs regardless of status
    const rootResult = plugin.executeAll({
      result: 'root-value',
      status: PromiseStatus.REJECTED,
      root: true,
      onfulfilled: undefined,
      onrejected: undefined,
    })
    expect(rootResult).toBe('root-value')

    // Test 2: Non-root with onfulfilled always debugs
    const withFulfilledResult = plugin.executeAll({
      result: 'fulfilled-value',
      status: PromiseStatus.RESOLVED,
      root: false,
      onfulfilled: vi.fn(),
      onrejected: undefined,
    })
    expect(withFulfilledResult).toBe('fulfilled-value')

    // Test 3: Non-root with onrejected and REJECTED status should debug
    const rejectedWithHandlerResult = plugin.executeAll({
      result: 'rejected-handled-value',
      status: PromiseStatus.REJECTED,
      root: false,
      onfulfilled: undefined,
      onrejected: vi.fn(),
    })
    expect(rejectedWithHandlerResult).toBe('rejected-handled-value')

    // Test 4: Non-root with onrejected but NOT REJECTED status should skip
    const rejectedHandlerResolvedResult = plugin.executeAll({
      result: 'should-skip-value',
      status: PromiseStatus.RESOLVED,
      root: false,
      onfulfilled: undefined,
      onrejected: vi.fn(),
    })
    expect(rejectedHandlerResolvedResult).toBe('should-skip-value')

    // Test 5: Non-root with no handlers should skip
    const noHandlersResult = plugin.executeAll({
      result: 'should-skip-value-2',
      status: PromiseStatus.RESOLVED,
      root: false,
      onfulfilled: undefined,
      onrejected: undefined,
    })
    expect(noHandlersResult).toBe('should-skip-value-2')
  })

  test('test debugAll with Promise rejection and conditionError interaction', async () => {
    // Test with condition that filters specific error types
    const conditionError = vi.fn((error) => error.message.includes('debug'))
    const plugin = debugAll(undefined, conditionError)

    // Test error that should trigger debugger
    const debugError = Promise.reject(new Error('debug this error'))
    const result1 = plugin.executeAll({ result: debugError, status: null, root: true })
    expect(result1).toBe(debugError)

    try {
      await debugError
    } catch (error) {
      expect(conditionError).toHaveBeenCalledWith(error)
    }

    // Test error that should NOT trigger debugger
    const skipError = Promise.reject(new Error('skip this error'))
    const result2 = plugin.executeAll({ result: skipError, status: null, root: true })
    expect(result2).toBe(skipError)

    try {
      await skipError
    } catch (error) {
      expect(conditionError).toHaveBeenCalledWith(error)
    }

    expect(conditionError).toHaveBeenCalledTimes(2)
  })

  test('test debugAll integration with stream and condition functions', async () => {
    const condition = vi.fn((value) => typeof value === 'string')
    const stream$ = $()
    stream$.use(debugAll(condition))

    let receivedValue: any
    stream$.then((value) => {
      receivedValue = value
    })

    // Should trigger debugger for string
    stream$.next('string-value')
    expect(receivedValue).toBe('string-value')
    expect(condition).toHaveBeenCalledWith('string-value')

    // Reset mock to check next call
    condition.mockClear()

    // Should not trigger debugger for number (but still process)
    stream$.next(42)
    expect(receivedValue).toBe(42)
    expect(condition).toHaveBeenCalledWith(42)

    // In executeAll mode, condition is called on both root and child nodes
    // So we check that it was called at least once for the second value
    expect(condition).toHaveBeenCalledTimes(2)
  })
})
