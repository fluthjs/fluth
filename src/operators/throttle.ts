import { Observable } from '../observable'

/**
 * @description throttle operator, last time will emit
 * @param observable
 * @param throttleTime
 * @returns Observable
 */
export const throttle =
  <T, E = object>(throttleTime: number) =>
  (observable$: Observable<T, E>): Observable<T, E> => {
    let lastTime = 0
    let timeout: ReturnType<typeof setTimeout> | null = null
    const newObservable$ = observable$.then(undefined, undefined, () => {
      const now = Date.now()
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      if (!lastTime || now - lastTime >= throttleTime) {
        lastTime = Date.now()
        return true
      } else {
        const remaining = throttleTime - (now - lastTime)
        timeout = setTimeout(() => {
          newObservable$.execute()
          lastTime = Date.now()
        }, remaining)
        return false
      }
    })
    newObservable$.afterUnsubscribe(() => (timeout = null))
    return newObservable$ as Observable<T, E>
  }
