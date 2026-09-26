from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio

app = FastAPI(title="Mahoraga CMI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/compile")
async def compile_jocky_script(script_content: str):
    # This endpoint will take the code from the Monaco editor
    # write it to a temporary .jocky file, and trigger the pipeline.
    return {"status": "success", "message": "Compilation initiated"}

async def mock_compiler_stream():
    # This simulates the live terminal output for xterm.js
    stages = [
        "[parser] 42 tokens\n",
        "[semantic] 8 nodes\n",
        "[capability] PASS\n",
        "[ir] 6 operations\n",
        "[provider] win32\n"
    ]
    for stage in stages:
        yield f"data: {stage}\n\n"
        await asyncio.sleep(0.5)
        
@app.get("/api/stream")
async def stream_terminal_output():
    # The React frontend will connect to this via EventSource
    return StreamingResponse(mock_compiler_stream(), media_type="text/event-stream")