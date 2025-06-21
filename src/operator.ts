import { Observable, PromiseStatus } from './observable'
import { Stream } from './stream'

const useUnsubscribeCallback = (stream$: Stream, length: number) => {
  let unsubscribeCount = 0
  const unsubscribeCallback = () => {
    unsubscribeCount += 1
    if (unsubscribeCount === length) {
      setTimeout(() => {
        stream$.unsubscribe()
      })
    }
  }
  return { unsubscribeCallback }
}

export type StreamTupleValues<T extends (Stream | Observable)[]> = {
  [K in keyof T]: T[K] extends Stream<infer U> | Observable<infer U> ? U : never
}

/**
 * fork takes a stream or Observable, and returns a stream that emits the same value as the input stream.
 * The output stream will finish when the input stream finish.
 * when the input stream unsubscribe, the output stream will also unsubscribe
 * @param {Stream|Observable} arg$ the input stream or Observable
 * @returns {Stream} a stream that emits the same value as the input stream
 */
export const fork = <T>(arg$: Stream<T> | Observable<T>): Stream<T> => {
  const stream$ = new Stream<T>()
  let finishFlag = false
  const observable = arg$.thenImmediate(
    (value) => stream$.next(value, finishFlag),
    (value) => stream$.next(Promise.reject(value), finishFlag),
  )
  arg$.afterUnsubscribe(() =>
    setTimeout(() => {
      stream$.unsubscribe()
    }),
  )
  arg$.afterComplete(() => (finishFlag = true))

  stream$.afterUnsubscribe(() => {
    observable.unsubscribe()
  })
  return stream$
}

/**
 * @description
 * last takes multiple streams or Observable, and returns a stream that emits the finish values of all the input streams.
 * The output stream will finish when all the input streams finish.
 * when all input streams unsubscribe, the output stream will also unsubscribe
 * @param {...Stream|Observable} args
 * @returns {Stream}
 */
export const finish = <T extends (Stream | Observable)[]>(...args: T) => {
  const stream$ = new Stream<StreamTupleValues<T>>()
  const payload: StreamTupleValues<T> = [] as any
  let finishCount = 0
  let rejectFlag = false
  const { unsubscribeCallback } = useUnsubscribeCallback(stream$, args.length)
  const completeCallback = (_v: any, status: PromiseStatus) => {
    finishCount += 1
    if (status === 'rejected') rejectFlag = true
  }
  const next = () => {
    if (finishCount === args.length) {
      stream$.next(rejectFlag ? Promise.reject([...payload]) : [...payload], true)
    }
  }

  args.forEach((arg$, index) => {
    arg$.afterUnsubscribe(unsubscribeCallback)
    arg$.afterComplete(completeCallback)
    const observable = arg$.then(
      (value) => {
        payload[index] = value
        next()
      },
      (value) => {
        payload[index] = value
        next()
      },
    )

    stream$.afterUnsubscribe(() => {
      arg$.offUnsubscribe(unsubscribeCallback)
      arg$.offComplete(completeCallback)
      observable.unsubscribe()
    })
  })

  stream$.afterComplete(() => (payload.length = 0))

  return stream$
}

/**
 * combine takes multiple streams or Observable, and return a stream that emits values from all the input streams.
 * The output stream will finish when all the input streams finish.
 * when all input streams unsubscribe, the output stream will also unsubscribe
 * @param {...Stream|Observable} args
 * @returns {Stream}
 */
export const combine = <T extends (Stream | Observable)[]>(...args: T) => {
  const stream$ = new Stream<StreamTupleValues<T>>()
  const payload: StreamTupleValues<T> = [] as any
  const promiseStatus = [...Array(args.length)].map(() => 'pending')
  let finishCount = 0
  const { unsubscribeCallback } = useUnsubscribeCallback(stream$, args.length)
  const completeCallback = () => (finishCount += 1)

  const next = () => {
    if (promiseStatus.every((status) => status !== 'pending'))
      stream$.next(
        promiseStatus.some((status) => status === 'rejected')
          ? Promise.reject([...payload])
          : [...payload],
        finishCount === args.length,
      )
  }

  args.forEach((arg$, index) => {
    arg$.afterUnsubscribe(unsubscribeCallback)
    arg$.afterComplete(completeCallback)
    arg$.then(
      (value) => {
        promiseStatus[index] = 'resolved'
        payload[index] = value
        next()
      },
      (value) => {
        promiseStatus[index] = 'rejected'
        payload[index] = value
        next()
      },
    )
    stream$.afterUnsubscribe(() => {
      arg$.offUnsubscribe(unsubscribeCallback)
      arg$.offComplete(completeCallback)
    })
  })

  stream$.afterComplete(() => {
    payload.length = 0
    promiseStatus.length = 0
  })

  return stream$
}

