import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, debounce } from '../../index'

describe('debounce operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test debounce operator', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(100))

    debouncedStream$.then((value) => {
      console.log(value)
    })

    await sleep(60)
    stream$.next(1)
    await sleep(60)
    stream$.next(2)
    await sleep(60)
    stream$.next(3)
    await sleep(60)
    stream$.next(4)
    await sleep(100)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 4)
  })

  test('test debounce with multiple emissions', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(50))

    debouncedStream$.then((value) => {
      console.log('debounced:', value)
    })

    // Rapid emissions
    stream$.next('a')
    await sleep(20)
    stream$.next('b')
    await sleep(20)
    stream$.next('c')
    await sleep(20)
    stream$.next('d')

    // Wait for debounce
    await sleep(50)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'debounced:', 'd')

    // Another emission after debounce period
    stream$.next('e')
    await sleep(50)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'debounced:', 'e')
  })

  test('test debounce with unsubscribe', async () => {
    const stream$ = $()
    const debouncedStream$ = stream$.pipe(debounce(100))

    debouncedStream$.then((value) => {
      console.log('debounced:', value)
    })

    stream$.next(1)
    await sleep(50)

    // Unsubscribe before debounce completes
    debouncedStream$.unsubscribe()
    await sleep(100)

    // Should not emit
    expect(consoleSpy).not.toHaveBeenCalled()
  })
})
