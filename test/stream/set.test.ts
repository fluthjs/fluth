import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep, setTimeoutSleep } from '../utils'
import { $ } from '../../index'

describe('Stream set method', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test set function when empty init', async () => {
    const promise$ = $()
    promise$.set((state) => {
      state.aaa = '123'
    })
    expect(promise$.value).toEqual(undefined)
  })

  test('test set function when init', async () => {
    const promise$ = $({ aaa: '123' })
    promise$.set((state) => {
      state.aaa = '456'
    })
    expect(promise$.value).toEqual({ aaa: '456' })
  })

  test('test set immutable', async () => {
    const promise$ = $({ key1: { key11: 'test' }, key2: { key22: 'test' } })
    const value = promise$.value
    promise$.set((state) => {
      state.key2.key22 = 'test2'
    })
    expect(value === promise$.value).toBeFalsy()
    expect(value?.key2 === promise$.value?.key2).toBeFalsy()
    expect(value?.key1 === promise$.value?.key1).toBeTruthy()
  })

  test('test set recipe is async function', async () => {
    const promise$ = $({ key1: { key11: 'test' }, key2: { key22: 'test' } })
    const value = promise$.value
    promise$.set(async (state) => {
      await setTimeoutSleep(10)
      state.key2.key22 = 'test2'
    })
    await sleep(11)
    expect(value === promise$.value).toBeFalsy()
    expect(value?.key2 === promise$.value?.key2).toBeFalsy()
    expect(value?.key1 === promise$.value?.key1).toBeTruthy()
  })
})
