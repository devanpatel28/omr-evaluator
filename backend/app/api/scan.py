"""
Mobile Camera Scan API
Generates 4-digit codes, manages ephemeral scan sessions, receives uploaded
images from the phone browser and makes them available to the PC frontend.
"""
import os
import random
import string
import time
import threading
from pathlib import Path
from typing import Dict, Optional

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, UploadFile, File
# pyrefly: ignore [missing-import]
from fastapi.responses import FileResponse, JSONResponse

from app.core.config import settings

router = APIRouter(prefix="/api/scan", tags=["scan"])

# ---------------------------------------------------------------------------
# In-memory session store
# Each entry: { "created_at": float, "image_path": str|None, "status": str }
# ---------------------------------------------------------------------------
_sessions: Dict[str, dict] = {}
_sessions_lock = threading.Lock()

SESSION_TTL = 600  # 10 minutes


def _get_lan_ip() -> str:
    """
    Return the best LAN / hotspot IP that a phone on the same network
    can reach. Falls back to 127.0.0.1 if nothing useful is found.
    """
    import socket
    # Try connecting to an external address (no data sent) to find
    # the outgoing interface that reaches the local network.
    candidates = []
    for target in [("8.8.8.8", 80), ("1.1.1.1", 80)]:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.settimeout(0.5)
            s.connect(target)
            candidates.append(s.getsockname()[0])
            s.close()
        except Exception:
            pass

    # Also enumerate all host addresses
    try:
        hostname = socket.gethostname()
        all_ips = socket.getaddrinfo(hostname, None, socket.AF_INET)
        for info in all_ips:
            ip = info[4][0]
            if not ip.startswith("127."):
                candidates.append(ip)
    except Exception:
        pass

    # Prefer 192.168.x.x / 172.x.x.x / 10.x.x.x in that order
    for prefix in ["192.168.", "172.", "10."]:
        for ip in candidates:
            if ip.startswith(prefix):
                return ip

    return candidates[0] if candidates else "127.0.0.1"



def _cleanup_expired():
    """Remove sessions older than SESSION_TTL."""
    now = time.time()
    with _sessions_lock:
        expired = [k for k, v in _sessions.items() if now - v["created_at"] > SESSION_TTL]
        for k in expired:
            # Remove uploaded image if present
            img = _sessions[k].get("image_path")
            if img and os.path.exists(img):
                try:
                    os.remove(img)
                except OSError:
                    pass
            del _sessions[k]


def _generate_code() -> str:
    """Generate a unique 4-digit numeric code."""
    _cleanup_expired()
    for _ in range(100):
        code = "".join(random.choices(string.digits, k=4))
        with _sessions_lock:
            if code not in _sessions:
                return code
    raise RuntimeError("Could not generate unique scan code")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/create")
def create_scan_session():
    """
    PC calls this to create a new scan session.
    Returns: { code, lan_ip, scan_url }
    """
    code = _generate_code()
    lan_ip = _get_lan_ip()
    with _sessions_lock:
        _sessions[code] = {
            "created_at": time.time(),
            "image_path": None,
            "status": "waiting",  # waiting | received
        }
    scan_url = f"http://{lan_ip}:8000/scan/{code}"
    return {"code": code, "lan_ip": lan_ip, "scan_url": scan_url}


@router.get("/{code}/status")
def get_scan_status(code: str):
    """
    PC polls this to check if the phone has uploaded an image.
    Returns: { status: "waiting" | "received" | "expired" }
    """
    _cleanup_expired()
    with _sessions_lock:
        session = _sessions.get(code)
    if session is None:
        return {"status": "expired"}
    return {"status": session["status"]}


@router.post("/{code}/upload")
async def upload_scan_image(code: str, file: UploadFile = File(...)):
    """
    Phone posts the processed (cropped + grayscale) image here.
    Saves the file and marks the session as received.
    """
    _cleanup_expired()
    with _sessions_lock:
        session = _sessions.get(code)
    if session is None:
        raise HTTPException(status_code=404, detail="Scan session not found or expired")
    if session["status"] == "received":
        raise HTTPException(status_code=409, detail="Image already uploaded for this session")

    # Save the uploaded image to a tmp directory
    scan_tmp_dir = settings.EVALUATIONS_DIR / "scan_tmp"
    scan_tmp_dir.mkdir(parents=True, exist_ok=True)

    ext = os.path.splitext(file.filename or "scan.jpg")[1] or ".jpg"
    image_path = scan_tmp_dir / f"scan_{code}{ext}"

    import shutil
    with open(image_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    with _sessions_lock:
        _sessions[code]["image_path"] = str(image_path)
        _sessions[code]["status"] = "received"

    return {"success": True}


@router.get("/{code}/image")
def get_scan_image(code: str):
    """
    PC downloads the uploaded scan image after polling status = received.
    """
    with _sessions_lock:
        session = _sessions.get(code)
    if session is None:
        raise HTTPException(status_code=404, detail="Scan session not found or expired")
    if session["status"] != "received":
        raise HTTPException(status_code=404, detail="Image not yet uploaded")
    img_path = session.get("image_path")
    if not img_path or not os.path.exists(img_path):
        raise HTTPException(status_code=404, detail="Image file missing")
    return FileResponse(img_path, media_type="image/jpeg")


@router.delete("/{code}")
def delete_scan_session(code: str):
    """PC cancels the session (user closed the modal)."""
    with _sessions_lock:
        session = _sessions.pop(code, None)
    if session:
        img = session.get("image_path")
        if img and os.path.exists(img):
            try:
                os.remove(img)
            except OSError:
                pass
    return {"success": True}
