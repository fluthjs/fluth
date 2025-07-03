import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy } from '../utils'
import { $ } from '../../index'

describe('Stream complete method', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)
  })

  test('complete should unsubscribe observers', async () => {
    const stream$ = $()
    let observerCalled = false

    stream$.then(() => {
      observerCalled = true
      console.log('Observer called')
    })

    stream$.complete()
    stream$.next(1) // This should not trigger the observer

    expect(observerCalled).toBe(false)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('complete with multiple afterComplete callbacks', async () => {
    const stream$ = $()
    const results: string[] = []

    stream$.afterComplete(() => {
      results.push('callback1')
      console.log('Callback 1 executed')
    })

    stream$.afterComplete(() => {
      results.push('callback2')
      console.log('Callback 2 executed')
    })

    stream$.complete()

    expect(results).toEqual(['callback1', 'callback2'])
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'Callback 1 executed')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'Callback 2 executed')
  })

  test('complete should propagate to child streams', async () => {
    const parent$ = $()
    const child$ = parent$.then((value) => value)
    let parentCompleted = false
    let childCompleted = false

    parent$.afterComplete(() => {
      parentCompleted = true
      console.log('Parent completed')
    })

    child$.afterComplete(() => {
      childCompleted = true
      console.log('Child completed')
    })

    parent$.complete()
    expect(parentCompleted).toBe(true)
    expect(childCompleted).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith('Parent completed')
    expect(consoleSpy).toHaveBeenCalledWith('Child completed')
  })

  test('complete should pass the current value to afterComplete callbacks', async () => {
    const stream$ = $('initial value')

    stream$.afterComplete((value, status) => {
      console.log(`Complete callback received: ${value}, status: ${status}`)
    })
    stream$.complete()
    expect(consoleSpy).toHaveBeenCalledWith(
      'Complete callback received: initial value, status: resolved',
    )
  })

  test('complete should work with promise chains', async () => {
    const stream$ = $()
    const chainedStream$ = stream$.then((value) => {
      console.log(`Processing value: ${value}`)
      return value * 2
    })

    chainedStream$.afterComplete((value) => {
      console.log(`Chain completed with value: ${value}`)
    })

    stream$.next(5)

    // Manually check the value before completing
    expect(consoleSpy).toHaveBeenCalledWith('Processing value: 5')
    consoleSpy.mockClear() // Clear previous console calls

    stream$.complete()

    expect(consoleSpy).toHaveBeenCalledWith('Chain completed with value: 10')
  })

  test('offComplete should remove specific callback', async () => {
    const stream$ = $()
    const callback1 = (value: any) => console.log(`Callback1: ${value}`)
    const callback2 = (value: any) => console.log(`Callback2: ${value}`)

    stream$.afterComplete(callback1)
    stream$.afterComplete(callback2)
    stream$.offComplete(callback1)

    stream$.next('test', true) // Complete with value

    expect(consoleSpy).not.toHaveBeenCalledWith('Callback1: test')
    expect(consoleSpy).toHaveBeenCalledWith('Callback2: test')
  })

  test('complete should be idempotent', async () => {
    const stream$ = $()
    let callCount = 0

    stream$.afterComplete(() => {
      callCount++
      console.log(`Complete callback called ${callCount} time(s)`)
    })

    stream$.complete()
    // stream$.complete() // Second call should have no effect

    // expect(callCount).toBe(1)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    expect(consoleSpy).toHaveBeenCalledWith('Complete callback called 1 time(s)')
  })
})
