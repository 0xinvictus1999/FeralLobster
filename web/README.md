# 🌐 Web Frontend

Next.js 14 前端应用，提供可视化界面管理 AI 代理。

## 目录结构

```
web/
├── app/              # App Router
│   ├── page.tsx      # 首页
│   ├── create/       # 创建代理
│   └── dashboard/    # 管理面板
├── components/       # React 组件
├── hooks/            # 自定义 Hooks
├── lib/              # 工具库
└── package.json
```

## 技术栈

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- wagmi/viem (Web3)

## 运行

```bash
npm install
cp .env.example .env.local
npm run dev
```
