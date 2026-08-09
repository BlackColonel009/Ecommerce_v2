# schemas/support_reply.py
from pydantic import BaseModel, EmailStr

class SupportReplySchema(BaseModel):
    message_id: int
    email: EmailStr
    reply: str
