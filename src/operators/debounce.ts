import { Observable } from '../observable'
import { debugLog } from '../utils'

/**
 * @description debounce operator, first time will not emit immediately
 * @param observable
 * @param debounceTime
 * @returns Observable
 */
export const debounce = (debounceTime: number) => (observable$: Observable) => {
  let timer: number | null = null
  let execute = false
  const newObservable$ = observable$.then(undefined, undefined, () => {
    // if execute is true, it means the debounce time has reached, so we need to execute the observable
    if (execute) {
      execute = false
      return true
    }

    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      timer = null
      execute = true
      newObservable$.execute()
    }, debounceTime)

    return false
  })
  newObservable$.afterUnsubscribe(() => {
    if (timer) {
      debugLog('debounce: unsubscribe, clear pending timer')
      clearTimeout(timer)
    }
    timer = null
  })
  return newObservable$
}
