import { Observable } from '../observable'

/**
 * @description delay operator
 * @param delayTime delay time
 * @returns Observable
 */
export const delay =
  <T, E = object>(delayTime: number) =>
  (observable$: Observable<T, E>) => {
    return observable$.then((value) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(value)
        }, delayTime)
      })
    }) as unknown as Observable<T, E>
  }
