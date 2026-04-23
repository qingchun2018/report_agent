"""AI Agent 对话 API。"""
from fastapi import APIRouter

from app.api.deps import DatabaseDep
from app.schemas.agent import AgentChatBody
from app.services.agent_service import AgentService

router = APIRouter(tags=["AI Agent"])


@router.post("/agent/chat")
async def agent_chat(db: DatabaseDep, body: AgentChatBody):
    agent = AgentService(db)
    return await agent.chat(body.query, body.session_id)
