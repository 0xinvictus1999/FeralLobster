# 🔧 Orchestrator

FastAPI 后端服务，协调各组件交互。

## 目录结构

```
orchestrator/
├── routers/          # API 路由
│   ├── agents.py     # 代理管理
│   ├── deploy.py     # 部署服务
│   └── users.py      # 用户管理
├── services/         # 业务逻辑
│   ├── blockchain.py # 链上交互
│   ├── akash.py      # Akash 部署
│   └── arweave.py    # 存储服务
├── templates/        # 部署模板
├── main.py           # 入口
└── requirements.txt
```

## API 端点

| 路径 | 方法 | 描述 |
|------|------|------|
| `/api/agents` | GET/POST | 代理列表/创建 |
| `/api/deploy` | POST | 部署代理 |
| `/api/users` | GET | 用户信息 |

## 运行

```bash
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```
