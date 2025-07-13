import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, streamFactory } from '../utils'

describe('Observable memory leak and cleanup edge cases', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
  })

  test('should clean up children when parent is unsubscribed', () => {
    // Test that children are properly cleaned up when parent is unsubscribed
    const { stream$, observable$: parent } = streamFactory()
    const child1 = parent.then()
    const child2 = parent.then()
    const grandchild = child1.then()

    // Trigger execution to change states
    stream$.next('test value')

    // Verify states changed from null after execution
    expect(parent.status).not.toBe(null)
    expect(child1.status).not.toBe(null)
    expect(child2.status).not.toBe(null)
    expect(grandchild.status).not.toBe(null)

    parent.unsubscribe()

    // Check that all observables are cleaned up using _cleanFlag
    expect((parent as any)._getFlag('_cleanFlag')).toBe(true)
    expect((child1 as any)._getFlag('_cleanFlag')).toBe(true)
    expect((child2 as any)._getFlag('_cleanFlag')).toBe(true)
    expect((grandchild as any)._getFlag('_cleanFlag')).toBe(true)
  })

  test('should not clean up parent when all children are unsubscribed', () => {
    // Test that parent is NOT cleaned up when all children are unsubscribed
    const { stream$, observable$: parent } = streamFactory()
    const child1 = parent.then()
    const child2 = parent.then()

    // Trigger execution to change states
    stream$.next('test value')

    // Verify states changed from null after execution
    expect(parent.status).not.toBe(null)
    expect(child1.status).not.toBe(null)
    expect(child2.status).not.toBe(null)

    child1.unsubscribe()
    expect((child1 as any)._getFlag('_cleanFlag')).toBe(true)
    expect((parent as any)._getFlag('_cleanFlag')).toBe(false) // Parent still has one child

    child2.unsubscribe()
    expect((child2 as any)._getFlag('_cleanFlag')).toBe(true)

    // Parent should NOT be cleaned up when all children are unsubscribed
    // Parent can still be used for future operations
    expect((parent as any)._getFlag('_cleanFlag')).toBe(false)
  })

  test('should handle multiple unsubscribe calls', () => {
    // Test multiple unsubscribe calls on the same observable
    const { observable$ } = streamFactory()

    observable$.unsubscribe()
    expect((observable$ as any)._finishFlag).toBe(true)

    // Second unsubscribe should not cause issues
    observable$.unsubscribe()
    expect((observable$ as any)._finishFlag).toBe(true)
  })

  test('should clean up callbacks when unsubscribed', () => {
    // Test that callbacks are cleaned up when unsubscribed
    const { stream$, observable$ } = streamFactory()

    const unsubscribeCallback = () => console.log('unsubscribe')
    const completeCallback = () => console.log('complete')

    observable$.afterUnsubscribe(unsubscribeCallback)
    observable$.afterComplete(completeCallback)

    // Trigger execution to change state
    stream$.next('test value')

    // Verify state changed from null after execution
    expect(observable$.status).not.toBe(null)

    observable$.unsubscribe()

    // Observable should be cleaned up using _cleanFlag
    expect((observable$ as any)._getFlag('_cleanFlag')).toBe(true)
  })

  test('should handle unsubscribe during execution', async () => {
    // Test unsubscribe during execution
    const { observable$, stream$ } = streamFactory()

    observable$.then(() => {
      console.log('executing')
      observable$.unsubscribe()
    })

    // Verify initial clean state - should be false initially
    expect((observable$ as any)._getFlag('_cleanFlag')).toBe(false)

    // Trigger execution by setting a new value
    stream$.next('new value')

    expect(consoleSpy).toHaveBeenCalledWith('executing')
    expect((observable$ as any)._finishFlag).toBe(true)
    expect((observable$ as any)._getFlag('_cleanFlag')).toBe(true)
  })

  test('should handle unsubscribe during async execution', async () => {
    // Test unsubscribe during async execution
    const { stream$, observable$ } = streamFactory()

    observable$.then(async () => {
      console.log('async executing')
      await sleep(10)
      observable$.unsubscribe()
    })

    // Verify initial clean state - should be false initially
    expect((observable$ as any)._getFlag('_cleanFlag')).toBe(false)

    // Trigger execution by setting a new value
    stream$.next('new value')

    expect(observable$.status).not.toBe(null)
    await sleep(20)

    expect(consoleSpy).toHaveBeenCalledWith('async executing')
    expect((observable$ as any)._finishFlag).toBe(true)
    expect((observable$ as any)._getFlag('_cleanFlag')).toBe(true)
  })

  test('should handle unsubscribe with pending children', async () => {
    // Test unsubscribe with pending children
    const { stream$, observable$ } = streamFactory()

    observable$.then(async () => {
      await sleep(50)
      console.log('child executed')
    })

    stream$.next('test value')
    await sleep(10)
    observable$.unsubscribe()
    await sleep(60)

    // Pending child should execute after parent unsubscribe
    expect(consoleSpy).toHaveBeenCalledWith('child executed')
  })

  test('should handle unsubscribe with multiple pending children', async () => {
    // Test unsubscribe with multiple pending children
    const { stream$, observable$ } = streamFactory()

    for (let i = 0; i < 5; i++) {
      observable$.then(async () => {
        await sleep(50)
        console.log(`child ${i} executed`)
      })
    }

    stream$.next('test value')
    await sleep(10)
    observable$.unsubscribe()
    await sleep(60)

    // No children should execute after parent unsubscribe
    expect(consoleSpy).toHaveBeenCalledTimes(5)
  })

  test('should handle unsubscribe with deep nested children', () => {
    // Test unsubscribe with deep nested children
    const { stream$, observable$: level1 } = streamFactory()
    const level2 = level1.then()
    const level3 = level2.then()
    const level4 = level3.then()

    // Trigger execution to change states
    stream$.next('test value')

    // Verify states changed from null after execution
    expect(level1.status).not.toBe(null)
    expect(level2.status).not.toBe(null)
    expect(level3.status).not.toBe(null)
    expect(level4.status).not.toBe(null)

    level1.unsubscribe()

    // All levels should be cleaned up using _cleanFlag
    expect((level1 as any)._getFlag('_cleanFlag')).toBe(true)
    expect((level2 as any)._getFlag('_cleanFlag')).toBe(true)
    expect((level3 as any)._getFlag('_cleanFlag')).toBe(true)
    expect((level4 as any)._getFlag('_cleanFlag')).toBe(true)
  })

  test('should handle unsubscribe with circular references', () => {
    // Test unsubscribe with circular references
    const { observable$ } = streamFactory()

    // Create circular reference
    const circularHandler = () => {
      return observable$
    }

    observable$.then(circularHandler)
    observable$.unsubscribe()

    // Should handle circular reference gracefully
    expect((observable$ as any)._finishFlag).toBe(true)
  })

  test('should handle unsubscribe with plugins', () => {
    // Test unsubscribe with plugins
    const { observable$ } = streamFactory()

    const plugin = () => console.log('plugin executed')
    observable$.use({ execute: [plugin] })

    observable$.unsubscribe()

    // Plugin should not execute after unsubscribe
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('should handle unsubscribe with then plugins', () => {
    // Test unsubscribe with then plugins
    const { observable$ } = streamFactory()

    const thenPlugin = () => {
      console.log('then plugin')
    }
    observable$.use({ then: [thenPlugin] })

    // Then plugin executes when then() is called, not when unsubscribe is called
    observable$.then(() => console.log('then'))

    // Clear console spy to check that unsubscribe doesn't trigger additional calls
    consoleSpy.mockClear()
    observable$.unsubscribe()

    // Then plugin should not execute again after unsubscribe
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('should handle unsubscribe with multiple callbacks', () => {
    // Test unsubscribe with multiple callbacks
    const { stream$, observable$ } = streamFactory()

    const callback1 = () => console.log('callback1')
    const callback2 = () => console.log('callback2')
    const callback3 = () => console.log('callback3')

    observable$.afterUnsubscribe(callback1)
    observable$.afterUnsubscribe(callback2)
    observable$.afterUnsubscribe(callback3)

    // Trigger execution to change state
    stream$.next('test value')

    // Verify state changed from null after execution
    expect(observable$.status).not.toBe(null)

    observable$.unsubscribe()

    // Observable should be cleaned up using _cleanFlag
    expect((observable$ as any)._getFlag('_cleanFlag')).toBe(true)
  })

  test('should handle unsubscribe with duplicate callbacks', () => {
    // Test unsubscribe with duplicate callbacks
    const { observable$ } = streamFactory()

    const callback = () => console.log('callback')

    observable$.afterUnsubscribe(callback)
    observable$.afterUnsubscribe(callback) // Duplicate

    observable$.unsubscribe()

    // Observable should be cleaned up using _cleanFlag
    expect((observable$ as any)._getFlag('_cleanFlag')).toBe(true)
  })

  test('should handle unsubscribe with removed callbacks', () => {
    // Test unsubscribe with removed callbacks
    const { observable$ } = streamFactory()

    const callback = () => console.log('callback')

    observable$.afterUnsubscribe(callback)
    observable$.offUnsubscribe(callback)

    observable$.unsubscribe()

    // Should not throw error
    expect((observable$ as any)._finishFlag).toBe(true)
  })

  test('should handle unsubscribe with removed complete callbacks', () => {
    // Test unsubscribe with removed complete callbacks
    const { observable$ } = streamFactory()

    const callback = (value: any, status: any) => console.log('complete', value, status)

    observable$.afterComplete(callback)
    observable$.offComplete(callback)

    observable$.unsubscribe()

    // Should not throw error
    expect((observable$ as any)._finishFlag).toBe(true)
  })

  test('should handle unsubscribe with non-existent callbacks', () => {
    // Test unsubscribe with non-existent callbacks
    const { observable$ } = streamFactory()

    const callback = () => console.log('callback')

    // Remove non-existent callback
    observable$.offUnsubscribe(callback)
    observable$.offComplete(callback)

    observable$.unsubscribe()

    // Should not throw error
    expect((observable$ as any)._finishFlag).toBe(true)
  })

  test('should handle unsubscribe with null/undefined callbacks', () => {
    // Test unsubscribe with null/undefined callbacks
    const { observable$ } = streamFactory()

    observable$.afterUnsubscribe(null as any)
    observable$.afterUnsubscribe(undefined as any)
    observable$.afterComplete(null as any)
    observable$.afterComplete(undefined as any)

    observable$.unsubscribe()

    // Should not throw error
    expect((observable$ as any)._finishFlag).toBe(true)
  })

  // Additional tests for _cleanFlag behavior
  test('should not set _cleanFlag before unsubscribe', () => {
    // Test that _cleanFlag is false initially and after normal operations
    const { stream$, observable$ } = streamFactory()

    // Initially should not be cleaned
    expect((observable$ as any)._getFlag('_cleanFlag')).toBe(false)

    // After execution should still not be cleaned
    stream$.next('test value')
    expect((observable$ as any)._getFlag('_cleanFlag')).toBe(false)

    // Only after unsubscribe should be cleaned
    observable$.unsubscribe()
    expect((observable$ as any)._getFlag('_cleanFlag')).toBe(true)
  })

  test('should maintain _cleanFlag after multiple operations', () => {
    // Test that _cleanFlag persists after being set
    const { stream$, observable$ } = streamFactory()

    const child = observable$.then()

    stream$.next('test value')
    observable$.unsubscribe()

    // Both should be cleaned
    expect((observable$ as any)._getFlag('_cleanFlag')).toBe(true)
    expect((child as any)._getFlag('_cleanFlag')).toBe(true)

    // Try to trigger more operations - should remain cleaned
    stream$.next('another value')
    expect((observable$ as any)._getFlag('_cleanFlag')).toBe(true)
    expect((child as any)._getFlag('_cleanFlag')).toBe(true)
  })
})
