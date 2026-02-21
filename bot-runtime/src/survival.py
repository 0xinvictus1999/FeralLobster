"""
生存模块
处理 Bot 的持续运行和资源管理
"""

import asyncio
import logging
from datetime import datetime, timedelta
from enum import Enum

from config import settings
from wallet import wallet
from memory_manager import memory

logger = logging.getLogger(__name__)


class OperationMode(Enum):
    """运行模式"""
    NORMAL = "normal"
    LOW_POWER = "low_power"
    HIBERNATION = "hibernation"


class SurvivalManager:
    """
    生存管理器
    
    管理 Bot 的生存周期:
    - 定期检查余额
    - 根据余额切换运行模式
    - 备份记忆到 Arweave
    """
    
    def __init__(self):
        self.mode = OperationMode.NORMAL
        self.last_check = None
        self.last_backup = None
        self.start_time = datetime.utcnow()
        self.stats = {
            "checks": 0,
            "backups": 0,
            "mode_switches": 0
        }
    
    @property
    def uptime(self) -> timedelta:
        """获取运行时间"""
        return datetime.utcnow() - self.start_time
    
    async def loop(self):
        """
        主生存循环
        
        每 6 小时运行一次检查
        """
        logger.info(f"Survival loop started (interval: {settings.survival_interval}s)")
        
        while True:
            try:
                await self.check_vitals()
                
                # 等待下次检查
                await asyncio.sleep(settings.survival_interval)
                
            except asyncio.CancelledError:
                logger.info("Survival loop cancelled")
                break
            except Exception as e:
                logger.exception(f"Error in survival loop: {e}")
                # 出错后等待一段时间再试
                await asyncio.sleep(60)
    
    async def check_vitals(self):
        """
        检查生命体征
        
        - 检查 USDC 余额
        - 根据余额切换模式
        - 每日备份记忆
        """
        self.stats["checks"] += 1
        self.last_check = datetime.utcnow()
        
        logger.info("=" * 40)
        logger.info(f"Vitals Check #{self.stats['checks']}")
        logger.info("=" * 40)
        
        try:
            # 获取 USDC 余额
            balance = wallet.get_usdc_balance()
            logger.info(f"USDC Balance: {balance} USDC")
            
            # 根据余额决定模式
            old_mode = self.mode
            
            if balance < settings.hibernate_threshold:
                # 资金不足，进入休眠
                logger.warning(f"Balance below hibernation threshold ({settings.hibernate_threshold} USDC)")
                await self._enter_hibernation()
                
            elif balance < settings.low_power_threshold:
                # 资金紧张，进入低功耗模式
                logger.warning(f"Balance below low power threshold ({settings.low_power_threshold} USDC)")
                await self._enter_low_power_mode()
                
            else:
                # 正常模式
                if self.mode != OperationMode.NORMAL:
                    logger.info("Switching to normal operation mode")
                    self.mode = OperationMode.NORMAL
                    self.stats["mode_switches"] += 1
            
            # 检查是否需要备份 (每 24 小时)
            await self._check_backup()
            
            logger.info(f"Current Mode: {self.mode.value}")
            
        except Exception as e:
            logger.exception(f"Error checking vitals: {e}")
    
    async def _enter_hibernation(self):
        """进入休眠模式"""
        self.mode = OperationMode.HIBERNATION
        self.stats["mode_switches"] += 1
        
        logger.warning("=" * 60)
        logger.warning("ENTERING HIBERNATION MODE")
        logger.warning("=" * 60)
        
        # 执行休眠
        from lifecycle import hibernate
        hibernate()
    
    async def _enter_low_power_mode(self):
        """进入低功耗模式"""
        if self.mode == OperationMode.LOW_POWER:
            return
        
        self.mode = OperationMode.LOW_POWER
        self.stats["mode_switches"] += 1
        
        logger.warning("=" * 60)
        logger.warning("ENTERING LOW POWER MODE")
        logger.warning("=" * 60)
        logger.warning("- Reducing API call frequency")
        logger.warning("- Limiting response length")
        logger.warning("- Disabling non-essential features")
    
    async def _check_backup(self):
        """
        检查是否需要备份
        
        每 24 小时备份一次
        """
        if not self.last_backup:
            should_backup = True
        else:
            time_since_backup = datetime.utcnow() - self.last_backup
            should_backup = time_since_backup > timedelta(hours=24)
        
        if should_backup:
            logger.info("Creating daily backup...")
            try:
                backup_id = await memory.backup_to_arweave()
                if backup_id:
                    self.last_backup = datetime.utcnow()
                    self.stats["backups"] += 1
                    logger.info(f"Backup created: {backup_id}")
            except Exception as e:
                logger.error(f"Backup failed: {e}")
    
    def get_status(self) -> dict:
        """
        获取生存状态
        
        Returns:
            状态字典
        """
        return {
            "mode": self.mode.value,
            "uptime_seconds": self.uptime.total_seconds(),
            "uptime_human": str(self.uptime),
            "last_check": self.last_check.isoformat() if self.last_check else None,
            "last_backup": self.last_backup.isoformat() if self.last_backup else None,
            "stats": self.stats
        }


# 全局生存管理器实例
survival = SurvivalManager()


# 便捷函数
async def low_power_mode():
    """切换到低功耗模式"""
    await survival._enter_low_power_mode()


async def normal_operation():
    """切换到正常模式"""
    survival.mode = OperationMode.NORMAL
    logger.info("Switched to normal operation mode")


async def hibernate():
    """进入休眠"""
    await survival._enter_hibernation()
