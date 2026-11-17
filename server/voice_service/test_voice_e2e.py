import asyncio
import json
import uuid
import aiohttp
from aiortc import RTCPeerConnection, RTCSessionDescription, AudioStreamTrack
from av import AudioFrame
import numpy as np

class SilenceAudioTrack(AudioStreamTrack):
    """Generates silent audio frames at 16kHz for WebRTC"""
    def __init__(self):
        super().__init__()
        self.sample_rate = 16000
        self.channels = 1
        self.pts = 0

    async def recv(self):
        pts = self.pts
        self.pts += 960  # 60ms at 16kHz
        data = np.zeros(960, dtype=np.int16)
        frame = AudioFrame.from_ndarray(data.reshape(1, -1), format='s16', layout='mono')
        frame.sample_rate = self.sample_rate
        frame.pts = pts
        await asyncio.sleep(0.06)
        return frame

async def test_voice_e2e():
    url = "http://localhost:5001/api/voice/connect"
    print("1. Initializing WebRTC PeerConnection...")
    pc = RTCPeerConnection()
    
    audio_track = SilenceAudioTrack()
    pc.addTrack(audio_track)

    dc = pc.createDataChannel("pipecat_data_channel")
    
    received_messages = []
    received_audio_frames = 0
    done_event = asyncio.Event()

    @dc.on("open")
    def on_dc_open():
        print("✅ WebRTC DataChannel is OPEN!")
        # 1. Send page context update with valid RTVI message schema
        ctx_msg = {
            "id": str(uuid.uuid4()),
            "label": "rtvi-ai",
            "type": "client-message",
            "data": {
                "t": "page_context_update",
                "d": {
                    "pathname": "/products/performance-ivory-t-shirt-28",
                    "product": {
                        "title": "Performance Ivory T-Shirt",
                        "basePrice": 89.99,
                        "selectedPrice": 89.99,
                        "selectedVariant": "M",
                        "stockCount": 15,
                        "inStock": True,
                        "description": "High performance breathable cotton ivory t-shirt."
                    }
                }
            }
        }
        dc.send(json.dumps(ctx_msg))
        print("📤 Sent page context update")

        asyncio.create_task(send_order_query())

    async def send_order_query():
        # Wait 2 seconds for greeting/ready
        await asyncio.sleep(2.0)
        query_msg = {
            "id": str(uuid.uuid4()),
            "label": "rtvi-ai",
            "type": "client-message",
            "data": {
                "t": "user_text",
                "d": {
                    "text": "আমার নাম সাদিক, মিরপুর ১০ ঢাকা। মোবাইল 01712345678। এই টি-শার্ট ১টি ক্যাশ অন ডেলিভারিতে অর্ডার দিন।"
                }
            }
        }
        print("📤 Sending direct order confirmation prompt...")
        dc.send(json.dumps(query_msg))

    @dc.on("message")
    def on_dc_message(msg):
        received_messages.append(msg)
        try:
            parsed = json.loads(msg)
            msg_type = parsed.get("type")
            data = parsed.get("data", {})
            if msg_type == "server-message":
                inner = data if isinstance(data, dict) else {}
                if inner.get("type") == "order_confirmed":
                    print(f"\n🎉 ORDER CONFIRMED EVENT RECEIVED OVER WEBRTC!\nOrder: {json.dumps(inner.get('order'), indent=2)}")
                    done_event.set()
                elif inner.get("type") == "transcript":
                    role = inner.get("role")
                    text = inner.get("text")
                    print(f"💬 Transcript [{role}]: {text}")
            elif msg_type == "user-transcript":
                print(f"👤 User transcript: {data.get('text')}")
            elif msg_type == "bot-transcript":
                print(f"🤖 Bot transcript: {data.get('text')}")
            elif msg_type == "bot-llm-text":
                print(f"🤖 Bot text chunk: {data.get('text')}")
        except Exception:
            pass

    @pc.on("track")
    def on_track(track):
        nonlocal received_audio_frames
        print(f"🎵 Remote audio track received: kind={track.kind}")
        if track.kind == "audio":
            async def read_audio():
                nonlocal received_audio_frames
                try:
                    while True:
                        frame = await track.recv()
                        received_audio_frames += 1
                        if received_audio_frames % 50 == 0:
                            print(f"🔊 Received {received_audio_frames} audio frames from Gemini Voice!")
                except Exception as e:
                    pass
            asyncio.create_task(read_audio())

    print("2. Creating local SDP offer...")
    offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    print("3. Sending offer to Express proxy /api/voice/connect...")
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json={"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}) as resp:
            answer_json = await resp.json()

    print(f"4. Received answer from Pipecat: keys={list(answer_json.keys())}")
    answer = RTCSessionDescription(sdp=answer_json["sdp"], type=answer_json["type"])
    await pc.setRemoteDescription(answer)
    print("5. WebRTC remote description set! Conversing with Voice Agent...")

    # Wait up to 18 seconds
    try:
        await asyncio.wait_for(done_event.wait(), timeout=18.0)
    except asyncio.TimeoutError:
        print("⏱️ Timeout reached")

    print(f"\n--- TEST SUMMARY ---")
    print(f"Total Audio Frames: {received_audio_frames}")
    print(f"Total Data Messages: {len(received_messages)}")
    print(f"Connection State: {pc.connectionState}")

    await pc.close()
    return received_audio_frames > 0

if __name__ == "__main__":
    success = asyncio.run(test_voice_e2e())
    print(f"\nFinal Result: {'PASS' if success else 'FAIL'}")
