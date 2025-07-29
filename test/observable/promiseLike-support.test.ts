import { describe, test, expect, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $ } from '../../index'

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
})
