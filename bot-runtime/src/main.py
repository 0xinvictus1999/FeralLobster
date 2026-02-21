"""
FeralLobster Bot Runtime 入口

去中心化 AI 代理运行时
⚠️ Base Sepolia Testnet Only
"""

import asyncio
import logging
import sys
from contextlib import asynccontextmanager

import uvicorn

from config import settings
from lifecycle import initialize, shutdown
from survival import survival
from api import app

# 配置日志
def setup_logging():
    """配置日志系统"""
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # 控制台输出
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, settings.log_level))
    console_handler.setFormatter(logging.Formatter(log_format))
    
    # 文件输出
    file_handler = logging.FileHandler(settings.log_path, encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(log_format))
    
    # 根日志配置
    logging.basicConfig(
        level=logging.DEBUG,
        handlers=[console_handler, file_handler]
    )
    
    # 降低第三方库的日志级别
    logging.getLogger('web3').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)


# 生命周期管理
@asynccontextmanager
async def lifespan(app):
    """
    应用生命周期管理
    """
    # 启动
    setup_logging()
    logger = logging.getLogger(__name__)
    
    logger.info("=" * 70)
    logger.info("FeralLobster Bot Runtime")
    logger.info("⚠️  Base Sepolia Testnet Only")
    logger.info("=" * 70)
    
    # 初始化
    init_success = await initialize()
    if not init_success:
        logger.error("Initialization failed, exiting...")
        sys.exit(1)
    
    # 启动生存循环 (后台任务)
    survival_task = asyncio.create_task(survival.loop())
    logger.info("Survival loop started")
    
    yield
    
    # 关闭
    logger.info("Shutting down...")
    
    # 取消生存循环
    survival_task.cancel()
    try:
        await survival_task
    except asyncio.CancelledError:
        pass
    
    # 执行关闭流程
    await shutdown()
    
    logger.info("Goodbye!")


# 将 lifespan 应用到 FastAPI 应用
app.router.lifespan_context = lifespan


async def main():
    """
    主入口函数
    
    启动 API 服务器和后台任务
    """
    config = uvicorn.Config(
        app,
        host="0.0.0.0",
        port=settings.api_port,
        log_level=settings.log_level.lower(),
        access_log=True
    )
    
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nInterrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)
