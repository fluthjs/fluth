import { Observable } from '../observable'

/**
 * Extract values from observable using a getter function
 * only Extract values changed, the get observer will be emitted
 * @param getter getter function to extract value from source observable
 * @returns Observable containing the extracted values
 */
export const get =
  <T, F, E = object>(getter: (value: T | undefined) => F) =>
  (observable$: Observable<T, E>): Observable<F, E> =>
    observable$
      // getter as differ, so the get observer will be executed only when getter result is changed
      .thenImmediate<T>(undefined, undefined, undefined, getter)
      .thenImmediate<F>(getter as any) as Observable<F, E>
