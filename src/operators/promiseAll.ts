import { Observable } from '../observable'
import { Stream } from '../stream'
import { StreamTupleValues, PromiseStatus } from '../types'
import { useUnsubscribeCallback } from '../utils'

/**
 * Internal implementation function for promiseAll variants
 * @param args$ - The input streams or Observables to be combined.
 * @param shouldAwait - Whether to wait for pending promises during status reset
 * @returns A stream that emits an array of values or a rejected promise.
 */
const promiseAllImpl = <T extends (Stream | Observable)[]>(
  args$: T,
  shouldAwait = true,
): Stream<StreamTupleValues<T>> => {
  const stream$ = new Stream<StreamTupleValues<T>>()
  const payload: StreamTupleValues<T> = [] as any
  const promiseStatus: PromiseStatus[] = [...Array(args$.length)].map(() => PromiseStatus.PENDING)
  let finishCount = 0
  const { unsubscribeCallback } = useUnsubscribeCallback(stream$, args$.length)
  const completeCallback = () => (finishCount += 1)

  const next = () => {
    if (promiseStatus.every((status) => status !== PromiseStatus.PENDING)) {
      stream$.next(
        promiseStatus.some((status) => status === PromiseStatus.REJECTED)
          ? Promise.reject([...payload])
          : [...payload],
        finishCount === args$.length,
      )
      promiseStatus.forEach((_, index) => {
        ;(promiseStatus as PromiseStatus[])[index] = PromiseStatus.PENDING
      })
    }
  }

  // check input type
  if (!args$.every((arg$) => arg$ instanceof Stream || arg$ instanceof Observable)) {
    throw new Error('promiseAll operator only accepts Stream or Observable as input')
  }

  // check input empty
  if (args$.length === 0) {
    return stream$
  }

  const resetPromiseStatus = () => {
    args$.forEach((arg$, index) => {
      if (arg$.status === PromiseStatus.PENDING && shouldAwait) {
        promiseStatus[index] = PromiseStatus.PENDING
        stream$.status = PromiseStatus.PENDING
      }
    })
  }

  args$.forEach((arg$, index) => {
    if (arg$._getFlag('_finishFlag')) {
      finishCount += 1
      payload[index] = arg$.value
      promiseStatus[index] = PromiseStatus.RESOLVED
    }
    arg$.afterUnsubscribe(unsubscribeCallback)
    arg$.afterComplete(completeCallback)
    const observable$ = arg$.then(
      (value) => {
        promiseStatus[index] = PromiseStatus.RESOLVED
        payload[index] = value
        resetPromiseStatus()
        next()
      },
      (value) => {
        promiseStatus[index] = PromiseStatus.REJECTED
        payload[index] = value
        resetPromiseStatus()
        next()
      },
    )
    stream$.afterUnsubscribe(() => {
      arg$.offUnsubscribe(unsubscribeCallback)
      arg$.offComplete(completeCallback)
      observable$.unsubscribe()
    })
  })

  stream$.afterComplete(() => {
    payload.length = 0
    promiseStatus.length = 0
  })

  Promise.resolve().then(() => {
    if (finishCount === args$.length) {
      stream$.complete()
    }
  })

  return stream$
}

/**
 * promiseAll takes multiple streams or Observables and returns a stream that emits an array of resolved values
 * from all input streams.
 * when Observable is pending, the output stream will also be pending.
 * If any input stream is rejected, the output stream will emit a rejected promise with the respective values.
 * The output stream will finish when all input streams finish.
 * When all input streams unsubscribe, the output stream will also unsubscribe.
 *
 * This version waits for pending promises during status reset (shouldAwait = true).
 *
 * @param {...Stream|Observable} args$ - The input streams or Observables to be combined.
 * @returns A stream that emits an array of values or a rejected promise.
 *
 * @example
 * const result = promiseAll(stream1, stream2, stream3)
 * // result type: Stream<[T1, T2, T3]> with perfect type inference
 */
export const promiseAll = <T extends (Stream | Observable)[]>(
  ...args$: T
): Stream<StreamTupleValues<T>> => {
  return promiseAllImpl(args$, true)
}

/**
 * promiseAllNoAwait is similar to promiseAll but does not wait for pending promises during status reset.
 * This can improve performance in scenarios where you don't need to wait for async operations to complete
 * before processing the next batch of values.
 *
 * @param {...Stream|Observable} args$ - The input streams or Observables to be combined.
 * @returns A stream that emits an array of values or a rejected promise.
 *
 * @example
 * const result = promiseAllNoAwait(stream1, stream2, stream3)
 * // result type: Stream<[T1, T2, T3]> with perfect type inference
 */
export const promiseAllNoAwait = <T extends (Stream | Observable)[]>(
  ...args$: T
): Stream<StreamTupleValues<T>> => {
  return promiseAllImpl(args$, false)
}
