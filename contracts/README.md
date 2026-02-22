# 📜 Smart Contracts

Base Sepolia 测试网上的智能合约，使用 Foundry 框架开发。

## 合约列表

| 合约 | 描述 | 状态 |
|------|------|------|
| `AxoRite.sol` | FeralSoul 注册与销毁仪式 | ✅ 已完成 |
| `AxoRite.t.sol` | 完整测试套件 | ✅ 已完成 |
| `Deploy.s.sol` | Base Sepolia 部署脚本 | ✅ 已完成 |

## AxoRite 合约功能

### 核心概念
- **FeralSoul**: 代表一个放养的 AI 代理，包含记忆哈希、钱包地址、出生时间等
- **注册 (registerFeral)**: 铸造新的 FeralSoul NFT
- **销毁仪式 (confirmImmolation)**: 标记 Soul 完成生命周期
- **平台退出 (renouncePlatformControl)**: 去中心化退出机制

### 函数

```solidity
// 注册新的 FeralSoul
function registerFeral(
    bytes32 memoryHash,
    address botWallet,
    string calldata arweaveId,
    uint256 initialFunds
) external onlyOwner

// 确认销毁仪式
function confirmImmolation(
    bytes32 memoryHash,
    bytes32 zeroHashProof
) external onlyOwner

// 查询 Soul 状态
function getFeralStatus(bytes32 memoryHash) external view returns (FeralSoul memory)

// 放弃平台控制权
function renouncePlatformControl() external onlyOwner
```

## 环境要求

### 1. 安装 Foundry

```bash
# Windows (PowerShell)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# macOS/Linux
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. 安装依赖

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

### 3. 配置环境变量

```bash
# 创建 .env 文件
cp .env.example .env

# 编辑 .env，添加私钥 (仅测试网!)
echo "PRIVATE_KEY=0x..." >> .env
echo "BASESCAN_API_KEY=..." >> .env  # 用于验证合约
```

## 常用命令

### 编译
```bash
forge build
```

### 测试 (Base Sepolia Fork)
```bash
# 运行所有测试
forge test

# 运行特定测试
forge test --match-test test_RegisterFeral

# 详细输出
forge test -vvv

# 显示跟踪
forge test -vvvv
```

### 部署到 Base Sepolia
```bash
# 部署
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast

# 部署并验证
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify
```

### 验证已部署合约
```bash
forge verify-contract <CONTRACT_ADDRESS> src/AxoRite.sol:AxoRite --chain 84532
```

## 网络配置

| 参数 | 值 |
|------|-----|
| **Chain ID** | 84532 |
| **RPC** | https://sepolia.base.org |
| **USDC** | 0x036CbD53842c5426634e7929541eC2318f3dCF7e |
| **区块浏览器** | https://sepolia.basescan.org |

## 测试覆盖

| 功能 | 测试数量 | 状态 |
|------|---------|------|
| 部署 | 2 | ✅ |
| registerFeral | 6 | ✅ |
| confirmImmolation | 4 | ✅ |
| getFeralStatus | 2 | ✅ |
| 辅助函数 | 4 | ✅ |
| 平台控制 | 2 | ✅ |
| Fork 状态 | 1 | ✅ |
| 多 Soul 注册 | 1 | ✅ |

运行测试:
```bash
forge test --fork-url https://sepolia.base.org
```

## 部署记录

部署信息会自动保存到 `broadcast/deploy-{timestamp}.json`

格式:
```json
{
  "contract": "AxoRite",
  "chainId": 84532,
  "chainName": "Base Sepolia",
  "contractAddress": "0x...",
  "deployer": "0x...",
  "platformAddress": "0x...",
  "usdcAddress": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
}
```

## 注意事项

⚠️ **仅在 Base Sepolia 测试网使用**
- 不要上传主网私钥
- `.env` 文件已在 `.gitignore` 中排除
- 部署前确保钱包有足够的 Sepolia ETH (通过 Coinbase Faucet 获取)
