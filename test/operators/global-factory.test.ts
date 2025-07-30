import { expect, describe, test, beforeEach, afterEach, vi } from 'vitest'
import { consoleSpy } from '../utils'
import { Stream } from '../../src/stream'
import {
  fork,
  combine,
  merge,
  concat,
  finish,
  promiseAll,
  promiseRace,
  partition,
  audit,
  buffer,
} from '../../src/operators'
import { $ } from '../../index'

describe('Global Factory Test', () => {
  let mockFactory: ReturnType<typeof vi.fn>
  let mockStream: Stream<any>
  let originalWindow: any
  let originalGlobal: any

  beforeEach(() => {
    process.on('unhandledRejection', () => null)
    vi.useFakeTimers()
    consoleSpy.mockClear()
    process.setMaxListeners(100)

    // Store original references
    originalWindow = (globalThis as any).window
    originalGlobal = (globalThis as any).global

    // Create mock factory and stream
    mockStream = new Stream()
    mockFactory = vi.fn(() => mockStream)

    // Setup mock environment - use globalThis for highest priority
    ;(globalThis as any).__fluth_global_factory__ = mockFactory
  })

  afterEach(() => {
    vi.useRealTimers()

    // Clean up globalThis factory
    delete (globalThis as any).__fluth_global_factory__

    // Restore original values
    if (originalWindow !== undefined) {
      ;(globalThis as any).window = originalWindow
    } else {
      delete (globalThis as any).window
    }

    if (originalGlobal !== undefined) {
      ;(globalThis as any).global = originalGlobal
    } else {
      delete (globalThis as any).global
    }
  })

  describe('Operator Integration Tests', () => {
    test('fork operator should use global factory when available', () => {
      const source$ = $()
      const result$ = fork(source$)

      expect(mockFactory).toHaveBeenCalledTimes(1)
      expect(result$).toBe(mockStream)
    })

    test('combine operator should use global factory when available', () => {
      const source1$ = $()
      const source2$ = $()

      combine(source1$, source2$)

      expect(mockFactory).toHaveBeenCalledTimes(1)
    })

    test('merge operator should use global factory when available', () => {
      const source1$ = $()
      const source2$ = $()

      merge(source1$, source2$)

      expect(mockFactory).toHaveBeenCalledTimes(1)
    })

    test('concat operator should use global factory when available', () => {
      const source1$ = $()
      const source2$ = $()

      concat(source1$, source2$)

      expect(mockFactory).toHaveBeenCalledTimes(1)
    })

    test('finish operator should use global factory when available', () => {
      const source1$ = $()
      const source2$ = $()

      finish(source1$, source2$)

      expect(mockFactory).toHaveBeenCalledTimes(1)
    })

    test('promiseAll operator should use global factory when available', () => {
      const source1$ = $()
      const source2$ = $()

      promiseAll(source1$, source2$)

      expect(mockFactory).toHaveBeenCalledTimes(1)
    })

    test('promiseRace operator should use global factory when available', () => {
      const source1$ = $()
      const source2$ = $()

      promiseRace(source1$, source2$)

      expect(mockFactory).toHaveBeenCalledTimes(1)
    })

    test('partition operator should use global factory when available', () => {
      const source$ = $()

      partition(source$, (value) => value > 5)

      // partition creates two streams + one for finish operator, so factory should be called 3 times
      expect(mockFactory).toHaveBeenCalledTimes(3)
    })

    test('audit operator should use global factory when available', () => {
      const trigger$ = $()
      const source$ = $()

      source$.pipe(audit(trigger$))

      expect(mockFactory).toHaveBeenCalledTimes(1)
    })

    test('buffer operator should use global factory when available', () => {
      const trigger$ = $()
      const source$ = $()

      source$.pipe(buffer(trigger$))

      expect(mockFactory).toHaveBeenCalledTimes(1)
    })

    test('multiple operators can share the same global factory', () => {
      const source1$ = $()
      const source2$ = $()

      fork(source1$)
      merge(source1$, source2$)
      combine(source1$, source2$)

      // Should be called once for each operator
      expect(mockFactory).toHaveBeenCalledTimes(3)
    })
  })

  describe('Functional Behavior Tests', () => {
    test('global factory streams should work functionally like regular streams', async () => {
      // Create a factory that tracks creation
      const createdStreams: Stream<any>[] = []
      const trackingFactory = () => {
        const stream = new Stream()
        createdStreams.push(stream)
        return stream
      }

      ;(globalThis as any).__fluth_global_factory__ = trackingFactory

      const source$ = $()
      const forked$ = fork(source$)

      // Verify factory was used
      expect(createdStreams).toHaveLength(1)
      expect(forked$).toBe(createdStreams[0])

      // Test functional behavior
      forked$.then((value) => console.log('result:', value))

      source$.next('test-value')
      expect(consoleSpy).toHaveBeenCalledWith('result:', 'test-value')

      source$.next('another-value')
      expect(consoleSpy).toHaveBeenCalledWith('result:', 'another-value')
    })

    test('global factory can inject reactive behavior', async () => {
      // Simulate a reactive stream factory (like Vue's reactive)
      class ReactiveStream<T> extends Stream<T> {
        private _reactiveValue: T | undefined

        get reactiveValue() {
          return this._reactiveValue
        }

        next(value: T, finish?: boolean): void {
          this._reactiveValue = value
          super.next(value, finish)
        }
      }

      const reactiveFactory = () => new ReactiveStream()
      ;(globalThis as any).__fluth_global_factory__ = reactiveFactory

      const source$ = $()
      const reactive$ = fork(source$) as ReactiveStream<string>

      source$.next('reactive-test')

      expect(reactive$.reactiveValue).toBe('reactive-test')
    })

    test('custom factory can create enhanced streams', async () => {
      // Create a custom factory that adds extra functionality
      class CustomStream<T> extends Stream<T> {
        customProperty = 'custom'

        customMethod() {
          return 'enhanced'
        }
      }

      const customFactory = vi.fn(() => new CustomStream())
      ;(globalThis as any).__fluth_global_factory__ = customFactory

      const source$ = $()
      const result$ = fork(source$) as CustomStream<any>

      expect(customFactory).toHaveBeenCalledTimes(1)
      expect(result$.customProperty).toBe('custom')
      expect(result$.customMethod()).toBe('enhanced')
    })

    test('global factory with complex inheritance chain', async () => {
      class BaseEnhancedStream<T> extends Stream<T> {
        baseFeature = true
      }

      class AdvancedStream<T> extends BaseEnhancedStream<T> {
        advancedFeature = 'advanced'

        process(value: T) {
          console.log('processing:', value)
          return value
        }
      }

      const advancedFactory = () => new AdvancedStream()
      ;(globalThis as any).__fluth_global_factory__ = advancedFactory

      const source$ = $()
      const enhanced$ = fork(source$) as AdvancedStream<string>

      expect(enhanced$.baseFeature).toBe(true)
      expect(enhanced$.advancedFeature).toBe('advanced')

      enhanced$.then((value) => enhanced$.process(value))
      source$.next('inheritance-test')

      expect(consoleSpy).toHaveBeenCalledWith('processing:', 'inheritance-test')
    })
  })

  describe('Fallback Behavior Tests', () => {
    test('operators should fall back to default Stream when no global factory', () => {
      // Remove global factory from all environments
      delete (globalThis as any).__fluth_global_factory__
      delete (globalThis as any).window
      delete (globalThis as any).global
      delete (globalThis as any).self

      const source$ = $()
      const result$ = fork(source$)

      // Should not call mock factory
      expect(mockFactory).not.toHaveBeenCalled()
      // Should create a new Stream instance
      expect(result$).toBeInstanceOf(Stream)
      expect(result$).not.toBe(mockStream)
    })

    test('operators work correctly without global factory', async () => {
      // Ensure no global factory in all environments
      delete (globalThis as any).__fluth_global_factory__
      delete (globalThis as any).window
      delete (globalThis as any).global
      delete (globalThis as any).self

      const source$ = $()
      const forked$ = fork(source$)

      forked$.then((value) => console.log('default:', value))

      source$.next('default-test')
      expect(consoleSpy).toHaveBeenCalledWith('default:', 'default-test')
      expect(forked$).toBeInstanceOf(Stream)
    })

    test('factory returning null should fall back to default Stream', () => {
      const nullFactory = () => null

      ;(globalThis as any).__fluth_global_factory__ = nullFactory

      const source$ = $()
      const result$ = fork(source$)

      expect(result$).toBeInstanceOf(Stream)
    })

    test('factory returning undefined should fall back to default Stream', () => {
      const undefinedFactory = () => undefined

      ;(globalThis as any).__fluth_global_factory__ = undefinedFactory

      const source$ = $()
      const result$ = fork(source$)

      expect(result$).toBeInstanceOf(Stream)
    })
  })

  describe('Context and Call Testing', () => {
    test('global factory is called with correct context', () => {
      const source$ = $()
      fork(source$)

      expect(mockFactory).toHaveBeenCalledWith()
      expect(mockFactory).toHaveBeenCalledTimes(1)
    })

    test('global factory called multiple times should create different instances', () => {
      const instances: Stream<any>[] = []
      const multiInstanceFactory = () => {
        const instance = new Stream()
        instances.push(instance)
        return instance
      }

      ;(globalThis as any).__fluth_global_factory__ = multiInstanceFactory

      const source$ = $()
      const fork1$ = fork(source$)
      const fork2$ = fork(source$)

      expect(instances).toHaveLength(2)
      expect(fork1$).toBe(instances[0])
      expect(fork2$).toBe(instances[1])
      expect(fork1$).not.toBe(fork2$)
    })
  })
})
