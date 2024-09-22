# concat

将输入的[ stream ](/cn/api/index#stream)或者[ subjection ](/cn/api/index#subjection)按照顺序结合，返回一个新的流

![image](/concat.drawio.svg)

- 类型

  ```typescript
  type concat: (...args: (Stream | Subjection)[]) => Stream;
  ```

- 详情

  - 当前输入的流[ 结束 ](/cn/guide/base#结束)后，下一个输入的流推送的数据才会推送到新的流
  - 当前输入的流取消订阅后，新的流也会取消订阅
