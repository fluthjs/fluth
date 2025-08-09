import { Observable } from '../observable'
import { produce } from 'limu'
import { isObjectLike } from '../utils'

/**
 * Transform values from source observable using an immutable setter function
 * The setter function receives a draft of the source value and can mutate it directly
 * The operator returns a new observable with the modified immutable value
 * @param setter setter function to modify the draft value
 * @returns Observable of modified values using immutable operations
 */
export const set =
  <T>(setter: (value: T) => void) =>
  (observable$: Observable<T>): Observable<T> =>
    observable$.then((value: T) => {
      if (isObjectLike(value)) {
        return produce(value, setter)
      } else {
        // For primitive values, return the original value since they can't be mutated
        return value
      }
    }) as Observable<T>
