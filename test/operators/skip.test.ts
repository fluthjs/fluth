import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, skip } from '../../index'

describe('skip operator test', () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test skip method without param', () => {
    const promise$ = $()
    const observable$ = promise$.then()
    observable$.pipe(skip(1)).then(() => console.log('test'))
    promise$.next(1)
    expect(consoleSpy).toHaveBeenCalledTimes(0)
    promise$.next(2)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  test('test skip method with param', () => {
    const promise$ = $()
    const observable$ = promise$.then()
    observable$.pipe(skip(2)).then(() => console.log('test'))
    promise$.next(1)
    promise$.next(2)
    promise$.next(3)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  test('test skip operator', () => {
    const stream$ = $()
    const skippedStream$ = stream$.pipe(skip(2))

    skippedStream$.then((value) => {
      console.log('skipped:', value)
    })

    // First two emissions should be skipped
    stream$.next(1)
    stream$.next(2)
    expect(consoleSpy).not.toHaveBeenCalled()

    // Third emission should pass through
    stream$.next(3)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'skipped:', 3)

    // Subsequent emissions should also pass through
    stream$.next(4)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'skipped:', 4)
  })

  test('test skip with zero count', () => {
    const stream$ = $()
    const skippedStream$ = stream$.pipe(skip(0))

    skippedStream$.then((value) => {
      console.log('not skipped:', value)
    })

    // All emissions should pass through
    stream$.next(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'not skipped:', 1)

    stream$.next(2)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'not skipped:', 2)
  })

  test('test skip with large count', () => {
    const stream$ = $()
    const skippedStream$ = stream$.pipe(skip(5))

    skippedStream$.then((value) => {
      console.log('after skip:', value)
    })

    // Emit less than skip count
    stream$.next(1)
    stream$.next(2)
    stream$.next(3)
    expect(consoleSpy).not.toHaveBeenCalled()

    // Emit exactly skip count
    stream$.next(4)
    stream$.next(5)
    expect(consoleSpy).not.toHaveBeenCalled()

    // Emit after skip count
    stream$.next(6)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'after skip:', 6)
  })

  test('test skip with rejected promises', async () => {
    const stream$ = $()
    const skippedStream$ = stream$.pipe(skip(1))

    skippedStream$.then(
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
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'resolved:', 'success')
  })

  test('test skip with unsubscribe', () => {
    const stream$ = $()
    const skippedStream$ = stream$.pipe(skip(2))

    skippedStream$.then((value) => {
      console.log('skipped:', value)
    })

    stream$.next(1)
    skippedStream$.unsubscribe()

    // Should not emit even after unsubscribe
    stream$.next(2)
    stream$.next(3)
    expect(consoleSpy).not.toHaveBeenCalled()
  })
})
