# Basic Concepts

## Streams

In `fluth`, there are two types of streams: [Stream](/en/api/index#stream) and [Subjection](/en/api/index#subjection). A stream is a subscribable data source.

```typescript
import { Stream } from 'fluth'

const promise$ = new Stream()

const subjection$ = promise$.then(xxx)
```

## Completion

Only [Stream](/en/api/index#stream) can be completed. Completion means the stream will no longer push new data.

```typescript
import { Stream } from 'fluth'

const promise$ = new Stream()

promise$.next(1, true) // true indicates completion, the final data push
```

After executing this final data push, each subscription node will trigger the [finish](/en/api/index#finish) promise and then automatically unsubscribe.

## Subscription Nodes

`fluth` uses a `promise`-like form for data stream pushing. Use [then](/en/api/index#then) or [thenOnce](/en/api/index#thenonce) methods to add a new subscription node to the stream, returning a `Subjection` instance of the subscription node. The overall usage is consistent with `promise`.

## Chained Subscription

Call the `then` method of the subscription node's [subjection](/en/api/index#subjection) for chained subscription.

## Unsubscribe

Call the `unsubscribe` method of the subscription node's [subjection](/en/api/index#subjection) to cancel the subscription.

## Active Execution

Call the `execute` method of the subscription node's [subjection](/en/api/index#subjection) to re-execute the last subscribed data stream.
