import { Observable } from '../observable'

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
  newObservable$.afterUnsubscribe(() => (timer = null))
  return newObservable$
}
