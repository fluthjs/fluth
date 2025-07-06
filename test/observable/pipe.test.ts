import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy } from '../utils'
import { Observable } from '../../src/observable'
import { Stream } from '../../src/stream'

describe('Observable pipe method edge cases', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
  })

  test('should handle pipe with no operators', () => {
    // Test pipe method with no operators
    const stream = new Stream()
    const observable = new Observable(stream)
    const result = observable.pipe()
    expect(result).toBe(observable)
  })

  test('should handle pipe with single operator', () => {
    // Test pipe method with single operator
    const stream = new Stream()
    const observable = new Observable(stream)
    const operator = (obs: Observable) => obs.then((value) => value + '_modified')

    const result = observable.pipe(operator)
    expect(result).not.toBe(observable)
    expect(result).toBeInstanceOf(Observable)
  })

  test('should handle pipe with multiple operators', () => {
    // Test pipe method with multiple operators
    const stream = new Stream()
    const observable = new Observable(stream)
    const operator1 = (obs: Observable) => obs.then((value) => value + '_1')
    const operator2 = (obs: Observable) => obs.then((value) => value + '_2')
    const operator3 = (obs: Observable) => obs.then((value) => value + '_3')

    const result = observable.pipe(operator1, operator2, operator3)
    expect(result).toBeInstanceOf(Observable)
  })

  test('should handle pipe with operator that returns different type', () => {
    // Test pipe method with operator that changes type
    const stream = new Stream()
    const observable = new Observable<string>(stream)
    const operator = (obs: Observable<string>) => obs.then((value) => value.length)

    const result = observable.pipe(operator)
    expect(result).toBeInstanceOf(Observable)
  })

  test('should handle pipe with operator that throws error', () => {
    // Test pipe method with operator that throws error
    const stream = new Stream()
    const observable = new Observable(stream)
    const errorOperator = (obs: Observable) => {
      throw new Error('Operator error')
    }

    expect(() => {
      observable.pipe(errorOperator)
    }).toThrow('Operator error')
  })

  test('should handle pipe with operator that returns null/undefined', () => {
    // Test pipe method with operator that returns null/undefined
    const stream = new Stream()
    const observable = new Observable(stream)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const nullOperator = (_obs: Observable) => null as any
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const undefinedOperator = (_obs: Observable) => undefined as any

    // These should not throw, but should handle gracefully
    const result1 = observable.pipe(nullOperator)
    const result2 = observable.pipe(undefinedOperator)

    expect(result1).toBeNull()
    expect(result2).toBeUndefined()
  })

  test('should handle pipe with operator that modifies observable in place', () => {
    // Test pipe method with operator that modifies observable in place
    const stream = new Stream()
    const observable = new Observable(stream)
    const modifyingOperator = (obs: Observable) => {
      obs.then(() => console.log('modified'))
      return obs
    }

    const result = observable.pipe(modifyingOperator)
    expect(result).toBe(observable)
  })

  test('should handle pipe with operator that creates new observable', () => {
    // Test pipe method with operator that creates new observable
    const stream = new Stream()
    const observable = new Observable(stream)
    const newObservableOperator = (obs: Observable) => {
      const newObs = new Observable(stream)
      newObs.then(() => console.log('new observable'))
      return newObs
    }

    const result = observable.pipe(newObservableOperator)
    expect(result).not.toBe(observable)
    expect(result).toBeInstanceOf(Observable)
  })

  test('should handle pipe with operator that returns promise', () => {
    // Test pipe method with operator that returns promise
    const stream = new Stream()
    const observable = new Observable(stream)
    const promiseOperator = (obs: Observable) => {
      return obs.then(() => Promise.resolve('promise result'))
    }

    const result = observable.pipe(promiseOperator)
    expect(result).toBeInstanceOf(Observable)
  })

  test('should handle pipe with operator that returns rejected promise', () => {
    // Test pipe method with operator that returns rejected promise
    const stream = new Stream()
    const observable = new Observable(stream)
    const rejectOperator = (obs: Observable) => {
      return obs.then(() => Promise.reject('rejected'))
    }

    const result = observable.pipe(rejectOperator)
    expect(result).toBeInstanceOf(Observable)
  })

  test('should handle pipe with operator that has side effects', () => {
    // Test pipe method with operator that has side effects
    const stream = new Stream()
    const observable = new Observable(stream)
    let sideEffect = false

    const sideEffectOperator = (obs: Observable) => {
      sideEffect = true
      return obs.then((value) => value)
    }

    const result = observable.pipe(sideEffectOperator)
    expect(sideEffect).toBe(true)
    expect(result).toBeInstanceOf(Observable)
  })

  test('should handle pipe with operator that calls unsubscribe', () => {
    // Test pipe method with operator that calls unsubscribe
    const stream = new Stream()
    const observable = new Observable(stream)
    const unsubscribeOperator = (obs: Observable) => {
      obs.unsubscribe()
      return obs
    }

    const result = observable.pipe(unsubscribeOperator)
    expect(result).toBeInstanceOf(Observable)
  })

  test('should handle pipe with operator that uses plugins', () => {
    // Test pipe method with operator that uses plugins
    const stream = new Stream()
    const observable = new Observable(stream)
    const pluginOperator = (obs: Observable) => {
      return obs.use({ then: [() => console.log('plugin')] })
    }

    const result = observable.pipe(pluginOperator)
    expect(result).toBeInstanceOf(Observable)
  })

  test('should handle pipe with operator that chains multiple then calls', () => {
    // Test pipe method with operator that chains multiple then calls
    const stream = new Stream()
    const observable = new Observable(stream)
    const chainOperator = (obs: Observable) => {
      return obs
        .then((value) => value + '_1')
        .then((value) => value + '_2')
        .then((value) => value + '_3')
    }

    const result = observable.pipe(chainOperator)
    expect(result).toBeInstanceOf(Observable)
  })

  test('should handle pipe with operator that uses condition and differ', () => {
    // Test pipe method with operator that uses condition and differ
    const stream = new Stream()
    const observable = new Observable(stream)
    const conditionalOperator = (obs: Observable) => {
      return obs.then(
        (value) => value,
        undefined,
        (value) => value > 0,
        (value) => value,
      )
    }

    const result = observable.pipe(conditionalOperator)
    expect(result).toBeInstanceOf(Observable)
  })
})
