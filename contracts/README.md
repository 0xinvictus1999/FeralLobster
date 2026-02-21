# 📜 Smart Contracts

Base Sepolia 测试网上的智能合约，使用 Foundry 框架开发。

## 目录结构

```
contracts/
├── src/           # 合约源码
├── test/          # 测试文件
├── script/        # 部署脚本
├── interfaces/    # 接口定义
└── foundry.toml   # 配置
```

## 合约列表

| 合约 | 描述 | 状态 |
|------|------|------|
| `LobsterNFT.sol` | AI 代理 NFT 合约 | 🚧 待开发 |
| `LobsterPool.sol` | 质押奖励池 | 🚧 待开发 |
| `FeralToken.sol` | 治理代币 | 🚧 待开发 |

## 常用命令

```bash
# 编译
forge build

# 测试
forge test

# 部署到 Base Sepolia
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast

# 验证合约
forge verify-contract <address> <contract> --chain 84532
```

## 网络配置

- **Chain ID**: 84532
- **RPC**: https://sepolia.base.org
