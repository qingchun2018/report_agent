from pydantic import BaseModel


class AgentChatBody(BaseModel):
    """AI Agent 对话请求：支持多轮 session_id"""

    query: str
    session_id: str | None = None
