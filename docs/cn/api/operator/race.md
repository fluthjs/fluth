# race

输入的[ stream ](/cn/api/index#stream)或者[ subjection ](/cn/api/index#subjection)进行竞争，返回一个新的流，`fork`最先推送数据的那个流

![image](/race.drawio.svg)

- 类型

  ```typescript
  type race: (...args: (Stream | Subjection)[]) => Stream;
  ```

- 详情
  - 输入的流取消订阅或者[结束](/cn/guide/base#结束)后，新的流也会取消订阅或者结束
