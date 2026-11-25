// @vitest-environment jsdom
import { describe, test, expect } from 'vitest'
import { isObjectLike, isPromiseLike } from '../../src/utils'

describe('utils', () => {
  describe('isObjectLike', () => {
    test('returns true for plain objects, null-prototype objects, arrays, Map, and Set', () => {
      expect(isObjectLike({})).toBe(true)
      expect(isObjectLike({ a: 1 })).toBe(true)
      expect(isObjectLike(Object.create(null))).toBe(true)
      expect(isObjectLike([])).toBe(true)
      expect(isObjectLike([1, 2, 3])).toBe(true)
      expect(isObjectLike(new Map())).toBe(true)
      expect(isObjectLike(new Set())).toBe(true)
    })

    test('returns false for primitives, null, undefined, functions, Date, and RegExp', () => {
      expect(isObjectLike(null)).toBe(false)
      expect(isObjectLike(undefined)).toBe(false)
      expect(isObjectLike(0)).toBe(false)
      expect(isObjectLike(42)).toBe(false)
      expect(isObjectLike('')).toBe(false)
      expect(isObjectLike('hello')).toBe(false)
      expect(isObjectLike(false)).toBe(false)
      expect(isObjectLike(true)).toBe(false)
      expect(isObjectLike(Symbol('s'))).toBe(false)
      expect(isObjectLike(BigInt(1))).toBe(false)
      expect(isObjectLike(() => ({}))).toBe(false)
      expect(isObjectLike(new Date())).toBe(false)
      expect(isObjectLike(/abc/)).toBe(false)
    })

    test('handles cross-iframe objects, arrays, Map, and Set', () => {
      const iframe = document.createElement('iframe')
      document.body.appendChild(iframe)
      try {
        const win = iframe.contentWindow as Window & typeof globalThis
        expect(isObjectLike(win.eval('({ a: 1 })'))).toBe(true)
        expect(isObjectLike(win.eval('[1, 2]'))).toBe(true)
        expect(isObjectLike(win.eval('new Map()'))).toBe(true)
        expect(isObjectLike(win.eval('new Set()'))).toBe(true)
        expect(isObjectLike(win.eval('new Date()'))).toBe(false)
      } finally {
        document.body.removeChild(iframe)
      }
    })
  })

  describe('isPromiseLike', () => {
    test('returns true for native Promises and custom thenables', async () => {
      expect(isPromiseLike(Promise.resolve(1))).toBe(true)
      const rejected = Promise.reject(new Error('err'))
      rejected.catch(() => undefined)
      expect(isPromiseLike(rejected)).toBe(true)

      const objectThenable = { then: (resolve: (v: number) => void) => resolve(1) }
      expect(isPromiseLike(objectThenable)).toBe(true)

      const nullProtoThenable = Object.assign(Object.create(null), {
        then: (resolve: (v: number) => void) => resolve(2),
      })
      expect(isPromiseLike(nullProtoThenable)).toBe(true)

      const fnThenable = Object.assign(() => undefined, {
        then: (resolve: (v: number) => void) => resolve(3),
      })
      expect(isPromiseLike(fnThenable)).toBe(true)
    })

    test('returns strict boolean false for non-thenables', () => {
      expect(isPromiseLike(null)).toBe(false)
      expect(isPromiseLike(undefined)).toBe(false)
      expect(isPromiseLike(0)).toBe(false)
      expect(isPromiseLike('')).toBe(false)
      expect(isPromiseLike(false)).toBe(false)
      expect(isPromiseLike(true)).toBe(false)
      expect(isPromiseLike(123)).toBe(false)
      expect(isPromiseLike('then')).toBe(false)
      expect(isPromiseLike({})).toBe(false)
      expect(isPromiseLike({ then: true })).toBe(false)
      expect(isPromiseLike({ then: 'not-a-fn' })).toBe(false)
      expect(isPromiseLike(() => undefined)).toBe(false)
    })

    test('returns true for cross-iframe Promise where instanceof Promise is false', async () => {
      const iframe = document.createElement('iframe')
      document.body.appendChild(iframe)
      try {
        const win = iframe.contentWindow as Window & typeof globalThis
        const crossRealmPromise = win.Promise.resolve('cross-realm')
        expect(crossRealmPromise instanceof Promise).toBe(false)
        expect(isPromiseLike(crossRealmPromise)).toBe(true)
        await expect(crossRealmPromise).resolves.toBe('cross-realm')
      } finally {
        document.body.removeChild(iframe)
      }
    })
  })
})