/**
 * concat takes multiple streams or Observable, and return a stream that emits values in the order of the input streams.
 * only previous input stream finish, the next input stream values will be emitted
 * The output stream will finish when all the input streams finish.
 * when all input streams unsubscribe, the output stream will also unsubscribe
 * @param {...Stream|Subscription} args
 * @returns {Stream}
 */
export const concat = <T extends (Stream | Observable)[]>(...args: T) => {
  const stream$ = new Stream<StreamTupleValues<T>[number]>()
  const finishFlag = [...Array(args.length)].map(() => false)
  const unsubscribeFlag = [...Array(args.length)].map(() => false)
  const next = (data: any, promiseStatus: 'resolved' | 'rejected', index: number) => {
    if (index === 0 || finishFlag[index - 1]) {
      stream$.next(
        promiseStatus === 'resolved' ? data : Promise.reject(data),
        finishFlag.every((flag) => flag),
      )
      if (finishFlag[index] && unsubscribeFlag[index + 1]) {
        setTimeout(() => stream$.unsubscribe())
      }
    }
  }
  args.forEach((arg$, index) => {
    const unsubscribeCallback = () => {
      unsubscribeFlag[index] = true
      if ((index === 0 || finishFlag[index - 1]) && !finishFlag[index]) {
        setTimeout(() => stream$.unsubscribe())
      }
    }
    const completeCallback = () => (finishFlag[index] = true)
    arg$.afterUnsubscribe(unsubscribeCallback)
    arg$.afterComplete(completeCallback)
    const observable = arg$.then(
      (value) => next(value, 'resolved', index),
      (value) => next(value, 'rejected', index),
    )

    stream$.afterUnsubscribe(() => {
      arg$.offUnsubscribe(unsubscribeCallback)
      arg$.offComplete(completeCallback)
      observable.unsubscribe()
    })
  })
  return stream$
}

/**
 * merge takes multiple streams or Observable, and return a stream that emits values from all the input streams.
 * The output stream will finish when all the input streams finish.
 * when all input streams unsubscribe, the output stream will also unsubscribe
 * @param {...Stream|Observable} args
 * @returns {Stream}
 */
export const merge = <T extends (Stream | Observable)[]>(...args: T) => {
  const stream$ = new Stream<StreamTupleValues<T>[number]>()
  let finishCount = 0
  const { unsubscribeCallback } = useUnsubscribeCallback(stream$, args.length)
  const completeCallback = () => (finishCount += 1)
  const next = (data: any, promiseStatus: 'resolved' | 'rejected') => {
    stream$.next(
      promiseStatus === 'resolved' ? data : Promise.reject(data),
      finishCount === args.length,
    )
  }

  args.forEach((arg$) => {
    arg$.afterUnsubscribe(unsubscribeCallback)
    arg$.afterComplete(completeCallback)
    const observable = arg$.then(
      (value) => next(value, 'resolved'),
      (value) => next(value, 'rejected'),
    )

    stream$.afterUnsubscribe(() => {
      arg$.offUnsubscribe(unsubscribeCallback)
      arg$.offComplete(completeCallback)
      observable.unsubscribe()
    })
  })
  return stream$
}

/**
 * partition takes a stream or Observable, and a predicate function that takes value and index as arguments.
 * It returns two streams, the first stream emits values when the predicate return true,
 * and the second stream emits values when the predicate return false.
 * The output streams will finish when the input stream finish.
 * when the input stream unsubscribe, the output streams will also unsubscribe.
 * @param {Stream|Observable} stream$ the input stream or Observable
 * @param {(this: any, value: any, index: number) => boolean} predicate the predicate function
 * @param {any} [thisArg] the this of the predicate function
 * @returns {[Stream, Stream]} an array of two streams
 */
