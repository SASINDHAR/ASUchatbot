"""
Chat backend: Google ADK agent behind a simple FastAPI server.

Only two endpoints are exposed — no ADK internals leak through:

  GET  /health
  POST /chat   JSON: {"message": "...", "session_id": "<optional>", "user_id": "<optional>"}

Run:
  export GOOGLE_API_KEY=...
  cd backend
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import os
import uuid
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
from pydantic import BaseModel, Field

from asu_agent import root_agent

APP_NAME = "asu_assistant"
session_service = InMemorySessionService()
runner = Runner(
    app_name=APP_NAME,
    agent=root_agent,
    session_service=session_service,
)

app = FastAPI(
    title="International Student Chat API",
    version="1.0.0",
    description="Simple JSON chat endpoint powered by Google ADK.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: Optional[str] = None
    user_id: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    reply: str


async def _ensure_session(user_id: str, session_id: str):
    """Return an existing session or create a new one."""
    existing = await session_service.get_session(
        app_name=APP_NAME, user_id=user_id, session_id=session_id
    )
    if existing:
        return existing
    return await session_service.create_session(
        app_name=APP_NAME, user_id=user_id, session_id=session_id
    )


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    if not os.getenv("GOOGLE_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="GOOGLE_API_KEY is not set",
        )

    uid = body.user_id or "default_user"
    sid = body.session_id.strip() if body.session_id else ""
    if not sid:
        sid = str(uuid.uuid4())

    await _ensure_session(uid, sid)

    user_message = Content(role="user", parts=[Part.from_text(text=body.message)])

    final_text_parts: list[str] = []
    try:
        async for event in runner.run_async(
            user_id=uid,
            session_id=sid,
            new_message=user_message,
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text and event.content.role == "model":
                        final_text_parts.append(part.text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    reply = "".join(final_text_parts).strip()
    if not reply:
        reply = "Sorry, I could not generate a response. Please try again."

    return ChatResponse(session_id=sid, reply=reply)
