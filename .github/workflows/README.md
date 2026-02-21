# ⚙️ CI/CD Workflows

GitHub Actions 自动化工作流。

## 工作流列表

| 文件 | 触发条件 | 功能 |
|------|---------|------|
| `test.yml` | PR/push | 运行测试 |
| `deploy-contracts.yml` | tag | 部署合约 |
| `build-images.yml` | push main | 构建 Docker 镜像 |

## 配置

在仓库 Settings > Secrets 中配置：
- `PRIVATE_KEY`
- `BASESCAN_API_KEY`
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
