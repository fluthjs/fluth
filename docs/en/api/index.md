<script setup>
import Stream from '../../components/stream.vue'
import Subjection from '../../components/subjection.vue'
</script>

# Overview

## Stream

<Stream />

The `then`, `thenOnce`, `catch`, and `finally` methods of a `Stream` instance all return [Subjection](#subjection) instances, enabling chain calls.

## Subjection

<Subjection />

The `then`, `thenOnce`, `catch`, and `finally` methods of a `Subjection` instance all return [Subjection](#subjection) instances, enabling chain calls.

## plugin

- Type

  ```typescript
  type thenPlugin = (unsubscribe: () => void) => void
  type executePlugin = ( promise: Promise<any>, unsubscribe: () => void ) => Promise<any>

  plugin: {
    then: thenPlugin[]
    execute: executePlugin[]
  }
  ```

- Details

  `plugin` can define two types of plugins: `then` plugins and `execute` plugins.

  `then` plugins are executed when the `then` method is called. They are passed the node's `unsubscribe` function, allowing for unified unsubscription capability. `execute` plugins are executed after the `execute` method is called. They are passed the current node's `promise` and the node's `unsubscribe` function. The returned `promise` is passed to subsequent nodes.

## then

- Type

  ```typescript
  type OnFulfilled<T> = Parameters<Promise<T>['then']>[0]
  type OnRejected<T> = Parameters<Promise<T>['catch']>[0]

  then<T>(
    onFulfilled: OnFulfilled<T>,
    onRejected?: OnRejected<unknown>,
  ): Subjection
  ```

- Details

  `then` subscriber, usage consistent with `promise`, returns a [Subjection](#subjection) instance of the subscription node.

## thenOnce

- Type

  ```typescript
  type OnFulfilled<T> = Parameters<Promise<T>['then']>[0]
  type OnRejected<T> = Parameters<Promise<T>['catch']>[0]

  thenOnce<T>(
    onFulfilled: OnFulfilled<T>,
    onRejected?: OnRejected<unknown>,
  ): Subjection
  ```

- Details

  The difference between `thenOnce` and `then` is that it automatically unsubscribes after executing once.

## catch

- Type

  ```typescript
  type OnRejected<T> = Parameters<Promise<T>['catch']>[0]

  catch(onRejected: OnRejected<unknown>): Subjection
  ```

- Details

  Performs `catch` on the subscription node, usage consistent with `promise`, returns a [Subjection](#subjection) instance of the subscription node.

## finally

- Type

  ```typescript
  type OnFinally<T> = Parameters<Promise<T>['finally']>[0]

  finally(onFinally: OnFinally<unknown>): Subjection
  ```

- Details

  Performs `finally` on the subscription node, usage consistent with `promise`, returns a [Subjection](#subjection) instance of the subscription node.

## unsubscribe

- Type

  ```typescript
  unsubscribe(): void
  ```

- Details

  Cancels the node's subscription.
  ::: warning Warning
  Canceling the current node's subscription will also cancel all subscriptions of nodes after the current node's `then`.
  :::

## setUnsubscribeCallback

- Type

  ```typescript
  setUnsubscribeCallback(callback: () => void): void
  ```

- Details

  Sets the callback function for when the node's subscription is canceled.

## finish

- Type

  ```typescript
  finish: Promise<any>
  ```

- Details

  A `promise` triggered when the stream ends, which will trigger earlier than the automatic unsubscription of subscription nodes.

## execute

- Type

  ```typescript
  execute: () => void
  ```

- Details

  Actively executes the current node. The data used is from the last time the stream passed through this node. If the node has never been executed before, it won't execute.
  :::warning
  Executing the current node will also execute nodes after the current node's `then`, equivalent to pushing the stream at the current node.
  :::

## pause

- Type

  ```typescript
  pause: () => void
  ```

- Details

  Pauses the current stream. After executing the `pause` method, all subscribed nodes will not execute.

## restart

- Type

  ```typescript
  restart: () => void
  ```

- Details

  Restarts the current stream. After executing the `restart` method, all subscribed nodes will start accepting and executing stream pushes.

## next

- Type

  ```typescript
  next(payload: any, finishFlag?: boolean): void;
  ```

- Details

  Pushes data to the current stream. `payload` is the data. When set to `Promise.reject(xxx)`, subsequent `then` behavior is consistent with `promise`'s `then`. The second parameter indicates whether the current stream is finished. When set to `true`, subsequent `next` calls will not execute.
