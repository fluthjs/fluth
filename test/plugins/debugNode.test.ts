import { expect, describe, test, vi, beforeEach } from 'vitest'
import { $, debugNode } from '../../index'
import { sleep } from '../utils'

describe('debugNode plugins test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('test debugNode plugin returns original result', async () => {
    const plugin = debugNode()

    // Test synchronous value
    const syncResult = plugin.execute({ result: 'sync-value' })
    expect(syncResult).toBe('sync-value')

    // Test Promise value
    const promiseValue = Promise.resolve('async-value')
    const asyncResult = plugin.execute({ result: promiseValue })
    expect(asyncResult).toBe(promiseValue)

    // Verify the promise resolves correctly
    const resolvedValue = await promiseValue
    expect(resolvedValue).toBe('async-value')
  })

  test('test debugNode with condition function', async () => {
    // Test condition function that returns true (should not trigger debugger)
    const conditionTrue = vi.fn(() => true)
    const plugin1 = debugNode(conditionTrue)

    const result1 = plugin1.execute({ result: 'test-value' })
    expect(result1).toBe('test-value')
    expect(conditionTrue).toHaveBeenCalledWith('test-value')

    // Test condition function that returns false (would trigger debugger)
    const conditionFalse = vi.fn(() => false)
    const plugin2 = debugNode(conditionFalse)

    const result2 = plugin2.execute({ result: 'test-value' })
    expect(result2).toBe('test-value')
    expect(conditionFalse).toHaveBeenCalledWith('test-value')
  })

  test('test debugNode with condition function for Promise', async () => {
    const condition = vi.fn(() => true)
    const plugin = debugNode(condition)

    const promiseValue = Promise.resolve('async-value')
    const result = plugin.execute({ result: promiseValue })
    expect(result).toBe(promiseValue)

    // Wait for promise to resolve and condition to be called
    await promiseValue
    expect(condition).toHaveBeenCalledWith('async-value')
  })

  test('test debugNode with conditionError function', async () => {
    // Test conditionError function that returns true (should not trigger debugger)
    const conditionErrorTrue = vi.fn(() => true)
    const plugin1 = debugNode(undefined, conditionErrorTrue)

    const rejectedPromise = Promise.reject(new Error('test error'))
    const result = plugin1.execute({ result: rejectedPromise })
    expect(result).toBe(rejectedPromise)

    await sleep(10)
    expect(conditionErrorTrue).toHaveBeenCalledWith(new Error('test error'))
  })

  test('test debugNode with conditionError function returning false', async () => {
    const conditionErrorFalse = vi.fn(() => false)
    const plugin = debugNode(undefined, conditionErrorFalse)

    const rejectedPromise = Promise.reject(new Error('test error'))
    const result = plugin.execute({ result: rejectedPromise })
    expect(result).toBe(rejectedPromise)

    await sleep(10)
    expect(conditionErrorFalse).toHaveBeenCalledWith(new Error('test error'))
  })

  test('test debugNode with both condition and conditionError', async () => {
    const condition = vi.fn(() => true)
    const conditionError = vi.fn(() => false)
    const plugin = debugNode(condition, conditionError)

    // Test successful case
    const successPromise = Promise.resolve('success')
    const result1 = plugin.execute({ result: successPromise })
    expect(result1).toBe(successPromise)

    await successPromise
    expect(condition).toHaveBeenCalledWith('success')

    // Test error case
    const errorPromise = Promise.reject(new Error('error'))
    const result2 = plugin.execute({ result: errorPromise })
    expect(result2).toBe(errorPromise)

    await sleep(10)
    expect(conditionError).toHaveBeenCalledWith(new Error('error'))
  })

  test('test debugNode with Promise rejection', async () => {
    const plugin = debugNode()
    const rejectedPromise = Promise.reject(new Error('test error'))

    const result = plugin.execute({ result: rejectedPromise })
    expect(result).toBe(rejectedPromise)

    try {
      await rejectedPromise
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe('test error')
    }
  })

  test('test debugNode with edge cases', async () => {
    const plugin = debugNode()

    // Test with null
    const nullResult = plugin.execute({ result: null })
    expect(nullResult).toBe(null)

    // Test with undefined
    const undefinedResult = plugin.execute({ result: undefined })
    expect(undefinedResult).toBe(undefined)

    // Test with empty string
    const emptyStringResult = plugin.execute({ result: '' })
    expect(emptyStringResult).toBe('')

    // Test with zero
    const zeroResult = plugin.execute({ result: 0 })
    expect(zeroResult).toBe(0)

    // Test with false
    const falseResult = plugin.execute({ result: false })
    expect(falseResult).toBe(false)
  })

  test('test debugNode integration with stream', async () => {
    const stream$ = $()
    const plugin = debugNode()
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

  test('test debugNode plugin removal', async () => {
    const plugin = debugNode()
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

  test('test debugNode with multiple values', async () => {
    const plugin = debugNode()
    const results: any[] = []

    // Test multiple synchronous values
    const values = [1, 'test', true, null, undefined]
    values.forEach((value) => {
      const result = plugin.execute({ result: value })
      results.push(result)
    })

    expect(results).toEqual(values)
  })

  test('test debugNode with complex objects', async () => {
    const plugin = debugNode()

    const complexObject = {
      name: 'test',
      nested: {
        value: 42,
        array: [1, 2, 3],
      },
    }

    const result = plugin.execute({ result: complexObject })
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
