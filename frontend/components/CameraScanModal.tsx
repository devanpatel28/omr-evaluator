"use client";
import { useEffect, useRef, useState } from "react";
import { Modal, Button, Card } from "@heroui/react";
import { useOverlayState } from "@heroui/react";
import { Camera, CheckCircle, Link3, MonitorPhone, } from "reicon-react";
import QRCode from "qrcode";

interface Props {
  testId: number;
  onImageReady: (file: File) => void;
  onClose: () => void;
}

type Status = "loading" | "waiting" | "received" | "error";

const BACKEND          = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const POLL_INTERVAL_MS = 5000;

export default function CameraScanModal({ testId, onImageReady, onClose }: Props) {
  const state = useOverlayState({ defaultOpen: true });

  const [code, setCode]       = useState("");
  const [scanUrl, setScanUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [status, setStatus]   = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const codeRef  = useRef("");
  const baseRef  = useRef(BACKEND);

  // ── Create session on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BACKEND}/api/scan/create`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to create scan session");
        const data = await res.json();
        if (cancelled) return;

        const c: string   = data.code;
        const url: string = data.scan_url;

        // Derive backend base from the returned LAN URL
        const parsed = new URL(url);
        const base   = `${parsed.protocol}//${parsed.hostname}:8000`;

        codeRef.current = c;
        baseRef.current = base;
        setCode(c);
        setScanUrl(url);

        // Generate QR as data URL — works in browser with no canvas issues
        const dataUrl = await QRCode.toDataURL(url, {
          width: 200,
          margin: 1,
          color: { dark: "#1e1b4b", light: "#ffffff" },
        });
        if (!cancelled) {
          setQrDataUrl(dataUrl);
          setStatus("waiting");
          startPolling(c, base);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErrorMsg(e.message || "Could not create scan session");
          setStatus("error");
        }
      }
    })();

    return () => { cancelled = true; doCleanup(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startPolling(c: string, base: string) {
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${base}/api/scan/${c}/status`);
        const data = await res.json();
        if (data.status === "received") {
          clearInterval(pollRef.current!);
          setStatus("received");
          setTimeout(() => downloadAndUse(c, base), 500);
        } else if (data.status === "expired") {
          clearInterval(pollRef.current!);
          setErrorMsg("Session expired. Please try again.");
          setStatus("error");
        }
      } catch { /* network blip — keep polling */ }
    }, POLL_INTERVAL_MS);
  }

  async function downloadAndUse(c: string, base: string) {
    try {
      const res  = await fetch(`${base}/api/scan/${c}/image`);
      const blob = await res.blob();
      const file = new File([blob], `scan-${c}.jpg`, { type: "image/jpeg" });
      state.close();
      onImageReady(file);
    } catch (e: any) {
      setErrorMsg("Failed to download image: " + e.message);
      setStatus("error");
    }
  }

  function doCleanup() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (codeRef.current) {
      fetch(`${baseRef.current}/api/scan/${codeRef.current}`, { method: "DELETE" }).catch(() => {});
    }
  }

  function handleClose() {
    doCleanup();
    state.close();
    onClose();
  }

  const digits = code ? code.split("") : ["·", "·", "·", "·"];

  return (
    <Modal state={state}>
      {/* <Modal.Backdrop isDismissable={false} /> */}
      <Modal.Container size="sm" placement="center">
        <Modal.Dialog>
          {/* Header */}
          <Modal.Header className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-default-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
                <MonitorPhone size={32} className="text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground text-base leading-tight">Scan by Camera</p>
                <p className="text-xs text-default-400 leading-tight mt-0.5">Open on your phone (same network)</p>
              </div>
            </div>
            {/* <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-default-100 transition-colors text-default-400"
            >
              <X size={16} />
            </button> */}
          </Modal.Header>

          {/* Body */}
          <Modal.Body className="px-6 py-5">

            {/* LOADING */}
            {status === "loading" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Link3 size={32} className="animate-spin text-primary" />
                <p className="text-sm text-default-500">Generating scan code…</p>
              </div>
            )}

            {/* ERROR */}
            {status === "error" && (
              <div className="text-center py-6">
                <p className="text-danger text-sm mb-4">{errorMsg}</p>
                <Button onPress={handleClose} variant="outline" size="sm">Close</Button>
              </div>
            )}

            {/* WAITING */}
            {status === "waiting" && (
              <div className="flex flex-col items-center gap-5">

                {/* 4-digit code */}
                {/* <div className="w-full">
                  <p className="text-xs text-center text-default-400 uppercase tracking-widest mb-3">
                    Enter this code on your phone
                  </p>
                  <div className="flex gap-3 justify-center">
                    {digits.map((d, i) => (
                      <div
                        key={i}
                        className="w-14 h-16 rounded-2xl bg-primary-50 border-2 border-primary-200 flex items-center justify-center text-3xl font-black text-primary"
                        style={{ fontFamily: "monospace" }}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </div> */}

                {/* Divider */}
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 h-px bg-default-200" />
                  <span className="text-xs text-default-400 uppercase tracking-wider">or scan QR</span>
                  <div className="flex-1 h-px bg-default-200" />
                </div>

                {/* QR — rendered as <img> from data URL, no canvas issues */}
                <div className="rounded-2xl border-4 border-default-200 overflow-hidden bg-white p-1">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrDataUrl} alt="Scan QR code" width={200} height={200} />
                  ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center">
                      <Link3 size={24} className="animate-spin text-default-300" />
                    </div>
                  )}
                </div>

                {/* URL */}
                <Card variant="secondary" className="w-full">
                  <Card.Content className="text-center">
                    <p className="text-xs break-all font-mono text-primary">{scanUrl}</p>
                  </Card.Content>
                </Card>

                {/* Pulse dots */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-primary inline-block"
                        style={{ animation: `scanDot 1.2s ease-in-out ${i * 0.2}s infinite` }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-default-500">Waiting for phone to scan…</p>
                </div>

                <p className="text-xs text-default-300">Session expires in 10 minutes</p>
              </div>
            )}

            {/* RECEIVED */}
            {status === "received" && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div
                  className="w-16 h-16 rounded-full bg-success-100 border-2 border-success-300 flex items-center justify-center"
                  style={{ animation: "scanPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
                >
                  <CheckCircle size={32} className="text-success" />
                </div>
                <p className="font-bold text-foreground text-lg">Image Received!</p>
                <p className="text-sm text-default-500">Loading into evaluator…</p>
              </div>
            )}
          </Modal.Body>

          {/* Footer */}
          {(status === "waiting" || status === "error") && (
            <Modal.Footer className="px-6 pb-5 pt-0">
              <Button onPress={handleClose} variant="danger-soft" className="w-full">
                Cancel
              </Button>
            </Modal.Footer>
          )}
        </Modal.Dialog>
      </Modal.Container>

      <style>{`
        @keyframes scanDot {
          0%, 100% { opacity: 0.3; transform: scale(0.7); }
          50%       { opacity: 1;   transform: scale(1);   }
        }
        @keyframes scanPop {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </Modal>
  );
}
