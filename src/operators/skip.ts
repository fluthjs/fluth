import { Observable } from '../observable'

/**
 * @description skip operator
 * @param skipTime skip time
 * @returns Observable
 */
export const skip =
  <T>(skipTime: number) =>
  (observable$: Observable<T>): Observable<T> => {
    let time = skipTime
    const newObservable$ = observable$.then(undefined, undefined, () => {
      if (time > 0) {
        time -= 1
        return false
      } else return true
    })
    return newObservable$ as Observable<T>
  }
