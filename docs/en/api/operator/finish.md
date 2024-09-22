# finish

Combines the data after the input [streams](/en/api/index#stream) or [subjections](/en/api/index#subjection) have finished, returning a new stream.

![image](/finish.drawio.svg)

- Type

  ```typescript
  type combine: (...args: (Stream | Subjection)[]) => Stream;
  ```

- Details

  - The new stream will only emit its first data after all input streams have [finished](/en/guide/base#completion).
  - The new stream will also finish after emitting its first data.
  - The new stream will unsubscribe when all input streams are unsubscribed.
