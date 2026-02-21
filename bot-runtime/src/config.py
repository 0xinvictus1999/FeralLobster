"""
Bot Runtime 配置
"""

import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """
    Bot 运行时配置
    
    ⚠️ 所有区块链交互使用 Base Sepolia 测试网
    """
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )
    
    # ============================================
    # 核心配置 (从环境变量读取)
    # ============================================
    
    # Arweave 存储 ID
    arweave_id: str = Field(..., description="Arweave 上的记忆文件 ID")
    
    # Bot 钱包私钥
    bot_wallet_private_key: str = Field(..., description="Bot 以太坊钱包私钥")
    
    # AINFT API 密钥
    ainft_api_key: str = Field(..., description="AINFT API 密钥")
    
    # ============================================
    # 区块链配置 (Base Sepolia Testnet)
    # ============================================
    
    network: str = Field(
        default="base-sepolia-testnet",
        description="网络标识"
    )
    
    chain_id: int = Field(
        default=84532,
        description="Base Sepolia Chain ID"
    )
    
    rpc_url: str = Field(
        default="https://sepolia.base.org",
        description="Base Sepolia RPC 节点"
    )
    
    # USDC 合约地址 (Base Sepolia)
    usdc_contract: str = Field(
        default="0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        description="Base Sepolia USDC 合约"
    )
    
    # ============================================
    # 运行配置
    # ============================================
    
    # 数据目录
    data_dir: str = Field(
        default="/app/data",
        description="数据存储目录"
    )
    
    # 日志级别
    log_level: str = Field(
        default="INFO",
        description="日志级别"
    )
    
    # API 端口
    api_port: int = Field(
        default=8000,
        description="API 服务端口"
    )
    
    # 生存检查间隔 (秒)
    survival_interval: int = Field(
        default=21600,  # 6 小时
        description="生存检查间隔"
    )
    
    # 休眠阈值 (USDC)
    hibernate_threshold: float = Field(
        default=1.0,
        description="休眠阈值 USDC"
    )
    
    # 低功耗阈值 (USDC)
    low_power_threshold: float = Field(
        default=5.0,
        description="低功耗阈值 USDC"
    )
    
    # ============================================
    # 测试网强制检查
    # ============================================
    
    is_testnet: bool = Field(
        default=True,
        description="是否测试网模式"
    )
    
    @field_validator("is_testnet")
    @classmethod
    def force_testnet(cls, v: bool) -> bool:
        """强制测试网模式"""
        if not v:
            raise ValueError(
                "⚠️ Bot Runtime 仅支持 Base Sepolia 测试网\n"
                "如需切换到主网，请修改配置并重新构建镜像"
            )
        return True
    
    @property
    def wallet_address(self) -> str:
        """从私钥计算钱包地址"""
        from eth_account import Account
        return Account.from_key(self.bot_wallet_private_key).address
    
    @property
    def memory_db_path(self) -> str:
        """记忆数据库路径"""
        return os.path.join(self.data_dir, "memory.db")
    
    @property
    def log_path(self) -> str:
        """日志文件路径"""
        return os.path.join(self.data_dir, "bot.log")


# 全局配置实例
settings = Settings()
