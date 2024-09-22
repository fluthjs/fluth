export default {
  label: '简体中文',
  lang: 'cn',
  title: 'fluth',
  description: '一个基于javascript promise的流',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '指南', link: '/cn/guide/introduce' },
      { text: 'API', link: '/cn/api/index' },
    ],
    sidebar: {
      '/cn/': [
        {
          text: '指南',
          items: [
            { text: '简介', link: '/cn/guide/introduce' },
            { text: '基本概念', link: '/cn/guide/base' },
            { text: '快速开始', link: '/cn/guide/quick' },
            { text: '高阶用法', link: '/cn/guide/heigh' },
          ],
        },
        {
          text: 'API',
          items: [
            { text: '流', link: '/cn/api/index' },
            {
              text: '操作符',
              collapsed: false,
              items: [
                { text: 'fork', link: '/cn/api/operator/fork' },
                { text: 'finish', link: '/cn/api/operator/finish' },
                { text: 'combine', link: '/cn/api/operator/combine' },
                { text: 'concat', link: '/cn/api/operator/concat' },
                { text: 'merge', link: '/cn/api/operator/merge' },
                { text: 'partition', link: '/cn/api/operator/partition' },
                { text: 'race', link: '/cn/api/operator/race' },
              ],
            },
          ],
        },
      ],
    },
  },
}
