import { Observable } from '../observable'

/**
 * @description delay operator
 * @param delayTime delay time
 * @returns Observable
 */
export const delay =
  <T>(delayTime: number) =>
  (observable$: Observable<T>): Observable<T> => {
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const newObservable$ = observable$.then((value) => {
      return new Promise<T>((resolve) => {
        const timer = setTimeout(() => {
          timers.delete(timer)
          resolve(value)
        }, delayTime)
        timers.add(timer)
      })
    })
    newObservable$.afterUnsubscribe(() => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    })
    return newObservable$ as Observable<T>
  }
