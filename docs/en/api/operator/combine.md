# combine

Combines input [streams](/en/api/index#stream) or [subjections](/en/api/index#subjection) and returns a new stream.

![image](/combine.drawio.svg)

- Type

  ```typescript
  type combine: (...args: (Stream | Subjection)[]) => Stream;
  ```

- Details

  - The new stream will only emit its first data after all input streams have emitted their first data.
  - The new stream will unsubscribe when all input streams are unsubscribed.
  - The new stream will [finish](/en/guide/base#completion) when all input streams have finished.
