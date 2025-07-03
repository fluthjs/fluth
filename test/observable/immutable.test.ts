import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, setTimeoutSleep } from '../utils'
import { $ } from '../../index'

describe('Observable immutable methods ($then, $thenOnce, $thenImmediate)', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('test $then immutable', async () => {
    const promise$ = $()
    const promise1$ = promise$.$then((value) => {
      value.key2.key22 = 'test2'
    })
    promise$.next({ key1: { key11: 'test' }, key2: { key22: 'test' } })
    expect(promise$.value === promise1$.value).toBeFalsy()
    expect(promise$.value?.key1 === promise1$.value?.key1).toBeTruthy()
    expect(promise$.value?.key2 === promise1$.value?.key2).toBeFalsy()
    expect(promise$.value?.key2.key22 === promise1$.value?.key2.key22).toBeFalsy()
  })

  test('test $then recipe async', async () => {
    const promise$ = $()
    const promise1$ = promise$.$then(async (value) => {
      await setTimeoutSleep(100)
      value.key2.key22 = 'test2'
    })
    promise$.next({ key1: { key11: 'test' }, key2: { key22: 'test' } })
    await sleep(50)
    expect(promise1$.value).toBeUndefined()
    await sleep(60)
    expect(promise$.value === promise1$.value).toBeFalsy()
    expect(promise$.value?.key1 === promise1$.value?.key1).toBeTruthy()
    expect(promise$.value?.key2 === promise1$.value?.key2).toBeFalsy()
    expect(promise$.value?.key2.key22 === promise1$.value?.key2.key22).toBeFalsy()
  })

  test('test $thenOnce', async () => {
    const promise$ = $<{ num: number; key: object }>()
    const promise1$ = promise$.$thenOnce((value) => {
      value.num = value.num + 1
    })
    promise$.next({ num: 1, key: {} })
    expect(promise$.value === promise1$.value).toBeFalsy()
    expect(promise1$.value?.num).toBe(2)
    promise$.set((value) => {
      value.num += 1
    })
    expect(promise1$.value?.num).toBe(2)
  })

  test('test $thenImmediate', async () => {
    const promise$ = $({ key1: { key11: 'test' }, key2: { key22: 'test' } })
    const promise1$ = promise$.$thenImmediate((value) => {
      value.key2.key22 = 'test2'
    })
    expect(promise$.value === promise1$.value).toBeFalsy()
    expect(promise$.value?.key1 === promise1$.value?.key1).toBeTruthy()
    expect(promise$.value?.key2 === promise1$.value?.key2).toBeFalsy()
    expect(promise$.value?.key2.key22 === promise1$.value?.key2.key22).toBeFalsy()
  })
})
