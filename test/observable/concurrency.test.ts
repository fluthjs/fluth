import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { Stream, Observable, get, change } from '../../index'

describe('Observable concurrency and race condition edge cases', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
  })

  test('should handle concurrent stream.next calls', () => {
    const stream = new Stream()
    stream.then(() => console.log('executed'))
    stream.next('test1')
    stream.next('test2')
    stream.next('test3')
    expect(consoleSpy).toHaveBeenCalledTimes(3)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'executed')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'executed')
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'executed')
  })

  test('should handle concurrent unsubscribe calls', () => {
    const stream = new Stream()
    const observable = stream.then(() => console.log('executed'))
    observable.unsubscribe()
    observable.unsubscribe()
    observable.unsubscribe()
    expect(() => {
      observable.unsubscribe()
    }).not.toThrow()
  })

  test('should handle stream.next after unsubscribe', () => {
    const stream = new Stream()
    const observable = stream.then(() => console.log('executed'))
    observable.unsubscribe()
    stream.next('test')
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('should handle unsubscribe during execution', () => {
    const stream = new Stream()
    const observable = stream.then(() => {
      console.log('executing')
      observable.unsubscribe()
    })
    stream.next('test')
    expect(consoleSpy).toHaveBeenCalledWith('executing')
  })

  test('should handle race condition between then and unsubscribe', () => {
    const stream = new Stream()
    const child = stream.then(() => console.log('child executed'))
    child.unsubscribe()
    stream.next('test')
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('should handle race condition between thenImmediate and unsubscribe', () => {
    const stream = new Stream()
    stream.next('initial')
    const child = stream.thenImmediate(() => console.log('immediate executed'))
    child.unsubscribe()
    expect(consoleSpy).toHaveBeenCalledWith('immediate executed')
  })

  test('should handle race condition between thenOnce and unsubscribe', () => {
    const stream = new Stream()
    const child = stream.thenOnce(() => console.log('once executed'))
    child.unsubscribe()
    stream.next('test')
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('should handle concurrent plugin additions', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')
    const plugin1 = () => console.log('plugin1')
    const plugin2 = () => console.log('plugin2')
    const plugin3 = () => console.log('plugin3')
    observable.use({ execute: [plugin1] })
    observable.use({ execute: [plugin2] })
    observable.use({ execute: [plugin3] })
    expect(() => {
      observable.use({ execute: [plugin1] })
    }).not.toThrow()
  })

  test('should handle concurrent plugin removals', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')
    const plugin1 = () => console.log('plugin1')
    const plugin2 = () => console.log('plugin2')
    const plugin3 = () => console.log('plugin3')
    observable.use({ execute: [plugin1, plugin2, plugin3] })
    observable.remove({ execute: [plugin1] })
    observable.remove({ execute: [plugin2] })
    observable.remove({ execute: [plugin3] })
    expect(() => {
      observable.remove({ execute: [plugin1] })
    }).not.toThrow()
  })

  test('should handle race condition between plugin addition and removal', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')
    const plugin = () => console.log('plugin')
    observable.use({ execute: [plugin] })
    observable.remove({ execute: [plugin] })
    expect(() => {
      observable.remove({ execute: [plugin] })
    }).not.toThrow()
  })

  test('should handle concurrent callback additions', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')
    const callback1 = () => console.log('callback1')
    const callback2 = () => console.log('callback2')
    const callback3 = () => console.log('callback3')
    observable.afterUnsubscribe(callback1)
    observable.afterUnsubscribe(callback2)
    observable.afterUnsubscribe(callback3)
    expect(() => {
      observable.afterUnsubscribe(callback1)
    }).not.toThrow()
  })

  test('should handle concurrent callback removals', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')
    const callback1 = () => console.log('callback1')
    const callback2 = () => console.log('callback2')
    const callback3 = () => console.log('callback3')
    observable.afterUnsubscribe(callback1)
    observable.afterUnsubscribe(callback2)
    observable.afterUnsubscribe(callback3)
    observable.offUnsubscribe(callback1)
    observable.offUnsubscribe(callback2)
    observable.offUnsubscribe(callback3)
    expect(() => {
      observable.offUnsubscribe(callback1)
    }).not.toThrow()
  })

  test('should handle race condition between callback addition and removal', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')
    const callback = () => console.log('callback')
    observable.afterUnsubscribe(callback)
    observable.offUnsubscribe(callback)
    expect(() => {
      observable.offUnsubscribe(callback)
    }).not.toThrow()
  })

  test('should handle concurrent then chain modifications', () => {
    const stream = new Stream()
    const child1 = stream.then(() => console.log('child1'))
    const child2 = stream.then(() => console.log('child2'))
    const child3 = stream.then(() => console.log('child3'))
    child1.unsubscribe()
    child2.then(() => console.log('child2_modified'))
    child3.unsubscribe()
    stream.next('test')
    expect(consoleSpy).toHaveBeenCalledWith('child2')
    expect(consoleSpy).toHaveBeenCalledWith('child2_modified')
    expect(consoleSpy).not.toHaveBeenCalledWith('child1')
    expect(consoleSpy).not.toHaveBeenCalledWith('child3')
  })

  test('should handle race condition between pipe and unsubscribe', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')
    const operator = (obs: Observable) => obs.then(() => console.log('piped'))
    const piped = observable.pipe(operator)
    piped.unsubscribe()
    stream.next('test')
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('should handle concurrent pipe operations', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')
    const operator1 = (obs: Observable) => obs.then(() => console.log('pipe1'))
    const operator2 = (obs: Observable) => obs.then(() => console.log('pipe2'))
    const operator3 = (obs: Observable) => obs.then(() => console.log('pipe3'))
    const piped1 = observable.pipe(operator1)
    const piped2 = observable.pipe(operator2)
    const piped3 = observable.pipe(operator3)
    expect(piped1).toBeInstanceOf(Observable)
    expect(piped2).toBeInstanceOf(Observable)
    expect(piped3).toBeInstanceOf(Observable)
  })

  test('should handle race condition between get and unsubscribe', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')
    const child = observable.pipe(get(() => console.log('get executed')))
    child.unsubscribe()
    stream.next('test')
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('should handle race condition between change and unsubscribe', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')
    const child = observable.pipe(change(() => console.log('change executed')))
    child.unsubscribe()
    stream.next('test')
    expect(consoleSpy).not.toHaveBeenCalled()
  })
  test('should handle race condition between $then and unsubscribe', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')
    const child = observable.thenSet(() => console.log('$then executed'))
    child.unsubscribe()
    stream.next('test')
    expect(consoleSpy).not.toHaveBeenCalled()
  })
  test('should handle concurrent status changes', () => {
    const stream = new Stream()
    const observable = stream.then(() => console.log('executed'))
    stream.next('test1')
    observable.unsubscribe()
    stream.next('test2')
    expect(() => {
      observable.unsubscribe()
    }).not.toThrow()
  })

  test('should handle race condition in deep nested observables', () => {
    const stream = new Stream()
    const level1 = stream.then(() => 'level1')
    const level2 = level1.then(() => 'level2')
    level2.then(() => console.log('level3 executed'))
    level2.unsubscribe()
    stream.next('test')
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('should handle concurrent thenOnce executions', () => {
    const stream = new Stream()
    stream.thenOnce(() => console.log('once executed'))
    stream.next('test1')
    stream.next('test2')
    stream.next('test3')
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    expect(consoleSpy).toHaveBeenCalledWith('once executed')
  })

  test('should handle concurrent catch handlers', async () => {
    const stream = new Stream()
    const observable = stream.then(() => {
      throw new Error('test error')
    })
    observable.catch(() => console.log('catch1'))
    observable.catch(() => console.log('catch2'))
    observable.catch(() => console.log('catch3'))
    stream.next('test')
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'catch1')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'catch2')
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'catch3')
  })

  test('should handle race condition between finally and unsubscribe', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')
    observable.finally(() => console.log('finally executed'))
    observable.unsubscribe()
    stream.next('test')
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('should stop pending child observable execution when stream emits new value', async () => {
    // Test objective: Verify that when Observable is in pending state and stream emits new value,
    // the pending Promise result should be ignored, won't update Observable's value,
    // and won't trigger its children observable execution
    const stream = new Stream()

    // Use controllable Promise to simulate slow async operation
    const pendingPromises: { resolve: (value: string) => void }[] = []

    // Add a child observable that will execute slow async operation
    const slowChild = stream.then(() => {
      console.log('slow-child-start')
      return new Promise<string>((resolve) => {
        pendingPromises.push({ resolve })
      })
    })

    // Add grandchild to verify children won't be triggered
    const grandChild = slowChild.then((value) => {
      console.log('grandchild-executed', value)
      return 'grandchild-result'
    })

    // Start the first async operation
    stream.next('first-value')

    // Wait a bit to ensure child starts execution
    await sleep(10)

    // Verify child observable has started execution and is in pending state
    expect(consoleSpy).toHaveBeenCalledWith('slow-child-start')
    expect(slowChild.status).toBe('pending')
    expect(grandChild.status).toBe(null) // grandchild hasn't started yet
    expect(pendingPromises.length).toBe(1) // one pending Promise

    // Now emit new value, this creates new rootPromise
    stream.next('second-value')

    // Wait for new value propagation
    await sleep(10)

    // Now resolve the slow Promise, simulating pending operation completion
    pendingPromises[0].resolve('slow-child-result')

    // Wait for Promise resolution to be processed
    await sleep(10)

    // Key verification 1: slowChild's value should not be updated with pending result
    // because when Promise completes, rootPromise has changed, so Observable ignores the result
    expect(slowChild.value).not.toBe('slow-child-result')
    expect(slowChild.value).toBeUndefined() // value remains undefined because Promise result was ignored

    // Key verification 2: grandChild should not be triggered to execute
    // because slowChild didn't process pending result, so children won't be triggered
    expect(consoleSpy).not.toHaveBeenCalledWith('grandchild-executed', 'slow-child-result')
    expect(grandChild.value).toBeUndefined() // grandchild never executed

    // Verify stream's value is the latest
    expect(stream.value).toBe('second-value')

    // Verify console output: slow-child-start was called 2 times (each stream.next re-executes)
    // but grandchild-executed should not be called because first Promise result was ignored
    expect(consoleSpy).toHaveBeenCalledTimes(2)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'slow-child-start')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'slow-child-start')
    expect(consoleSpy).not.toHaveBeenCalledWith('grandchild-executed', expect.any(String))

    pendingPromises[1].resolve('slow-child-result')
    await sleep(10)
    // Key verification 3: grandChild should be triggered to execute
    expect(slowChild.value).toBe('slow-child-result')
    expect(grandChild.value).toBe('grandchild-result')
    expect(consoleSpy).toHaveBeenCalledWith('grandchild-executed', 'slow-child-result')
  })
})
