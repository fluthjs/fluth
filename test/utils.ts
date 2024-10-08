import { vi } from 'vitest'
import { Stream } from '../index'

export const consoleSpy = vi.spyOn(console, 'log')
export const sleep = (time: number) => vi.advanceTimersByTimeAsync(time)
export const promiseFactory = (time: number, data: string, flag = true) =>
  new Promise((resolve, reject) =>
    setTimeout(() => (flag ? resolve(data) : reject(data)), time),
  )
export const promiseConsoleFactory = (time: number, data: string) =>
  promiseFactory(time, data).then(
    (data) => console.log(data),
    (error) => console.log(error),
  )
export const streamFactory = () => {
  const promise$ = new Stream()
  const subjection$ = promise$.then(
    (data) => Promise.resolve(data),
    (data) => Promise.reject(data),
  )
  return { promise$, subjection$ }
}
