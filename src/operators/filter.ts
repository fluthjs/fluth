import { Observable } from '../observable'

/**
 * Given a condition, the observer will be executed only when condition is true
 * @param condition condition function, given cur observer value
 * @returns Observable
 */
export const filter =
  <T>(condition: (value: T) => boolean) =>
  (observable$: Observable<T>): Observable<T> =>
    observable$.then(undefined, undefined, condition) as Observable<T>
