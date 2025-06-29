import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, skipFilter } from '../../index'

describe('skipFilter operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test skipFilter operator', async () => {
    const stream$ = $()
    // Skip odd-numbered emissions (1st, 3rd, 5th, etc.)
    const filteredStream$ = stream$.pipe(skipFilter((time) => time % 2 === 0))

    filteredStream$.then((value) => {
      console.log('filtered:', value)
    })

    // 1st emission - should be skipped (time=1, odd)
    stream$.next('first')
    await sleep(1)
    expect(consoleSpy).not.toHaveBeenCalled()

    // 2nd emission - should pass through (time=2, even)
    stream$.next('second')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'filtered:', 'second')

    // 3rd emission - should be skipped (time=3, odd)
    stream$.next('third')
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledTimes(1)

    // 4th emission - should pass through (time=4, even)
    stream$.next('fourth')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'filtered:', 'fourth')
  })

  test('test skipFilter with always true filter', async () => {
    const stream$ = $()
    const filteredStream$ = stream$.pipe(skipFilter(() => true))

    filteredStream$.then((value) => {
      console.log('always pass:', value)
    })

    // All emissions should pass through
    stream$.next(1)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'always pass:', 1)

    stream$.next(2)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'always pass:', 2)

    stream$.next(3)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'always pass:', 3)
  })

  test('test skipFilter with always false filter', async () => {
    const stream$ = $()
    const filteredStream$ = stream$.pipe(skipFilter(() => false))

    filteredStream$.then((value) => {
      console.log('never pass:', value)
    })

    // No emissions should pass through
    stream$.next(1)
    stream$.next(2)
    stream$.next(3)
    await sleep(1)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('test skipFilter with time-based filter', async () => {
    const stream$ = $()
    // Only allow emissions after the 3rd one
    const filteredStream$ = stream$.pipe(skipFilter((time) => time > 3))

    filteredStream$.then((value) => {
      console.log('after 3rd:', value)
    })

    stream$.next('first') // time=1, should be skipped
    stream$.next('second') // time=2, should be skipped
    stream$.next('third') // time=3, should be skipped
    await sleep(1)
    expect(consoleSpy).not.toHaveBeenCalled()

    stream$.next('fourth') // time=4, should pass through
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'after 3rd:', 'fourth')

    stream$.next('fifth') // time=5, should pass through
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'after 3rd:', 'fifth')
  })

  test('test skipFilter with rejected promises', async () => {
    const stream$ = $()
    // Skip first emission
    const filteredStream$ = stream$.pipe(skipFilter((time) => time > 1))

    filteredStream$.then(
      (value) => console.log('resolved:', value),
      (error) => console.log('rejected:', error),
    )

    // First emission (rejected) should be skipped
    stream$.next(Promise.reject('error1'))
    await sleep(1)
    expect(consoleSpy).not.toHaveBeenCalled()

    // Second emission should pass through
    stream$.next(Promise.reject('error2'))
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'rejected:', 'error2')

    // Third emission should also pass through
    stream$.next('success')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolved:', 'success')
  })

  test('test skipFilter with modulo filter', async () => {
    const stream$ = $()
    // Only allow every 3rd emission (3, 6, 9, etc.)
    const filteredStream$ = stream$.pipe(skipFilter((time) => time % 3 === 0))

    filteredStream$.then((value) => {
      console.log('every 3rd:', value)
    })

    for (let i = 1; i <= 10; i++) {
      stream$.next(`value${i}`)
    }

    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'every 3rd:', 'value3')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'every 3rd:', 'value6')
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'every 3rd:', 'value9')
    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })

  test('test skipFilter with unsubscribe', async () => {
    const stream$ = $()
    const filteredStream$ = stream$.pipe(skipFilter((time) => time > 1))

    filteredStream$.then((value) => {
      console.log('filtered:', value)
    })

    stream$.next('first')
    filteredStream$.unsubscribe()

    // Should not emit even after unsubscribe
    stream$.next('second')
    stream$.next('third')
    await sleep(1)
    expect(consoleSpy).not.toHaveBeenCalled()
  })
})
