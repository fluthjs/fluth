import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy } from '../utils'
import { Stream, Observable, get, change } from '../../index'

describe('Observable edge cases', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
  })

  test('should handle multiple unsubscribe calls gracefully', () => {
    // Test that multiple unsubscribe calls don't cause errors
    const stream = new Stream()
    const observable = new Observable(stream)

    observable.unsubscribe()
    expect(() => {
      observable.unsubscribe()
      observable.unsubscribe()
    }).not.toThrow()
  })

  test('should handle unsubscribe on already unsubscribed observable', () => {
    // Test unsubscribe on already unsubscribed observable
    const stream = new Stream()
    const observable = new Observable(stream)

    observable.unsubscribe()
    expect(() => {
      observable.unsubscribe()
    }).not.toThrow()
  })

  test('should handle execute on unsubscribed observable', () => {
    // Test execute on unsubscribed observable
    const stream = new Stream()
    const observable = new Observable(stream)

    observable.unsubscribe()
    expect(() => {
      observable.execute()
    }).not.toThrow()
  })

  test('should handle then on unsubscribed observable', () => {
    // Test then on unsubscribed observable
    const stream = new Stream()
    const observable = new Observable(stream)

    observable.unsubscribe()
    const child = observable.then(() => console.log('test'))
    expect(child).toBeInstanceOf(Observable)
  })

  test('should handle use with empty plugins', () => {
    // Test use with empty plugins
    const stream = new Stream()
    const observable = new Observable(stream)

    expect(() => {
      observable.use()
      observable.use({})
      observable.use({ then: [], execute: [] })
    }).not.toThrow()
  })

  test('should handle remove with empty plugins', () => {
    // Test remove with empty plugins
    const stream = new Stream()
    const observable = new Observable(stream)

    expect(() => {
      observable.remove()
      observable.remove({})
      observable.remove({ then: [], execute: [] })
    }).not.toThrow()
  })

  test('should handle afterUnsubscribe with null/undefined', () => {
    // Test afterUnsubscribe with null/undefined
    const stream = new Stream()
    const observable = new Observable(stream)

    expect(() => {
      observable.afterUnsubscribe(null as any)
      observable.afterUnsubscribe(undefined as any)
    }).not.toThrow()
  })

  test('should handle afterComplete with null/undefined', () => {
    // Test afterComplete with null/undefined
    const stream = new Stream()
    const observable = new Observable(stream)

    expect(() => {
      observable.afterComplete(null as any)
      observable.afterComplete(undefined as any)
    }).not.toThrow()
  })

  test('should handle offUnsubscribe with non-existent callback', () => {
    // Test offUnsubscribe with non-existent callback
    const stream = new Stream()
    const observable = new Observable(stream)

    expect(() => {
      observable.offUnsubscribe(() => {
        // Empty callback for testing
      })
    }).not.toThrow()
  })

  test('should handle offComplete with non-existent callback', () => {
    // Test offComplete with non-existent callback
    const stream = new Stream()
    const observable = new Observable(stream)

    expect(() => {
      observable.offComplete(() => {
        // Empty callback for testing
      })
    }).not.toThrow()
  })

  test('should handle pipe with no operators', () => {
    // Test pipe with no operators
    const stream = new Stream()
    const observable = new Observable(stream)

    const result = observable.pipe()
    expect(result).toBe(observable)
  })

  test('should handle pipe with single operator', () => {
    // Test pipe with single operator
    const stream = new Stream()
    const observable = new Observable(stream)

    const operator = (obs: Observable) => obs.then((value) => value)
    const result = observable.pipe(operator)
    expect(result).toBeInstanceOf(Observable)
  })

  test('should handle pipe with operator that returns null', () => {
    // Test pipe with operator that returns null
    const stream = new Stream()
    const observable = new Observable(stream)

    const nullOperator = () => null as any
    expect(() => {
      observable.pipe(nullOperator)
    }).not.toThrow()
  })

  test('should handle pipe with operator that returns undefined', () => {
    // Test pipe with operator that returns undefined
    const stream = new Stream()
    const observable = new Observable(stream)

    const undefinedOperator = () => undefined as any
    expect(() => {
      observable.pipe(undefinedOperator)
    }).not.toThrow()
  })

  test('should handle then with null/undefined handlers', () => {
    // Test then with null/undefined handlers
    const stream = new Stream()
    const observable = new Observable(stream)

    expect(() => {
      observable.then(null as any)
      observable.then(undefined as any)
      observable.then(null as any, null as any)
    }).not.toThrow()
  })

  test('should handle thenImmediate with null/undefined handlers', () => {
    // Test thenImmediate with null/undefined handlers
    const stream = new Stream()
    const observable = new Observable(stream)

    expect(() => {
      observable.thenImmediate(null as any)
      observable.thenImmediate(undefined as any)
      observable.thenImmediate(null as any, null as any)
    }).not.toThrow()
  })

  test('should handle thenOnce with null/undefined handlers', () => {
    // Test thenOnce with null/undefined handlers
    const stream = new Stream()
    const observable = new Observable(stream)

    expect(() => {
      observable.thenOnce(null as any)
      observable.thenOnce(undefined as any)
      observable.thenOnce(null as any, null as any)
    }).not.toThrow()
  })

  test('should handle catch with null/undefined handler', () => {
    // Test catch with null/undefined handler
    const stream = new Stream()
    const observable = new Observable(stream)

    expect(() => {
      observable.catch(null as any)
      observable.catch(undefined as any)
    }).not.toThrow()
  })

  test('should handle finally with null/undefined handler', () => {
    // Test finally with null/undefined handler
    const stream = new Stream()
    const observable = new Observable(stream)

    expect(() => {
      observable.finally(null as any)
      observable.finally(undefined as any)
    }).not.toThrow()
  })

  test('should handle get with null/undefined getter', () => {
    // Test get with null/undefined getter
    const stream = new Stream()
    const observable = new Observable(stream)

    expect(() => {
      observable.pipe(get(null as any))
      observable.pipe(get(undefined as any))
    }).not.toThrow()
  })

  test('should handle change with null/undefined getter', () => {
    // Test change with null/undefined getter
    const stream = new Stream()
    const observable = new Observable(stream)

    expect(() => {
      observable.pipe(change(null as any))
      observable.pipe(change(undefined as any))
    }).not.toThrow()
  })

  test('should handle $then with null/undefined setter', () => {
    // Test $then with null/undefined setter
    const stream = new Stream()
    const observable = new Observable(stream)

    expect(() => {
      observable.$then(null as any)
      observable.$then(undefined as any)
    }).not.toThrow()
  })

  test('should handle $thenOnce with null/undefined setter', () => {
    // Test $thenOnce with null/undefined setter
    const stream = new Stream()
    const observable = new Observable(stream)

    expect(() => {
      observable.$thenOnce(null as any)
      observable.$thenOnce(undefined as any)
    }).not.toThrow()
  })

  test('should handle $thenImmediate with null/undefined setter', () => {
    // Test $thenImmediate with null/undefined setter
    const stream = new Stream()
    const observable = new Observable(stream)

    expect(() => {
      observable.$thenImmediate(null as any)
      observable.$thenImmediate(undefined as any)
    }).not.toThrow()
  })

  test('should handle deep nesting without errors', () => {
    // Test deep nesting without errors
    const stream = new Stream()
    const level1 = new Observable(stream)
    const level2 = new Observable(level1)
    const level3 = new Observable(level2)
    const level4 = new Observable(level3)
    const level5 = new Observable(level4)

    expect(() => {
      level5.then(() => console.log('deep'))
      level1.execute()
    }).not.toThrow()
  })

  test('should handle circular references gracefully', () => {
    // Test circular references gracefully
    const stream = new Stream()
    const observable = new Observable(stream)

    const circularHandler = () => {
      return observable // Circular reference
    }

    expect(() => {
      observable.then(circularHandler)
      observable.execute()
    }).not.toThrow()
  })

  test('should handle multiple then chains', () => {
    // Test multiple then chains
    const stream = new Stream()
    const observable = new Observable(stream)

    const child1 = observable.then(() => 'child1')
    const child2 = observable.then(() => 'child2')
    const child3 = observable.then(() => 'child3')

    expect(child1).toBeInstanceOf(Observable)
    expect(child2).toBeInstanceOf(Observable)
    expect(child3).toBeInstanceOf(Observable)
  })

  test('should handle chained then calls', () => {
    // Test chained then calls
    const stream = new Stream()
    const observable = new Observable(stream)

    const result = observable
      .then(() => 'step1')
      .then(() => 'step2')
      .then(() => 'step3')

    expect(result).toBeInstanceOf(Observable)
  })

  test('should handle mixed method chaining', () => {
    // Test mixed method chaining
    const stream = new Stream()
    const observable = new Observable(stream)

    const result = observable
      .then(() => 'step1')
      .catch(() => 'error')
      .finally(() => 'cleanup')
      .then(() => 'step2')

    expect(result).toBeInstanceOf(Observable)
  })

  test('should handle plugin chaining', () => {
    // Test plugin chaining
    const stream = new Stream()
    const observable = new Observable(stream)

    const result = observable
      .use({
        then: [
          () => {
            // Empty plugin for testing
          },
        ],
      })
      .use({
        execute: [
          () => {
            // Empty plugin for testing
          },
        ],
      })
      .remove({
        then: [
          () => {
            // Empty plugin for testing
          },
        ],
      })

    expect(result).toBe(observable)
  })

  test('should handle complex observable graph', () => {
    // Test complex observable graph
    const stream = new Stream()
    const root = new Observable(stream)

    // Create a complex graph
    const branch1 = root.then(() => 'branch1')
    const branch2 = root.then(() => 'branch2')
    branch1.then(() => 'branch1a')
    branch1.then(() => 'branch1b')
    branch2.then(() => 'branch2a')

    expect(() => {
      root.execute()
    }).not.toThrow()
  })

  test('should handle unsubscribe in complex graph', () => {
    // Test unsubscribe in complex graph
    const stream = new Stream()
    const root = new Observable(stream)

    const branch1 = root.then(() => 'branch1')
    root.then(() => 'branch2')
    branch1.then(() => 'branch1a')
    branch1.then(() => 'branch1b')

    expect(() => {
      branch1.unsubscribe()
      root.execute()
    }).not.toThrow()
  })

  test('should handle execute with no observers', () => {
    // Test execute with no observers
    const stream = new Stream()
    const observable = new Observable(stream)

    expect(() => {
      observable.execute()
    }).not.toThrow()
  })

  test('should handle execute with observers that return promises', () => {
    // Test execute with observers that return promises
    const stream = new Stream()
    const observable = new Observable(stream)

    observable.then(() => Promise.resolve('promise result'))
    observable.then(() => Promise.reject('promise error'))

    expect(() => {
      observable.execute()
    }).not.toThrow()
  })

  test('should handle execute with observers that throw errors', () => {
    // Test execute with observers that throw errors
    const stream = new Stream()
    const observable = new Observable(stream)

    observable.then(() => {
      throw new Error('Test error')
    })

    expect(() => {
      observable.execute()
    }).not.toThrow()
  })
})
