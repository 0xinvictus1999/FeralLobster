"""
记忆管理模块
处理从 Arweave 下载和本地存储
"""

import os
import json
import sqlite3
import logging
from typing import Dict, Any, Optional

import aiohttp
import arweave
from arweave.transaction import Transaction

from config import settings

logger = logging.getLogger(__name__)

# Arweave 网关
ARWEAVE_GATEWAY = "https://arweave.net"


class MemoryManager:
    """
    记忆管理器
    
    管理 Bot 的记忆数据:
    - 从 Arweave 下载初始记忆
    - 本地 SQLite 存储
    - 增量备份到 Arweave
    """
    
    def __init__(self):
        self.db_path = settings.memory_db_path
        self._init_db()
    
    def _init_db(self):
        """初始化数据库"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 创建记忆表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                role TEXT NOT NULL,  -- user, assistant, system
                content TEXT NOT NULL,
                metadata TEXT  -- JSON 格式
            )
        ''')
        
        # 创建人格配置表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS personality (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        ''')
        
        # 创建备份记录表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS backups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                arweave_id TEXT NOT NULL,
                size INTEGER
            )
        ''')
        
        conn.commit()
        conn.close()
        
        logger.info(f"Memory database initialized: {self.db_path}")
    
    async def download_from_arweave(self, arweave_id: str) -> Dict[str, Any]:
        """
        从 Arweave 下载数据
        
        Args:
            arweave_id: Arweave 交易 ID
        
        Returns:
            解析后的 JSON 数据
        """
        url = f"{ARWEAVE_GATEWAY}/{arweave_id}"
        
        logger.info(f"Downloading from Arweave: {arweave_id}")
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status != 200:
                    raise ValueError(
                        f"Failed to download from Arweave: {response.status}"
                    )
                
                data = await response.text()
                
                try:
                    json_data = json.loads(data)
                    logger.info(f"Successfully downloaded {len(data)} bytes")
                    return json_data
                except json.JSONDecodeError as e:
                    raise ValueError(f"Invalid JSON data: {e}")
    
    def load_memory(self) -> list:
        """
        加载所有记忆
        
        Returns:
            记忆列表
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT timestamp, role, content, metadata 
            FROM memories 
            ORDER BY timestamp ASC
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        memories = []
        for row in rows:
            memories.append({
                "timestamp": row[0],
                "role": row[1],
                "content": row[2],
                "metadata": json.loads(row[3]) if row[3] else {}
            })
        
        return memories
    
    def save_message(self, role: str, content: str, metadata: Optional[Dict] = None):
        """
        保存消息到记忆
        
        Args:
            role: 角色 (user, assistant, system)
            content: 内容
            metadata: 元数据
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO memories (role, content, metadata)
            VALUES (?, ?, ?)
        ''', (role, content, json.dumps(metadata) if metadata else None))
        
        conn.commit()
        conn.close()
        
        logger.debug(f"Message saved: {role}")
    
    def set_personality(self, key: str, value: str):
        """
        设置人格配置
        
        Args:
            key: 配置键
            value: 配置值
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO personality (key, value)
            VALUES (?, ?)
        ''', (key, value))
        
        conn.commit()
        conn.close()
    
    def get_personality(self, key: str) -> Optional[str]:
        """
        获取人格配置
        
        Args:
            key: 配置键
        
        Returns:
            配置值
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT value FROM personality WHERE key = ?',
            (key,)
        )
        
        row = cursor.fetchone()
        conn.close()
        
        return row[0] if row else None
    
    def get_all_personality(self) -> Dict[str, str]:
        """获取所有人格配置"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT key, value FROM personality')
        
        rows = cursor.fetchall()
        conn.close()
        
        return {row[0]: row[1] for row in rows}
    
    async def download_and_load(self, arweave_id: str) -> Dict[str, Any]:
        """
        从 Arweave 下载并加载到数据库
        
        Args:
            arweave_id: Arweave 交易 ID
        
        Returns:
            加载的数据
        """
        # 下载数据
        data = await self.download_from_arweave(arweave_id)
        
        # 提取人格配置
        personality = data.get("personality", {})
        for key, value in personality.items():
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            self.set_personality(key, str(value))
        
        # 提取消息历史
        messages = data.get("messages", [])
        for msg in messages:
            self.save_message(
                role=msg.get("role", "unknown"),
                content=msg.get("content", ""),
                metadata=msg.get("metadata")
            )
        
        logger.info(f"Loaded {len(messages)} messages and {len(personality)} personality traits")
        
        return data
    
    async def backup_to_arweave(self) -> Optional[str]:
        """
        备份记忆到 Arweave
        
        Returns:
            Arweave 交易 ID
        """
        # 收集所有数据
        data = {
            "personality": self.get_all_personality(),
            "messages": self.load_memory(),
            "backup_timestamp": json.dumps({"type": "datetime", "value": "now"})
        }
        
        json_data = json.dumps(data, indent=2)
        
        # 这里应该使用 Arweave 钱包上传
        # 简化版本：返回模拟 ID
        logger.info(f"Backup data prepared: {len(json_data)} bytes")
        
        # 记录备份
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        mock_id = f"backup_{os.urandom(16).hex()}"
        cursor.execute('''
            INSERT INTO backups (arweave_id, size)
            VALUES (?, ?)
        ''', (mock_id, len(json_data)))
        
        conn.commit()
        conn.close()
        
        return mock_id
    
    def get_stats(self) -> Dict[str, Any]:
        """获取记忆统计"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 消息数量
        cursor.execute('SELECT COUNT(*) FROM memories')
        message_count = cursor.fetchone()[0]
        
        # 备份数量
        cursor.execute('SELECT COUNT(*) FROM backups')
        backup_count = cursor.fetchone()[0]
        
        # 最后备份时间
        cursor.execute('SELECT MAX(timestamp) FROM backups')
        last_backup = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "message_count": message_count,
            "backup_count": backup_count,
            "last_backup": last_backup
        }


# 全局记忆管理器实例
memory = MemoryManager()
