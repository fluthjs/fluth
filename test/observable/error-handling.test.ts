import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { Stream } from '../../src/stream'

describe('Observable error handling edge cases', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
  })

  test('should handle then handler that throws error', async () => {
    const stream = new Stream()
    stream
      .then(() => {
        throw new Error('Then handler error')
      })
      .catch((error) => {
        console.log('Caught error:', error.message)
      })

    stream.next('test')
    await vi.runAllTimersAsync()
    expect(consoleSpy).toHaveBeenCalledWith('Caught error:', 'Then handler error')
  })

  test('should handle then handler that returns rejected promise', async () => {
    const stream = new Stream()
    stream
      .then(() => {
        return Promise.reject(new Error('Rejected promise'))
      })
      .catch((error) => {
        console.log('Caught promise error:', error.message)
      })

    stream.next('test')
    await sleep(10)
    expect(consoleSpy).toHaveBeenCalledWith('Caught promise error:', 'Rejected promise')
  })

  test('should handle catch handler that throws error', async () => {
    const stream = new Stream()
    stream
      .then(() => {
        throw new Error('Original error')
      })
      .catch(() => {
        throw new Error('Catch handler error')
      })
      .catch((error) => {
        console.log('Final catch:', error.message)
      })

    stream.next('test')

    await vi.runAllTimersAsync()

    expect(consoleSpy).toHaveBeenCalledWith('Final catch:', 'Catch handler error')
  })

  test('should handle finally handler that throws error', () => {
    const stream = new Stream()
    stream
      .then(() => {
        console.log('Success')
      })
      .finally(() => {
        throw new Error('Finally error')
      })
      .catch((error) => {
        console.log('Caught finally error:', error.message)
      })

    stream.next('test')

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'Success')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'Caught finally error:', 'Finally error')
  })

  test('should handle unsubscribe callback that throws error', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')

    observable.afterUnsubscribe(() => {
      throw new Error('Unsubscribe callback error')
    })

    // Should not throw error when unsubscribe is called
    expect(() => {
      observable.unsubscribe()
    }).not.toThrow()
  })

  test('should handle afterComplete callback that throws error', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')

    observable.afterComplete(() => {
      throw new Error('AfterComplete callback error')
    })

    // Should not throw error when complete is called
    expect(() => {
      stream.next('test')
    }).not.toThrow()
  })

  test('should handle circular reference in then chain', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')

    const circularHandler = (value: any) => {
      console.log('Circular:', value)
      return observable // Circular reference
    }

    observable.then(circularHandler as any).catch((error) => {
      console.log('Caught circular error:', error.message)
    })

    stream.next('test')
    // Should handle circular reference gracefully
    expect(consoleSpy).toHaveBeenCalled()
  })

  test('should handle error in plugin execution', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')

    const errorPlugin = () => {
      throw new Error('Plugin execution error')
    }

    observable.use({ execute: [errorPlugin] })
    observable.then(() => console.log('Success'))

    // Should handle plugin error gracefully
    expect(() => {
      stream.next('test')
    }).not.toThrow()
  })

  test('should handle error in plugin then callback', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')

    const errorPlugin = () => {
      throw new Error('Plugin then error')
    }

    observable.use({ then: [errorPlugin] })
    observable.then(() => console.log('Success'))

    // Should handle plugin error gracefully
    expect(() => {
      stream.next('test')
    }).not.toThrow()
  })

  test('should handle error in async plugin', () => {
    const stream = new Stream()
    const observable = stream.then(() => 'test')

    const asyncErrorPlugin = async () => {
      throw new Error('Async plugin error')
    }

    observable.use({ execute: [asyncErrorPlugin] })
    observable.then(() => console.log('Success'))

    // Should handle async plugin error gracefully
    expect(() => {
      stream.next('test')
    }).not.toThrow()
  })
})
