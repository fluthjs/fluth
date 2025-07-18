import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy } from '../utils'
import { $ } from '../../index'

describe('Observable afterUnsubscribe and offUnsubscribe methods', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('test afterUnsubscribe', async () => {
    const observable$ = $().then()
    observable$.afterUnsubscribe(() => console.log('unsubscribe1'))
    observable$.afterUnsubscribe(() => console.log('unsubscribe2'))
    observable$.unsubscribe()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe1')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unsubscribe2')
  })

  test('test offUnsubscribe', async () => {
    const observable$ = $().then()
    const callback1 = () => console.log('unsubscribe1')
    const callback2 = () => console.log('unsubscribe2')
    const callback3 = () => console.log('unsubscribe3')

    observable$.afterUnsubscribe(callback1)
    observable$.afterUnsubscribe(callback2)
    observable$.afterUnsubscribe(callback3)

    observable$.offUnsubscribe(callback2)

    observable$.unsubscribe()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe1')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unsubscribe3')
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test offUnsubscribe with non-existent callback', async () => {
    const observable$ = $().then()
    const callback1 = () => console.log('unsubscribe1')
    const callback2 = () => console.log('unsubscribe2')
    const nonExistentCallback = () => console.log('non-existent')

    observable$.afterUnsubscribe(callback1)
    observable$.afterUnsubscribe(callback2)

    // 尝试移除不存在的回调
    observable$.offUnsubscribe(nonExistentCallback)

    observable$.unsubscribe()
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'unsubscribe1')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'unsubscribe2')
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })
})
