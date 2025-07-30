import { expect, describe, test, beforeEach, afterEach, vi } from 'vitest'
import { getGlobalFluthFactory } from '../../src/utils'
import { Stream } from '../../src/stream'

describe('getGlobalFluthFactory test', () => {
  // Store original values to restore later
  let originalWindow: any
  let originalGlobal: any

  beforeEach(() => {
    // Store original references
    originalWindow = (globalThis as any).window
    originalGlobal = (globalThis as any).global

    // Clean up any existing factory
    if (typeof window !== 'undefined') {
      delete (window as any).__fluth_global_factory__
    }
    if (typeof global !== 'undefined') {
      delete (global as any).__fluth_global_factory__
    }
  })

  afterEach(() => {
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

  test('should return undefined when no global factory is set', () => {
    const factory = getGlobalFluthFactory()
    expect(factory).toBeUndefined()
  })

  test('should return globalThis factory when available', () => {
    // Mock globalThis environment (highest priority)
    const mockFactory = vi.fn(() => new Stream())
    ;(globalThis as any).__fluth_global_factory__ = mockFactory

    const factory = getGlobalFluthFactory()
    expect(factory).toBe(mockFactory)

    // Clean up
    delete (globalThis as any).__fluth_global_factory__
  })

  test('should return undefined when globalThis factory not set but window has factory', () => {
    // Ensure globalThis doesn't have the factory
    delete (globalThis as any).__fluth_global_factory__

    // Mock browser environment
    const mockFactory = vi.fn(() => new Stream())
    ;(globalThis as any).window = {
      __fluth_global_factory__: mockFactory,
    }

    // In modern environments, globalThis always exists, so it will return undefined
    // even if window has the factory
    const factory = getGlobalFluthFactory()
    expect(factory).toBeUndefined()
  })

  test('should return undefined when globalThis factory not set but global has factory', () => {
    // Ensure globalThis doesn't have the factory
    delete (globalThis as any).__fluth_global_factory__

    // Mock Node.js environment
    const mockFactory = vi.fn(() => new Stream())
    ;(globalThis as any).global = {
      __fluth_global_factory__: mockFactory,
    }

    // In modern environments, globalThis always exists, so it will return undefined
    // even if global has the factory
    const factory = getGlobalFluthFactory()
    expect(factory).toBeUndefined()
  })

  test('should return undefined when globalThis factory not set but self has factory', () => {
    // Ensure globalThis doesn't have the factory
    delete (globalThis as any).__fluth_global_factory__

    // Mock self environment (web worker)
    const mockFactory = vi.fn(() => new Stream())
    ;(globalThis as any).self = {
      __fluth_global_factory__: mockFactory,
    }

    // In modern environments, globalThis always exists, so it will return undefined
    // even if self has the factory
    const factory = getGlobalFluthFactory()
    expect(factory).toBeUndefined()
  })

  test('should prioritize globalThis over all other environments', () => {
    // Mock all environments
    const globalThisFactory = vi.fn(() => new Stream())
    const windowFactory = vi.fn(() => new Stream())
    const globalFactory = vi.fn(() => new Stream())
    const selfFactory = vi.fn(() => new Stream())

    ;(globalThis as any).__fluth_global_factory__ = globalThisFactory
    ;(globalThis as any).window = {
      __fluth_global_factory__: windowFactory,
    }
    ;(globalThis as any).global = {
      __fluth_global_factory__: globalFactory,
    }
    ;(globalThis as any).self = {
      __fluth_global_factory__: selfFactory,
    }

    const factory = getGlobalFluthFactory()
    expect(factory).toBe(globalThisFactory)
    expect(factory).not.toBe(windowFactory)
    expect(factory).not.toBe(globalFactory)
    expect(factory).not.toBe(selfFactory)

    // Clean up
    delete (globalThis as any).__fluth_global_factory__
  })

  test('should return undefined when globalThis factory not set regardless of other environments', () => {
    // Ensure globalThis doesn't have the factory
    delete (globalThis as any).__fluth_global_factory__

    const windowFactory = vi.fn(() => new Stream())
    const globalFactory = vi.fn(() => new Stream())
    const selfFactory = vi.fn(() => new Stream())

    ;(globalThis as any).window = {
      __fluth_global_factory__: windowFactory,
    }
    ;(globalThis as any).global = {
      __fluth_global_factory__: globalFactory,
    }
    ;(globalThis as any).self = {
      __fluth_global_factory__: selfFactory,
    }

    // In modern environments, globalThis always exists, so it will return undefined
    // regardless of what's in window, global, or self
    const factory = getGlobalFluthFactory()
    expect(factory).toBeUndefined()
  })

  test('should return null when factory is explicitly set to null', () => {
    ;(globalThis as any).__fluth_global_factory__ = null

    const factory = getGlobalFluthFactory()
    expect(factory).toBeNull()

    // Clean up
    delete (globalThis as any).__fluth_global_factory__
  })

  test('should return undefined when no environment has factory', () => {
    delete (globalThis as any).__fluth_global_factory__
    delete (globalThis as any).window
    delete (globalThis as any).global
    delete (globalThis as any).self

    const factory = getGlobalFluthFactory()
    expect(factory).toBeUndefined()
  })
})
