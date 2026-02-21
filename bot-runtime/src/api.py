"""
API 模块
提供 Bot 状态查询接口
"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from wallet import wallet
from memory_manager import memory
from survival import survival

logger = logging.getLogger(__name__)

# 创建 FastAPI 应用
app = FastAPI(
    title="Feral Bot Runtime",
    description="去中心化 AI Bot 运行时 API (Base Sepolia Testnet)",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    健康检查端点
    
    Returns:
        {
            "status": "alive",
            "balance": usdc_balance,
            "mode": current_mode
        }
    """
    try:
        balance = wallet.get_usdc_balance()
        mode = survival.mode.value
        
        status = "alive"
        if survival.mode.value == "hibernation":
            status = "hibernating"
        elif survival.mode.value == "low_power":
            status = "low_power"
        
        return {
            "status": status,
            "balance": float(balance),
            "mode": mode,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/status")
async def get_status() -> Dict[str, Any]:
    """
    获取详细状态
    
    Returns:
        {
            "wallet": {...},
            "uptime": {...},
            "memory": {...},
            "survival": {...}
        }
    """
    try:
        # 钱包信息
        balances = wallet.get_balances()
        wallet_info = {
            "address": wallet.address,
            "eth_balance": float(balances["eth"]),
            "usdc_balance": float(balances["usdc"])
        }
        
        # 运行时间
        uptime = survival.uptime
        uptime_info = {
            "seconds": uptime.total_seconds(),
            "human": str(uptime)
        }
        
        # 记忆统计
        memory_stats = memory.get_stats()
        
        # 生存状态
        survival_status = survival.get_status()
        
        return {
            "network": settings.network,
            "chain_id": settings.chain_id,
            "wallet": wallet_info,
            "uptime": uptime_info,
            "memory": memory_stats,
            "survival": survival_status,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat(message: Dict[str, str]) -> Dict[str, Any]:
    """
    聊天端点 (可选)
    
    接收消息并生成回复
    需要 AINFT API 调用
    
    Args:
        message: {"content": "用户消息"}
    
    Returns:
        {"reply": "AI 回复", "cost": 0.001}
    """
    # 检查模式
    if survival.mode.value == "hibernation":
        raise HTTPException(status_code=503, detail="Bot is hibernating")
    
    if survival.mode.value == "low_power":
        # 低功耗模式下限制功能
        return {
            "reply": "[Low Power Mode] I'm conserving energy. Please fund my wallet to restore full functionality.",
            "mode": "low_power",
            "wallet": wallet.address
        }
    
    content = message.get("content", "")
    
    if not content:
        raise HTTPException(status_code=400, detail="Content is required")
    
    try:
        # 这里应该调用 AINFT API 生成回复
        # 简化版本：返回模拟回复
        
        # 保存用户消息
        memory.save_message("user", content)
        
        # 模拟 AI 回复
        reply = f"This is a test response from Feral Bot (Base Sepolia Testnet). You said: {content[:50]}..."
        
        # 保存 AI 回复
        memory.save_message("assistant", reply)
        
        return {
            "reply": reply,
            "mode": "normal",
            "cost": 0.001,  # USDC
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/memory")
async def get_memory(limit: int = 100) -> Dict[str, Any]:
    """
    获取记忆
    
    Args:
        limit: 返回的消息数量
    
    Returns:
        记忆列表
    """
    try:
        messages = memory.load_memory()
        return {
            "messages": messages[-limit:] if limit > 0 else messages,
            "total": len(messages),
            "returned": min(limit, len(messages))
        }
    
    except Exception as e:
        logger.error(f"Failed to get memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/backup")
async def trigger_backup() -> Dict[str, Any]:
    """
    手动触发备份
    
    Returns:
        备份结果
    """
    try:
        backup_id = await memory.backup_to_arweave()
        
        if backup_id:
            return {
                "status": "success",
                "arweave_id": backup_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail="Backup failed")
    
    except Exception as e:
        logger.error(f"Backup failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 启动事件
@app.on_event("startup")
async def startup_event():
    """API 启动事件"""
    logger.info("API server starting...")


@app.on_event("shutdown")
async def shutdown_event():
    """API 关闭事件"""
    logger.info("API server shutting down...")
