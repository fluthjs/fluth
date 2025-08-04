import { Observable } from '../observable'

/**
 * @description skip operator
 * @param skipTime skip time
 * @returns Observable
 */
export const skip =
  <T, E = object>(skipTime: number) =>
  (observable$: Observable<T, E>): Observable<T, E> => {
    let time = skipTime
    const newObservable$ = observable$.then(undefined, undefined, () => {
      if (time > 0) {
        time -= 1
        return false
      } else return true
    })
    return newObservable$ as Observable<T, E>
  }
