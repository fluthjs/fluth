// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, consoleNode, consoleAll, delayNode, delayAll } from '../../index'

describe('PromiseLike Support', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  describe('Custom PromiseLike Objects', () => {
    test('should handle custom thenable objects in then callbacks', async () => {
      const customThenable = {
        then(onFulfilled: (value: any) => void) {
          setTimeout(() => onFulfilled('custom-value'), 10)
        },
      }

      const stream$ = $()
      stream$.then(() => customThenable).then((value: any) => console.log(value))
      stream$.next('test')
      await sleep(20)

      expect(consoleSpy).toHaveBeenCalledWith('custom-value')
    })

    test('should handle thenable objects that reject', async () => {
      const rejectingThenable = {
        then(onFulfilled: (value: any) => void, onRejected: (error: any) => void) {
          setTimeout(() => onRejected(new Error('custom-error')), 10)
        },
      }

      const stream$ = $()
      stream$
        .then(() => rejectingThenable)
        .catch((error: any) => console.log(`caught: ${error.message}`))
      stream$.next('test')
      await sleep(20)

      expect(consoleSpy).toHaveBeenCalledWith('caught: custom-error')
    })

    test('should work with jQuery-like promises', async () => {
      // Mock jQuery-style promise
      const jQueryPromise = {
        then(onFulfilled: (value: any) => void) {
          setTimeout(() => onFulfilled('jquery-result'), 10)
          return this
        },
        catch() {
          return this
        },
        always(callback: () => void) {
          setTimeout(callback, 15)
          return this
        },
      }

      const stream$ = $()
      stream$.then(() => jQueryPromise).then((value: any) => console.log(value))
      stream$.next('test')
      await sleep(20)

      expect(consoleSpy).toHaveBeenCalledWith('jquery-result')
    })
  })

  describe('Error Handling with PromiseLike', () => {
    test('should properly catch errors from custom thenable objects', async () => {
      const errorThenable = {
        then(onFulfilled: any, onRejected: (error: any) => void) {
          setTimeout(() => onRejected(new Error('thenable-error')), 10)
        },
      }

      const stream$ = $()
      stream$
        .then(() => errorThenable)
        .catch((error: any) => console.log(`caught: ${error.message}`))
      stream$.next('test')
      await sleep(20)

      expect(consoleSpy).toHaveBeenCalledWith('caught: thenable-error')
    })
  })

  describe('Function thenables, finally, cross-iframe Promise, and plugins', () => {
    test('should handle function thenable per Promises/A+ spec', async () => {
      const fnThenable: PromiseLike<string> = Object.assign(() => undefined, {
        then<TResult1 = string>(
          onFulfilled?: ((value: string) => TResult1 | PromiseLike<TResult1>) | null,
        ) {
          setTimeout(() => onFulfilled?.('fn-thenable-value'), 10)
          return fnThenable as unknown as PromiseLike<TResult1>
        },
      })

      const stream$ = $()
      stream$.then(() => fnThenable).then((value) => console.log(value))
      stream$.next('trigger')
      await sleep(20)

      expect(consoleSpy).toHaveBeenCalledWith('fn-thenable-value')
    })

    test('should handle custom thenable returned from finally (sync & async upstream)', async () => {
      const makeThenable = (val: string, delayMs = 10): PromiseLike<string> => {
        const thenable: PromiseLike<string> = {
          then<TResult1 = string>(
            onFulfilled?: ((value: string) => TResult1 | PromiseLike<TResult1>) | null,
          ) {
            setTimeout(() => onFulfilled?.(val), delayMs)
            return thenable as unknown as PromiseLike<TResult1>
          },
        }
        return thenable
      }

      const syncStream$ = $<string>()
      syncStream$
        .finally(() => makeThenable('finally-thenable') as any)
        .then((v) => console.log(`sync:${v}`))
      syncStream$.next('init')
      await sleep(20)
      expect(consoleSpy).toHaveBeenCalledWith('sync:finally-thenable')

      consoleSpy.mockClear()
      const asyncStream$ = $<string>()
      asyncStream$
        .then(() => makeThenable('upstream', 5))
        .finally(() => makeThenable('finally-thenable') as any)
        .then((v) => console.log(`async:${v}`))
      asyncStream$.next('init')
      await sleep(30)
      expect(consoleSpy).toHaveBeenCalledWith('async:finally-thenable')
    })

    test('should handle cross-iframe Promise in stream and observable', async () => {
      const iframe = document.createElement('iframe')
      document.body.appendChild(iframe)
      try {
        const win = iframe.contentWindow as Window & typeof globalThis
        const crossRealmPromise = win.Promise.resolve('from-iframe')
        expect(crossRealmPromise instanceof Promise).toBe(false)

        const stream$ = $('')
        const values: string[] = []
        stream$.then((v) => values.push(v))
        stream$.next(crossRealmPromise)
        await sleep(10)

        expect(values).toEqual(['from-iframe'])
      } finally {
        document.body.removeChild(iframe)
      }
    })

    test('should handle custom thenables in consoleNode, consoleAll, delayNode, and delayAll plugins', async () => {
      const makeThenable = (val: string) => ({
        then(onFulfilled: (v: string) => void) {
          setTimeout(() => onFulfilled(val), 5)
        },
      })

      const s1$ = $()
      s1$.use(consoleNode('node-ok', 'node-err'))
      s1$.next(makeThenable('v1'))
      await sleep(15)
      expect(consoleSpy).toHaveBeenCalledWith('node-ok', 'v1')

      consoleSpy.mockClear()
      const s2$ = $()
      s2$.use(consoleAll('all-ok', 'all-err'))
      s2$.next(makeThenable('v2'))
      await sleep(15)
      expect(consoleSpy).toHaveBeenCalledWith('all-ok', 'v2')

      const delayedNodeValues: string[] = []
      const s3$ = $()
      s3$.use(delayNode(20)).then((v) => delayedNodeValues.push(v))
      s3$.next(makeThenable('v3'))
      await sleep(15)
      expect(delayedNodeValues).toEqual([])
      await sleep(20)
      expect(delayedNodeValues).toEqual(['v3'])

      const delayedAllValues: string[] = []
      const s4$ = $()
      s4$.use(delayAll(20)).then((v) => delayedAllValues.push(v))
      s4$.next(makeThenable('v4'))
      await sleep(15)
      expect(delayedAllValues).toEqual([])
      await sleep(20)
      expect(delayedAllValues).toEqual(['v4'])
    })
  })
})
