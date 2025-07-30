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

  test('should return window factory in browser environment', () => {
    // Mock browser environment
    const mockFactory = vi.fn(() => new Stream())
    ;(globalThis as any).window = {
      __fluth_global_factory__: mockFactory,
    }
    delete (globalThis as any).global

    const factory = getGlobalFluthFactory()
    expect(factory).toBe(mockFactory)
  })

  test('should return global factory in Node.js environment', () => {
    // Mock Node.js environment
    const mockFactory = vi.fn(() => new Stream())
    delete (globalThis as any).window
    ;(globalThis as any).global = {
      __fluth_global_factory__: mockFactory,
    }

    const factory = getGlobalFluthFactory()
    expect(factory).toBe(mockFactory)
  })

  test('should prioritize window over global when both exist', () => {
    // Mock both environments
    const windowFactory = vi.fn(() => new Stream())
    const globalFactory = vi.fn(() => new Stream())

    ;(globalThis as any).window = {
      __fluth_global_factory__: windowFactory,
    }
    ;(globalThis as any).global = {
      __fluth_global_factory__: globalFactory,
    }

    const factory = getGlobalFluthFactory()
    expect(factory).toBe(windowFactory)
    expect(factory).not.toBe(globalFactory)
  })

  test('should return undefined when factory is null', () => {
    ;(globalThis as any).window = {
      __fluth_global_factory__: null,
    }

    const factory = getGlobalFluthFactory()
    expect(factory).toBeNull()
  })

  test('should return undefined when neither window nor global exists', () => {
    delete (globalThis as any).window
    delete (globalThis as any).global

    const factory = getGlobalFluthFactory()
    expect(factory).toBeUndefined()
  })
})