export const partition = <T>(
  stream$: Stream<T> | Observable<T>,
  predicate: (this: any, value: any, status: 'resolved' | 'rejected', index: number) => boolean,
  thisArg?: any,
) => {
  const selectedStream$ = new Stream<T>()
  const unselectedStream$ = new Stream<T>()
  let finishFlag = false
  let index = 1

  const next = (data: any, promiseStatus: 'resolved' | 'rejected', flag: boolean) => {
    if (flag) {
      selectedStream$.next(promiseStatus === 'resolved' ? data : Promise.reject(data), finishFlag)
    } else {
      unselectedStream$.next(promiseStatus === 'resolved' ? data : Promise.reject(data), finishFlag)
    }
  }

  const observable = stream$
    .then(
      (value: any) => {
        try {
          next(value, 'resolved', predicate.call(thisArg, value, 'resolved', index))
        } catch (error) {
          next(value, 'resolved', false)
          console.log(error)
        }
      },
      (value) => {
        try {
          next(value, 'rejected', predicate.call(thisArg, value, 'rejected', index))
        } catch (error) {
          next(value, 'rejected', false)
          console.log(error)
        }
      },
    )
    .finally(() => (index += 1))

  const unsubscribeCallback = () => {
    setTimeout(() => {
      selectedStream$.unsubscribe()
      unselectedStream$.unsubscribe()
    })
  }
  const completeCallback = () => (finishFlag = true)

  stream$.afterUnsubscribe(unsubscribeCallback)
  stream$.afterComplete(completeCallback)

  finish(selectedStream$, unselectedStream$).afterComplete(() => {
    stream$.offUnsubscribe(unsubscribeCallback)
    stream$.offComplete(completeCallback)
    observable.unsubscribe()
  })

  return [selectedStream$, unselectedStream$]
}

/**
 * race takes multiple streams or Observable, and returns a stream that emits the first value of all the input streams.
 * The output stream will finish when first input stream finish.
 * when first input stream unsubscribe, the output stream will also unsubscribe
 * @param {...Stream|Observable} args
 * @returns {Stream}
 */
export const promiseRace = <T extends (Stream | Observable)[]>(...args: T) => {
  const stream$ = new Stream<StreamTupleValues<T>[number]>()
  let finishFlag = false
  let firstIndex: number | null = null

  args.forEach((arg$, index) => {
    const observable = arg$.then(
      (value) => {
        if (firstIndex === null) firstIndex = index
        if (firstIndex === index) {
          stream$.next(value, finishFlag)
        }
      },
      (error) => {
        if (firstIndex === null) firstIndex = index
        if (firstIndex === index) {
          stream$.next(Promise.reject(error), finishFlag)
        }
      },
    )

    const unsubscribeCallback = () => {
      if (firstIndex === index) {
        setTimeout(() => stream$.unsubscribe())
      }
    }
    const completeCallback = () => {
      if (firstIndex === index) {
        finishFlag = true
      }
    }

    arg$.afterUnsubscribe(unsubscribeCallback)
    arg$.afterComplete(completeCallback)

    stream$.afterUnsubscribe(() => {
      arg$.offUnsubscribe(unsubscribeCallback)
      arg$.offComplete(completeCallback)
      observable.unsubscribe()
    })
  })
  return stream$
}

export const promiseAll = <T extends (Stream | Observable)[]>(...args: T) => {
  const stream$ = new Stream<StreamTupleValues<T>>()
  const payload: StreamTupleValues<T> = [] as any
  const promiseStatus = [...Array(args.length)].map(() => 'pending')
  let finishCount = 0
  const { unsubscribeCallback } = useUnsubscribeCallback(stream$, args.length)
  const completeCallback = () => (finishCount += 1)

  const next = () => {
    if (promiseStatus.every((status) => status !== 'pending')) {
      stream$.next(
        promiseStatus.some((status) => status === 'rejected')
          ? Promise.reject([...payload])
          : [...payload],
        finishCount === args.length,
      )
      promiseStatus.forEach((_, index) => (promiseStatus[index] = 'pending'))
    }
  }

  args.forEach((arg$, index) => {
    arg$.afterUnsubscribe(unsubscribeCallback)
    arg$.afterComplete(completeCallback)
    arg$.then(
      (value) => {
        promiseStatus[index] = 'resolved'
        payload[index] = value
        next()
      },
      (value) => {
        promiseStatus[index] = 'rejected'
        payload[index] = value
        next()
      },
    )
    stream$.afterUnsubscribe(() => {
      arg$.offUnsubscribe(unsubscribeCallback)
      arg$.offComplete(completeCallback)
    })
  })

  stream$.afterComplete(() => {
    payload.length = 0
    promiseStatus.length = 0
  })

  return stream$
}
