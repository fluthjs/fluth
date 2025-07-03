import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, promiseFactory } from '../utils'
import { $ } from '../../index'

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
})
