import { Observable } from '../observable'

/**
 * @description debounce operator, first time will not emit immediately
 * @param observable
 * @param debounceTime
 * @returns Observable
 */
export const debounce =
  <T>(debounceTime: number) =>
  (observable$: Observable<T>): Observable<T> => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let execute = false
    const newObservable$ = observable$.then(undefined, undefined, () => {
      // if execute is true, it means the debounce time has reached, so we need to execute the observable
      if (execute) {
        execute = false
        return true
      }

      if (timer) {
        clearTimeout(timer)
        timer = null
      }

      // Natural completion via upstream finishFlag: flush the final value instead of swallowing it
      if (
        newObservable$._getProtectedProperty('_finishFlag') &&
        !newObservable$._getProtectedProperty('_unsubscribeFlag')
      ) {
        return true
      }

      timer = setTimeout(() => {
        timer = null
        execute = true
        newObservable$.execute()
      }, debounceTime)

      return false
    })
    newObservable$.afterUnsubscribe(() => {
      if (timer) clearTimeout(timer)
      timer = null
    })
    return newObservable$ as Observable<T>
  }
