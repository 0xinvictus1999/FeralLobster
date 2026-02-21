# 🐳 Bot Runtime

AI 代理运行时代码，部署在 Akash 去中心化云上。

## 目录结构

```
bot-runtime/
└── src/
    ├── main.py       # 运行时入口
    ├── agent.py      # 代理逻辑
    └── config.py     # 配置加载
```

## 说明

此目录包含实际运行在 Akash 上的 AI 代理代码镜像。
代理从此镜像启动，独立运行在隔离容器中。

## 构建

```bash
docker build -t feral-lobster-runtime .
docker push <registry>/feral-lobster-runtime
```
