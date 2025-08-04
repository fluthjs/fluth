import { Observable } from '../observable'

/**
 * Only emit when the result of a getter function changes compared to the previous value
 * @param getter getter function to extract comparison value from source observable
 * @returns Observable that emits only when the extracted value changes
 */
export const change =
  <T, E = object>(getter: (value: T | undefined) => any) =>
  (observable$: Observable<T, E>): Observable<T, E> =>
    observable$.then<T>(undefined, undefined, undefined, getter) as Observable<T, E>
