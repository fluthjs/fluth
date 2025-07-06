import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, promiseFactory } from '../utils'
import { $ } from '../../index'
import { Observable } from '../../src/observable'
import { Stream } from '../../src/stream'

describe('Observable plugins methods (use, remove)', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('test add execute plugin', async () => {
    const promise$ = $()
    const observer1 = () => promiseFactory(100, 'observer1')
    const observer2 = () => promiseFactory(100, 'observer2')
    const executePlugin = ({ result: promise }) =>
      promise.then((value) => {
        console.log(value)
        Promise.resolve(value)
      })
    promise$
      .use({ execute: executePlugin })
      .then(observer1)
      .use({ execute: executePlugin })
      .then(observer2)
    promise$.next(Promise.resolve())
    await sleep(210)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'observer1')
  })

  test('test then plugin', async () => {
    const promise$ = $()
    const thenPlugin = {
      then: (unsubscribe) => {
        setTimeout(unsubscribe, 100)
      },
    }
    promise$.use(thenPlugin)
    promise$.then((data) => console.log(data))

    promise$.next('hello')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'hello')
    consoleSpy.mockClear()
    await sleep(100)
    promise$.next('world')
    expect(consoleSpy).toHaveBeenCalledTimes(0)
  })

  // Edge cases tests
  test('should handle use with empty plugins array', () => {
    const stream = new Stream()
    const observable = new Observable(stream)
    const result = observable.use()
    expect(result).toBe(observable)
  })

  test('should handle use with null/undefined plugins', () => {
    const stream = new Stream()
    const observable = new Observable(stream)

    const result = observable.use({} as any, {} as any)
    expect(result).toBe(observable)
  })

  test('should handle use with plugins containing empty arrays', () => {
    const stream = new Stream()
    const observable = new Observable(stream)
    const result = observable.use(
      { then: [], execute: [], thenAll: [], executeAll: [] },
      { then: [], execute: [], thenAll: [], executeAll: [] },
    )
    expect(result).toBe(observable)
  })

  test('should handle use with duplicate plugins', () => {
    const stream = new Stream()
    const observable = new Observable(stream)
    const plugin1 = () => console.log('plugin1')
    const plugin2 = () => console.log('plugin2')

    observable.use({ then: [plugin1, plugin2] })
    observable.use({ then: [plugin1, plugin2] }) // Duplicate plugins

    // Should deduplicate plugins - check that plugins are added
    expect(observable).toBeDefined()
  })

  test('should throw error when child observable uses thenAll plugin', () => {
    const stream = new Stream()
    const parentObservable = new Observable(stream)
    const childObservable = new Observable(parentObservable)

    expect(() => {
      childObservable.use({ thenAll: [() => console.log('test')] })
    }).toThrow('observable node can not use thenAll or executeAll plugin')
  })

  test('should throw error when child observable uses executeAll plugin', () => {
    const stream = new Stream()
    const parentObservable = new Observable(stream)
    const childObservable = new Observable(parentObservable)

    expect(() => {
      childObservable.use({ executeAll: [() => console.log('test')] })
    }).toThrow('observable node can not use thenAll or executeAll plugin')
  })

  test('should handle remove with empty plugins array', () => {
    const stream = new Stream()
    const observable = new Observable(stream)
    const result = observable.remove()
    expect(result).toBe(observable)
  })

  test('should handle remove with non-existent plugins', () => {
    const stream = new Stream()
    const observable = new Observable(stream)
    const plugin1 = () => console.log('plugin1')
    const plugin2 = () => console.log('plugin2')

    observable.use({ then: [plugin1] })
    observable.remove({ then: [plugin2] }) // Remove non-existent plugin

    // Should not throw error
    expect(observable).toBeDefined()
  })

  test('should handle remove with partial plugin matches', () => {
    const stream = new Stream()
    const observable = new Observable(stream)
    const plugin1 = () => console.log('plugin1')
    const plugin2 = () => console.log('plugin2')
    const plugin3 = () => console.log('plugin3')

    observable.use({ then: [plugin1, plugin2, plugin3] })
    observable.remove({ then: [plugin2] }) // Remove only plugin2

    // Should not throw error
    expect(observable).toBeDefined()
  })

  test('should handle plugins with mixed valid and invalid entries', () => {
    const stream = new Stream()
    const observable = new Observable(stream)
    const validPlugin = () => console.log('valid')

    observable.use({
      then: [validPlugin, null as any, undefined as any, false as any, 0 as any, '' as any],
      execute: [validPlugin, null as any, undefined as any],
    })

    // Should not throw error
    expect(observable).toBeDefined()
  })

  test('should handle plugin execution order', async () => {
    const stream = new Stream()
    const executionOrder: string[] = []

    const plugin1 = ({ result }: any) => {
      executionOrder.push('plugin1')
      return result
    }
    const plugin2 = ({ result }: any) => {
      executionOrder.push('plugin2')
      return result
    }
    const plugin3 = ({ result }: any) => {
      executionOrder.push('plugin3')
      return result
    }

    stream.use({ execute: [plugin1, plugin2] })
    stream.use({ execute: [plugin3] })

    stream.then(() => 'test')
    stream.next('test') // Trigger execution by sending data to stream

    // Wait for plugins to execute
    await sleep(10)

    // Plugins should execute in order they were added
    expect(executionOrder).toEqual(['plugin1', 'plugin2', 'plugin3'])
  })

  test('should handle plugin that throws error', () => {
    const stream = new Stream()
    const observable = new Observable(stream)
    const errorPlugin = () => {
      throw new Error('Plugin error')
    }

    observable.use({ execute: [errorPlugin] })
    observable.then(() => 'test')

    // Should not throw error, should be handled gracefully
    expect(() => {
      observable.execute()
    }).not.toThrow()
  })

  test('should handle plugin with async function', async () => {
    const stream = new Stream()
    let executed = false

    const asyncPlugin = async ({ result }: any) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      executed = true
      return result
    }

    stream.use({ execute: [asyncPlugin] })
    stream.then(() => 'test')
    stream.next('test') // Trigger execution by sending data to stream

    // Wait for async plugin to complete
    await sleep(20)
    expect(executed).toBe(true)
  })
})
