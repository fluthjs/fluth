import { Observable } from '../observable'

/**
 * @description filter operator
 * @param filter filter function
 * @returns Observable
 */
export const skipFilter =
  <T, E = object>(filter: (time: number) => boolean) =>
  (observable$: Observable<T, E>): Observable<T, E> => {
    let time = 0
    const newObservable = observable$.then(undefined, undefined, () => {
      time += 1
      return filter(time)
    })
    return newObservable as Observable<T, E>
  }
