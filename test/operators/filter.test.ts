import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, errorSpy, sleep } from '../utils'
import { $, filter } from '../../index'

describe('filter operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    errorSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('test filter method', async () => {
    const promise$ = $()
    promise$.pipe(filter((value) => value > 2)).then(() => console.log('test'))
    promise$.next(1)
    promise$.next(2)
    promise$.next(3)
    promise$.next(4)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test filter operator with value-based condition', async () => {
    const stream$ = $()
    // Only allow even numbers to pass through
    const filteredStream$ = stream$.pipe(
      filter((value) => typeof value === 'number' && value % 2 === 0),
    )

    filteredStream$.then((value) => {
      console.log('filtered:', value)
    })

    // Odd number - should be filtered out
    stream$.next(1)
    await sleep(1)
    expect(consoleSpy).not.toHaveBeenCalled()

    // Even number - should pass through
    stream$.next(2)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'filtered:', 2)

    // Odd number - should be filtered out
    stream$.next(3)
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledTimes(1)

    // Even number - should pass through
    stream$.next(4)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'filtered:', 4)

    // String - should be filtered out (not a number)
    stream$.next('test')
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('test filter with always true condition', async () => {
    const stream$ = $()
    const filteredStream$ = stream$.pipe(filter(() => true))

    filteredStream$.then((value) => {
      console.log('always pass:', value)
    })

    // All emissions should pass through
    stream$.next(1)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'always pass:', 1)

    stream$.next('test')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'always pass:', 'test')

    stream$.next(null)
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'always pass:', null)
  })

  test('test filter with always false condition', async () => {
    const stream$ = $()
    const filteredStream$ = stream$.pipe(filter(() => false))

    filteredStream$.then((value) => {
      console.log('never pass:', value)
    })

    // No emissions should pass through
    stream$.next(1)
    stream$.next('test')
    stream$.next(null)
    await sleep(1)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('test filter with type-based condition', async () => {
    const stream$ = $()
    // Only allow string values to pass through
    const filteredStream$ = stream$.pipe(filter((value) => typeof value === 'string'))

    filteredStream$.then((value) => {
      console.log('string only:', value)
    })

    stream$.next(1) // number, should be filtered out
    await sleep(1)
    expect(consoleSpy).not.toHaveBeenCalled()

    stream$.next('test') // string, should pass through
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'string only:', 'test')

    stream$.next(null) // null, should be filtered out
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledTimes(1)

    stream$.next('another') // string, should pass through
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'string only:', 'another')
  })

  test('test filter with complex object condition', async () => {
    const stream$ = $()
    // Only allow objects with a specific property
    const filteredStream$ = stream$.pipe(
      filter((value) => typeof value === 'object' && value !== null && 'id' in value),
    )

    filteredStream$.then((value) => {
      console.log('has id:', value)
    })

    stream$.next({ name: 'test' }) // no id property, should be filtered out
    await sleep(1)
    expect(consoleSpy).not.toHaveBeenCalled()

    stream$.next({ id: 1, name: 'test' }) // has id property, should pass through
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'has id:', { id: 1, name: 'test' })

    stream$.next(null) // null, should be filtered out
    await sleep(1)
    expect(consoleSpy).toHaveBeenCalledTimes(1)

    stream$.next({ id: 2 }) // has id property, should pass through
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'has id:', { id: 2 })
  })

  test('test filter with error handling', async () => {
    const stream$ = $()
    // Filter that throws an error
    const filteredStream$ = stream$.pipe(
      filter((value) => {
        if (value === 'error') {
          throw new Error('Test error')
        }
        return true
      }),
    )

    filteredStream$.then((value) => console.log('value:', value))

    // Normal value - should pass through
    stream$.next('normal')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'value:', 'normal')

    // Error-triggering value - should be caught by safeCallback
    // safeCallback logs to console.log, not console.error
    stream$.next('error')
    await sleep(1)
    expect(errorSpy).toHaveBeenCalledWith(new Error('Test error'))

    // Stream should continue working after error
    stream$.next('continue')
    await sleep(1)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'value:', 'continue')
  })
})
