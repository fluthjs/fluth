import { Observable } from '../observable'

/**
 * Only emit when the result of a getter function changes compared to the previous value
 * @param getter getter function to extract comparison value from source observable
 * @returns Observable that emits only when the extracted value changes
 */
export const change =
  <T>(getter: (value: T | undefined) => any) =>
  (observable$: Observable<T>): Observable<T> =>
    observable$.then<T>(undefined, undefined, undefined, getter) as Observable<T>
