import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy } from '../utils'
import { Observable } from '../../src/observable'
import { Stream } from '../../src/stream'

describe('Observable constructor edge cases', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
  })

  test('should handle constructor with no parameters', () => {
    // Test constructor with no parameters
    const observable = new Observable()
    expect(observable.value).toBeUndefined()
    expect(observable.status).toBeNull()
    expect((observable as any)._root).toBeNull()
  })

  test('should handle constructor with Stream parameter', () => {
    // Test constructor with Stream parameter
    const stream = new Stream()
    const observable = new Observable(stream)
    expect((observable as any)._root).toBe(stream)
  })

  test('should handle constructor with Observable parameter', () => {
    // Test constructor with Observable parameter (child observable)
    const parentStream = new Stream()
    const parentObservable = new Observable(parentStream)
    const childObservable = new Observable(parentObservable)

    expect((childObservable as any)._root).toBe(parentStream)
  })

  test('should handle nested observable construction', () => {
    // Test deeply nested observable construction
    const stream = new Stream()
    const level1 = new Observable(stream)
    const level2 = new Observable(level1)
    const level3 = new Observable(level2)

    expect((level3 as any)._root).toBe(stream)
    expect((level2 as any)._root).toBe(stream)
    expect((level1 as any)._root).toBe(stream)
  })

  test('should handle constructor with invalid parameter', () => {
    // Test constructor with invalid parameter (should not throw)
    const observable = new Observable(null as any)
    expect(observable.value).toBeUndefined()
    expect(observable.status).toBeNull()
  })

  test('should handle constructor with undefined parameter', () => {
    // Test constructor with undefined parameter
    const observable = new Observable(undefined)
    expect(observable.value).toBeUndefined()
    expect(observable.status).toBeNull()
  })

  test('should handle constructor with empty object parameter', () => {
    // Test constructor with empty object parameter
    const observable = new Observable({} as any)
    expect(observable.value).toBeUndefined()
    expect(observable.status).toBeNull()
  })

  test('should handle constructor with function parameter', () => {
    // Test constructor with function parameter
    const testFn = () => console.log('test')
    const observable = new Observable(testFn as any)
    expect(observable.value).toBeUndefined()
    expect(observable.status).toBeNull()
  })

  test('should handle constructor with primitive parameter', () => {
    // Test constructor with primitive parameter
    const observable = new Observable('string' as any)
    expect(observable.value).toBeUndefined()
    expect(observable.status).toBeNull()
  })

  test('should handle constructor with number parameter', () => {
    // Test constructor with number parameter
    const observable = new Observable(123 as any)
    expect(observable.value).toBeUndefined()
    expect(observable.status).toBeNull()
  })

  test('should handle constructor with boolean parameter', () => {
    // Test constructor with boolean parameter
    const observable = new Observable(true as any)
    expect(observable.value).toBeUndefined()
    expect(observable.status).toBeNull()
  })
})
