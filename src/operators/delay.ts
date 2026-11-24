import { Observable } from '../observable'

/**
 * @description delay operator
 * @param delayTime delay time
 * @returns Observable
 */
export const delay =
  <T>(delayTime: number) =>
  (observable$: Observable<T>): Observable<T> => {
    return observable$.then((value) => {
      return new Promise<T>((resolve) => {
        setTimeout(() => {
          resolve(value)
        }, delayTime)
      })
    }) as Observable<T>
  }
