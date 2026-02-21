"""
Bot 钱包管理模块
处理区块链连接和交易

⚠️ Base Sepolia Testnet Only
"""

import logging
from typing import Dict, Optional
from decimal import Decimal

from web3 import Web3
from web3.middleware import geth_poa_middleware
from eth_account import Account
from eth_account.datastructures import SignedTransaction

from config import settings

logger = logging.getLogger(__name__)

# USDC 合约 ABI (最小化)
USDC_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": False,
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "from", "type": "address"},
            {"indexed": True, "name": "to", "type": "address"},
            {"indexed": False, "name": "value", "type": "uint256"}
        ],
        "name": "Transfer",
        "type": "event"
    }
]


class BotWallet:
    """
    Bot 钱包管理器
    
    管理 Bot 的以太坊钱包，处理余额查询和交易
    """
    
    def __init__(self):
        self.w3: Optional[Web3] = None
        self.account: Optional[Account] = None
        self.usdc_contract = None
        self._connect()
    
    def _connect(self):
        """连接到区块链节点"""
        try:
            # 连接 RPC
            self.w3 = Web3(Web3.HTTPProvider(settings.rpc_url))
            
            # 添加 POA 中间件 (用于测试网)
            self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
            
            # 验证连接
            if not self.w3.is_connected():
                raise ConnectionError(f"Failed to connect to {settings.rpc_url}")
            
            # 验证链 ID
            chain_id = self.w3.eth.chain_id
            if chain_id != settings.chain_id:
                raise ValueError(
                    f"Wrong chain ID: {chain_id}, expected: {settings.chain_id}"
                )
            
            # 加载账户
            self.account = Account.from_key(settings.bot_wallet_private_key)
            
            # 加载 USDC 合约
            self.usdc_contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(settings.usdc_contract),
                abi=USDC_ABI
            )
            
            logger.info(f"Wallet connected: {self.account.address}")
            logger.info(f"Network: Base Sepolia (Chain ID: {chain_id})")
            
        except Exception as e:
            logger.exception(f"Failed to connect wallet: {e}")
            raise
    
    def check_connection(self) -> bool:
        """检查连接状态"""
        if not self.w3:
            return False
        return self.w3.is_connected()
    
    @property
    def address(self) -> str:
        """获取钱包地址"""
        if not self.account:
            raise RuntimeError("Wallet not initialized")
        return self.account.address
    
    def get_eth_balance(self) -> Decimal:
        """
        获取 ETH 余额
        
        Returns:
            ETH 余额 (Decimal)
        """
        if not self.w3 or not self.account:
            raise RuntimeError("Wallet not connected")
        
        balance_wei = self.w3.eth.get_balance(self.account.address)
        balance_eth = self.w3.from_wei(balance_wei, 'ether')
        
        return Decimal(str(balance_eth))
    
    def get_usdc_balance(self) -> Decimal:
        """
        获取 USDC 余额
        
        Returns:
            USDC 余额 (Decimal)
        """
        if not self.usdc_contract or not self.account:
            raise RuntimeError("Wallet not connected")
        
        balance_raw = self.usdc_contract.functions.balanceOf(
            self.account.address
        ).call()
        
        # USDC 有 6 位小数
        balance_usdc = balance_raw / (10 ** 6)
        
        return Decimal(str(balance_usdc))
    
    def get_balances(self) -> Dict[str, Decimal]:
        """
        获取所有余额
        
        Returns:
            {"eth": Decimal, "usdc": Decimal}
        """
        return {
            "eth": self.get_eth_balance(),
            "usdc": self.get_usdc_balance()
        }
    
    def send_transaction(
        self,
        to: str,
        amount_eth: Optional[Decimal] = None,
        data: Optional[str] = None,
        gas_limit: int = 21000
    ) -> str:
        """
        发送交易
        
        Args:
            to: 接收地址
            amount_eth: ETH 金额 (可选)
            data: 交易数据 (可选)
            gas_limit: Gas 限制
        
        Returns:
            交易哈希
        """
        if not self.w3 or not self.account:
            raise RuntimeError("Wallet not connected")
        
        # 构建交易
        tx = {
            'from': self.account.address,
            'to': Web3.to_checksum_address(to),
            'gas': gas_limit,
            'gasPrice': self.w3.to_wei('0.1', 'gwei'),  # Base Sepolia 低 gas
            'nonce': self.w3.eth.get_transaction_count(self.account.address),
            'chainId': settings.chain_id
        }
        
        if amount_eth:
            tx['value'] = self.w3.to_wei(float(amount_eth), 'ether')
        
        if data:
            tx['data'] = data
        
        # 签名交易
        signed_tx = self.account.sign_transaction(tx)
        
        # 发送交易
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        logger.info(f"Transaction sent: {tx_hash.hex()}")
        
        return tx_hash.hex()
    
    def send_usdc(self, to: str, amount: Decimal) -> str:
        """
        发送 USDC
        
        Args:
            to: 接收地址
            amount: USDC 金额
        
        Returns:
            交易哈希
        """
        if not self.usdc_contract or not self.account:
            raise RuntimeError("Wallet not connected")
        
        # 转换为最小单位
        amount_wei = int(amount * (10 ** 6))
        
        # 构建交易
        tx = self.usdc_contract.functions.transfer(
            Web3.to_checksum_address(to),
            amount_wei
        ).build_transaction({
            'from': self.account.address,
            'gas': 100000,
            'gasPrice': self.w3.to_wei('0.1', 'gwei'),
            'nonce': self.w3.eth.get_transaction_count(self.account.address),
            'chainId': settings.chain_id
        })
        
        # 签名并发送
        signed_tx = self.account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        logger.info(f"USDC transfer sent: {tx_hash.hex()}")
        
        return tx_hash.hex()
    
    def wait_for_receipt(self, tx_hash: str, timeout: int = 120) -> Dict:
        """
        等待交易确认
        
        Args:
            tx_hash: 交易哈希
            timeout: 超时时间 (秒)
        
        Returns:
            交易收据
        """
        if not self.w3:
            raise RuntimeError("Wallet not connected")
        
        receipt = self.w3.eth.wait_for_transaction_receipt(
            tx_hash,
            timeout=timeout
        )
        
        return dict(receipt)


# 全局钱包实例
wallet = BotWallet()
