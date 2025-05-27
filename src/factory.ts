import { Stream, Plugin, ChainReturn } from './stream'
/**
 * createStream with default plugin
 */
function createStream<P extends Plugin[]>(...plugins: P) {
  function factory<T>(): Stream<T, false, ChainReturn<P, T, object>> & ChainReturn<P, T, object>
  function factory<T>(
    data: T,
  ): Stream<T, true, ChainReturn<P, T, object>> & ChainReturn<P, T, object>
  function factory<T>(data?: T) {
    const stream = new Stream<T, boolean, ChainReturn<P, T, object>>(data)
    stream.use(...plugins)
    return stream
  }
  return factory
}

/**
 * createStream with default plugin
 */
function $<T = any>(): Stream<T, false, object>
function $<T = any>(data: T): Stream<T, true, object>
function $<T = any>(data?: T) {
  return new Stream<T, boolean, object>(data)
}

export { createStream, $ }
