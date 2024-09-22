# fork

Creates a new stream from the input [stream](/en/api/index#stream) or [subjection](/en/api/index#subjection)

- Type

  ```typescript
  type fork = (arg$: Stream | Subjection) => Stream
  ```

- Details

  - This is a stream forking operation, returning a new stream
  - When the input stream unsubscribes, the new stream will also unsubscribe
  - When the input stream [finishes](/en/guide/base#completion), the new stream will also finish

::: warning Why not subscribe directly
Compared to directly calling `then` on the subscription node, using `fork` adds an extra `then` layer which can immediately trigger the execution of `thenPlugin`. This can be useful in certain scenarios to separate definition and usage.
:::
