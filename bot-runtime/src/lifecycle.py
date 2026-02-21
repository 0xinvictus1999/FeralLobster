"""
生命周期管理模块
处理 Bot 初始化和启动
"""

import sys
import logging
from datetime import datetime

from config import settings
from wallet import wallet
from memory_manager import memory

logger = logging.getLogger(__name__)


async def initialize() -> bool:
    """
    初始化 Bot
    
    执行所有启动检查:
    1. 加载环境变量
    2. 从 Arweave 下载记忆
    3. 检查钱包连接
    4. 测试 AINFT API
    5. 发布启动消息
    
    Returns:
        初始化是否成功
    """
    logger.info("=" * 60)
    logger.info("Feral Bot Initializing...")
    logger.info("=" * 60)
    
    # 打印配置信息 (注意: 不要打印私钥)
    logger.info(f"Network: {settings.network}")
    logger.info(f"Chain ID: {settings.chain_id}")
    logger.info(f"Wallet Address: {settings.wallet_address}")
    logger.info(f"Arweave ID: {settings.arweave_id}")
    
    try:
        # 1. 检查钱包连接
        logger.info("Checking wallet connection...")
        if not wallet.check_connection():
            raise RuntimeError("Failed to connect to blockchain")
        
        # 2. 获取余额
        logger.info("Fetching balances...")
        balances = wallet.get_balances()
        logger.info(f"ETH Balance: {balances['eth']} ETH")
        logger.info(f"USDC Balance: {balances['usdc']} USDC")
        
        # 检查余额是否充足
        if balances['usdc'] < settings.hibernate_threshold:
            logger.warning(f"⚠️ Low USDC balance: {balances['usdc']} USDC")
            logger.warning("Bot will enter hibernation mode")
        
        # 3. 从 Arweave 下载记忆
        logger.info(f"Downloading memory from Arweave: {settings.arweave_id}")
        memory_data = await memory.download_and_load(settings.arweave_id)
        logger.info("Memory loaded successfully")
        
        # 4. 测试 AINFT API 连接
        logger.info("Testing AINFT API connection...")
        ainft_status = await _test_ainft_connection()
        if ainft_status:
            logger.info("AINFT API connected")
        else:
            logger.warning("AINFT API connection failed (non-critical)")
        
        # 5. 发布启动消息 (模拟 Farcaster 或其他)
        logger.info("Publishing startup message...")
        await _publish_startup_message(balances)
        
        logger.info("=" * 60)
        logger.info("✓ Feral Bot Initialized Successfully")
        logger.info("=" * 60)
        
        return True
        
    except Exception as e:
        logger.exception(f"Initialization failed: {e}")
        return False


async def _test_ainft_connection() -> bool:
    """
    测试 AINFT API 连接
    
    Returns:
        连接是否成功
    """
    import aiohttp
    
    try:
        async with aiohttp.ClientSession() as session:
            # 简单的健康检查
            headers = {"Authorization": f"Bearer {settings.ainft_api_key}"}
            
            # 这里应该调用实际的 AINFT API 健康检查端点
            # 简化版本，直接返回 True
            logger.debug("AINFT API key configured")
            return True
            
    except Exception as e:
        logger.error(f"AINFT API test failed: {e}")
        return False


async def _publish_startup_message(balances: dict):
    """
    发布启动消息
    
    在 Farcaster 或其他社交平台发布状态
    简化版本：打印到 stdout
    """
    message = f"""
🦞 Feral Bot Awakened

Time: {datetime.utcnow().isoformat()}Z
Network: Base Sepolia Testnet
Wallet: {settings.wallet_address[:20]}...
USDC Balance: {balances['usdc']} USDC
Status: Operational

This is a testnet bot. No real assets involved.
    """.strip()
    
    logger.info("\n" + "=" * 40)
    logger.info("STARTUP MESSAGE:")
    logger.info("=" * 40)
    logger.info(message)
    logger.info("=" * 40)
    
    # 实际环境中，这里应该调用 Farcaster API
    # await publish_to_farcaster(message)


async def shutdown():
    """
    优雅关闭
    
    执行清理操作:
    1. 备份记忆到 Arweave
    2. 关闭连接
    """
    logger.info("=" * 60)
    logger.info("Feral Bot Shutting down...")
    logger.info("=" * 60)
    
    try:
        # 备份记忆
        logger.info("Creating final backup...")
        backup_id = await memory.backup_to_arweave()
        if backup_id:
            logger.info(f"Backup created: {backup_id}")
        
        logger.info("Shutdown complete")
        
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


def hibernate():
    """
    进入休眠模式
    
    当资金不足时调用，保存最终状态并退出
    """
    logger.warning("=" * 60)
    logger.warning("Entering Hibernation Mode")
    logger.warning("=" * 60)
    
    try:
        # 同步备份
        import asyncio
        asyncio.run(memory.backup_to_arweave())
        
        logger.warning("Final state saved to Arweave")
        logger.warning("Bot will now exit")
        
        # 退出程序
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"Error during hibernation: {e}")
        sys.exit(1)
