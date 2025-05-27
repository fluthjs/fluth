import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from './utils'
import { createStream } from '../index'

describe('createStream test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    process.setMaxListeners(100)
    vi.useFakeTimers()
    consoleSpy.mockClear()
  })

  test('create stream without params', async () => {
    const stream$ = createStream()()
    expect(stream$.value).toBeUndefined()
  })

  test('create stream with initial data', async () => {
    const stream$ = createStream({})('test data')
    expect(stream$.value).toBe('test data')
  })

  test('create stream with then plugin', async () => {
    const plugin = {
      then: (unsubscribe) => {
        setTimeout(() => {
          console.log('plugin executed')
          unsubscribe()
        }, 10)
      },
    }
    const $ = createStream(plugin)
    const stream$ = $<string>()
    stream$.then((value) => console.log(value))
    stream$.next(Promise.resolve('test'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'test')
    await sleep(10)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'plugin executed')
    stream$.next(Promise.resolve('test2'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('create stream with chain plugin', async () => {
    const $ = createStream({
      chain: (observer) => ({
        customProp: () => (observer.value + ' custom') as string,
        aaa: '234',
      }),
    })
    const stream$ = $()
    stream$.next('test value')
    expect(stream$.customProp()).toBe('test value custom')
  })

  test('create stream with exec execute', async () => {
    const executePlugin = ({ result, unsubscribe }) => {
      if (result === 'error') {
        console.log('execute plugin caught error')
        unsubscribe()
        return 'handled error'
      }
      return result
    }

    const stream$ = createStream({ execute: executePlugin })()
    stream$.next('error')
    await sleep(10)
    expect(consoleSpy).toHaveBeenCalledWith('execute plugin caught error')

    // verify value after execute plugin handled
    const result = stream$.thenImmediate((value) => value).value
    expect(result).toBe('handled error')
  })
})
