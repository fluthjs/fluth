# concat

Combines input [streams](/en/api/index#stream) or [subjections](/en/api/index#subjection) in sequence, returning a new stream.

![image](/concat.drawio.svg)

- Type

  ```typescript
  type concat: (...args: (Stream | Subjection)[]) => Stream;
  ```

- Details

  - Data from the next input stream will only be pushed to the new stream after the current input stream has [finished](/en/guide/base#completion).
  - The new stream will also unsubscribe when the current input stream unsubscribes.
