import { Observable } from '../observable'

/**
 * Transform values from source observable using a projection function
 * @param project projection function to map source value
 * @returns Observable of projected values
 */
export const map =
  <T, R>(project: (value: T) => R | PromiseLike<R>) =>
  (observable$: Observable<T>): Observable<R> =>
    observable$.then<R>(project) as Observable<R>
