import os
import sys
import asyncio
from dotenv import load_dotenv
from loguru import logger

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

env_candidates = [
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.env"),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"),
    "server/.env",
    "./server/.env",
    ".env",
    "../.env",
]
for env_candidate in env_candidates:
    if os.path.exists(env_candidate):
        load_dotenv(env_candidate, override=True)
        break

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection
from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport
from pipecat.transports.base_transport import TransportParams
from pipecat.runner.types import RunnerArguments

from agent import run_pipecat_agent

app = FastAPI(title="BazzarAI Pipecat Voice Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_sessions = {}

@app.get("/health")
async def health_check():
    gemini_key = os.getenv("GEMINI_API_KEY")
    return {
        "status": "ok",
        "service": "pipecat-gemini-live",
        "gemini_configured": bool(gemini_key),
        "active_sessions": len(active_sessions)
    }

@app.post("/connect")
async def connect_webrtc(request: Request):
    """
    Signaling endpoint for SmallWebRTC:
    Receives SDP offer from client, initializes WebRTC peer connection,
    starts Pipecat agent pipeline, and returns the SDP answer.
    """
    try:
        body = await request.json()
        logger.info(f"Received WebRTC connect request: keys={list(body.keys())}")

        offer = body
        if "offer" in body and isinstance(body["offer"], dict):
            offer = body["offer"]

        sdp = offer.get("sdp")
        sdp_type = offer.get("type", "offer")

        if not sdp:
            raise HTTPException(status_code=400, detail="Missing WebRTC SDP offer")

        webrtc_connection = SmallWebRTCConnection()
        await webrtc_connection.initialize(sdp=sdp, type=sdp_type)

        transport = SmallWebRTCTransport(
            webrtc_connection=webrtc_connection,
            params=TransportParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
            )
        )

        session_id = f"sess_{id(webrtc_connection)}"
        active_sessions[session_id] = webrtc_connection

        async def send_event(data: dict):
            try:
                # Wrap in RTVI server-message envelope for @pipecat-ai/client-js
                rtvi_msg = {
                    "label": "rtvi-ai",
                    "type": "server-message",
                    "data": data
                }
                webrtc_connection.send_app_message(rtvi_msg)
            except Exception as e:
                logger.debug(f"Failed to send app message: {e}")

        runner_args = RunnerArguments(
            session_id=session_id
        )

        # Run Pipecat pipeline in background
        async def run_agent_task():
            try:
                await run_pipecat_agent(transport, runner_args, on_event_callback=send_event)
            except Exception as e:
                logger.error(f"Error in Pipecat agent session {session_id}: {e}")
            finally:
                active_sessions.pop(session_id, None)
                logger.info(f"Session {session_id} ended")

        asyncio.create_task(run_agent_task())

        answer = webrtc_connection.get_answer()
        if not answer:
            raise HTTPException(status_code=500, detail="Failed to generate WebRTC answer")

        response_payload = dict(answer)
        response_payload["sessionId"] = session_id
        return JSONResponse(response_payload)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error establishing WebRTC connection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("VOICE_PORT", 7860))
    logger.info(f"Starting Pipecat Voice Service on port {port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info")
