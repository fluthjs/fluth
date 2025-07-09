import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, buffer } from '../../index'

describe('buffer operator test', async () => {
  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('basic usage', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    source$.next(1)
    source$.next(2)
    source$.next(3)
    expect(consoleSpy).not.toHaveBeenCalled()

    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer values:', [1, 2, 3])

    // Send more values
    source$.next(4)
    source$.next(5)
    trigger$.next('trigger again')

    // Should emit the newly collected values [4, 5]
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'buffer values:', [4, 5])
  })

  test('empty buffer', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    trigger$.next('trigger')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer values:', [])
  })

  test('source stream finish with buffered values', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    source$.next(1)
    source$.next(2)
    source$.next(3, true)

    // Based on current implementation, source finish doesn't auto-emit buffered values
    expect(consoleSpy).not.toHaveBeenCalled()
    trigger$.next('trigger')

    // Values remain buffered and can still be triggered later
    trigger$.next('trigger after source finish')
    expect(consoleSpy).toHaveBeenCalledWith('buffer values:', [1, 2, 3])
  })

  test('source stream finish without buffered values', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    // Finish the source stream without any values
    source$.complete()

    // No emission should happen
    expect(consoleSpy).not.toHaveBeenCalled()

    // Trigger after source finish should emit empty buffer
    trigger$.next('trigger after empty source finish')
    expect(consoleSpy).toHaveBeenCalledWith('buffer values:', [])
  })

  test('test trigger with finish', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.afterComplete(() => console.log('buffer finish'))
    trigger$.next('trigger', true)

    // Should emit the collected values and finish
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer finish')
  })

  test('test source with error', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    source$.next(1)
    source$.next(2)
    source$.next(Promise.reject('source error')) // This rejection is filtered out

    await sleep(1)

    trigger$.next('trigger')

    // Should emit only the resolved values [1, 2] (rejection was filtered out)
    expect(consoleSpy).toHaveBeenCalledWith('buffer values:', [1, 2])
  })

  test('test large buffer', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer length:', values.length)
    })

    const largeCount = 1000
    for (let i = 0; i < largeCount; i++) {
      source$.next(i)
    }

    trigger$.next('trigger')

    await sleep(10)

    // Should emit an array containing all values
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer length:', largeCount)
  })

  test('test continuous trigger', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    // Send a value
    source$.next(1)

    // Trigger rapidly in succession
    trigger$.next('trigger1')
    // Wait for processing to complete
    await sleep(10)
    // Should emit [1]
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer values:', [1])

    // Trigger again immediately, buffer should be empty now
    trigger$.next('trigger2')
    // Wait for processing to complete
    await sleep(10)
    // Should emit []
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'buffer values:', [])
  })

  test('source rejection filtering', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    source$.next(1)
    source$.next(Promise.reject('error1')) // This will be filtered out
    source$.next(2)
    source$.next(Promise.reject('error2')) // This will be filtered out
    source$.next(3)

    await sleep(1)

    trigger$.next('trigger')

    // Should only emit resolved values, rejections are filtered out
    expect(consoleSpy).toHaveBeenCalledWith('buffer values:', [1, 2, 3])
  })

  test('trigger rejection does not emit buffer', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    source$.next(1)
    source$.next(2)

    // Trigger with rejection - should not trigger buffer emission
    trigger$.next(Promise.reject('trigger error'))

    await sleep(10)

    // No emission should happen
    expect(consoleSpy).not.toHaveBeenCalled()

    // Now use a successful trigger
    trigger$.next('success')
    expect(consoleSpy).toHaveBeenCalledWith('buffer values:', [1, 2])
  })

  test('mixed source values with rejections', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    // Mix of successful values and rejections
    source$.next(1)
    source$.next(Promise.reject('error'))
    await sleep(1)
    source$.next(2)
    await sleep(1)
    source$.next(Promise.resolve(3))
    await sleep(1)
    source$.next(Promise.reject('another error'))
    await sleep(1)
    source$.next(4)

    trigger$.next('trigger')

    // Should emit only successfully resolved values [1, 2, 3, 4]
    expect(consoleSpy).toHaveBeenCalledWith('buffer values:', [1, 2, 3, 4])
  })

  test('multiple trigger rejections followed by success', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    source$.next(1)
    source$.next(2)

    // Multiple failed triggers
    trigger$.next(Promise.reject('error1'))
    trigger$.next(Promise.reject('error2'))

    await sleep(10)

    // Still no emission
    expect(consoleSpy).not.toHaveBeenCalled()

    // Successful trigger
    trigger$.next('success')
    expect(consoleSpy).toHaveBeenCalledWith('buffer values:', [1, 2])
  })

  test('buffer continues after rejection handling', async () => {
    const source$ = $()
    const trigger$ = $()
    const buffered$ = source$.pipe(buffer(trigger$))

    buffered$.then((values) => {
      console.log('buffer values:', values)
    })

    // First batch with rejections
    source$.next(1)
    source$.next(Promise.reject('error'))
    source$.next(2)

    trigger$.next('first')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'buffer values:', [1, 2])

    // Second batch with rejections
    source$.next(3)
    source$.next(Promise.reject('another error'))
    source$.next(4)

    trigger$.next('second')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'buffer values:', [3, 4])
  })
})
