# 🤖 Telegram Bot

用户交互入口，基于 Python python-telegram-bot 开发。

## 目录结构

```
bot/
├── handlers/      # 消息处理器
│   ├── start.py   # 开始命令
│   ├── create.py  # 创建代理
│   └── manage.py  # 管理代理
├── utils/         # 工具函数
│   ├── wallet.py  # 钱包管理
│   └── api.py     # API 客户端
├── main.py        # 入口
└── requirements.txt
```

## 功能

- `/start` - 开始使用
- `/create` - 创建新 AI 代理
- `/list` - 查看我的代理
- `/manage <id>` - 管理指定代理

## 运行

```bash
pip install -r requirements.txt
cp .env.example .env
# 编辑 .env 配置
python main.py
```
