"use client";
import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { evaluateOMR } from "@/lib/api";
import type { ProcessingStep } from "@/types";

const ACCEPTED_TYPES = [".jpg", ".jpeg", ".png", ".pdf"];

const STEP_LABELS = [
  "Image loaded",
  "Image quality check",
  "Image preprocessing",
  "OMR sheet detected",
  "Perspective corrected",
  "Question grid detected",
  "Answers recognized",
  "Debug image generated",
];

export default function EvaluatePage() {
  const params = useParams();
  const router = useRouter();
  const testId = Number(params.id);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [steps, setSteps] = useState<ProcessingStep[]>([]);
  const [error, setError] = useState<string>("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setFile(f);
    setError("");
    setSteps([]);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  async function handleProcess() {
    if (!file) return;
    setProcessing(true);
    setError("");
    setWarnings([]);
    setSteps(STEP_LABELS.map(name => ({ name, status: "pending", message: "" })));

    // Simulate step progression while waiting
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < STEP_LABELS.length - 1) {
        setSteps(prev => prev.map((s, i) => i === stepIdx ? { ...s, status: "done" } : s));
        stepIdx++;
      }
    }, 400);

    try {
      const result = await evaluateOMR(testId, file);
      clearInterval(interval);
      // Update steps from API response
      if (result.steps) {
        setSteps(result.steps);
      } else {
        setSteps(STEP_LABELS.map(name => ({ name, status: "done", message: "" })));
      }
      setWarnings(result.warnings || []);

      // Navigate to review/result page
      setTimeout(() => {
        router.push(`/evaluations/${result.evaluation_id}/review?fromEval=1`);
      }, 600);
    } catch (err: any) {
      clearInterval(interval);
      setSteps(prev => prev.map((s, i) => ({ ...s, status: i < stepIdx ? "done" : i === stepIdx ? "error" : "pending" })));
      setError(err.message || "OMR processing failed");
      if (err.warnings) setWarnings(err.warnings);
      setProcessing(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-slate-900/30 mb-2">
          <Link href="/tests" className="hover:text-slate-600">Tests</Link>
          <span>›</span>
          <Link href={`/tests/${testId}`} className="hover:text-slate-600">Test #{testId}</Link>
          <span>›</span>
          <span className="text-slate-500">Evaluate OMR</span>
        </div>
        <h1 className="page-title">Evaluate OMR Sheet</h1>
        <p className="page-subtitle">Upload a scanned or photographed OMR answer sheet</p>
      </div>

      {/* Upload Area */}
      <div className="card mb-5">
        <h2 className="font-semibold text-slate-900 mb-4">Upload OMR Sheet</h2>

        <div
          className={`dropzone ${dragOver ? "drag-over" : ""} ${file ? "border-blue-500/30 bg-blue-500/4" : ""}`}
          onClick={() => !processing && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f && !processing) handleFile(f);
          }}
        >
          <input
            ref={fileRef} type="file" className="hidden"
            accept="image/*,.pdf"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {preview && !processing ? (
            <div className="flex flex-col items-center gap-3">
              <img src={preview} alt="OMR preview" className="max-h-48 rounded-lg border border-slate-200 object-contain" />
              <p className="text-slate-600 text-sm font-medium">{file?.name}</p>
              <p className="text-slate-900/30 text-xs">{file ? (file.size / 1024).toFixed(0) : 0} KB — Click to change</p>
            </div>
          ) : processing ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-400 rounded-full spinner" />
              <p className="text-blue-300 font-medium">Processing OMR sheet...</p>
              <p className="text-slate-900/30 text-sm">This may take a few seconds</p>
            </div>
          ) : (
            <>
              <div className="text-5xl mb-3">🖼️</div>
              <p className="text-slate-700 font-semibold text-lg">Drop OMR sheet here</p>
              <p className="text-slate-500 mt-1">or click to browse</p>
              <p className="text-slate-900/25 text-sm mt-3">Supports JPG, JPEG, PNG, PDF</p>
            </>
          )}
        </div>
      </div>

      {/* Processing Steps */}
      {steps.length > 0 && (
        <div className="card mb-5">
          <h2 className="font-semibold text-slate-900 mb-4">Processing Progress</h2>
          <div className="space-y-1">
            {steps.map((step, i) => (
              <div key={i} className="step-item">
                <div className={`step-icon ${step.status}`}>
                  {step.status === "done" ? "✓" : step.status === "error" ? "✗" : "○"}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${step.status === "done" ? "text-slate-900" : step.status === "error" ? "text-red-400" : "text-slate-900/30"}`}>
                    {step.name}
                  </p>
                  {step.message && (
                    <p className="text-xs text-slate-900/30 mt-0.5">{step.message}</p>
                  )}
                </div>
                {step.status === "pending" && processing && i === steps.findIndex(s => s.status === "pending") && (
                  <div className="w-4 h-4 border border-blue-400/30 border-t-blue-400 rounded-full spinner" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="card mb-5 border-amber-500/20 bg-amber-500/4">
          <p className="text-amber-400 font-medium text-sm mb-2">Warnings</p>
          {warnings.map((w, i) => <p key={i} className="text-amber-400/70 text-xs">⚠ {w}</p>)}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card mb-5 border-red-500/20 bg-red-500/4">
          <p className="text-red-400 font-medium text-sm mb-1">Processing Failed</p>
          <p className="text-red-400/70 text-xs">{error}</p>
          <div className="mt-3 p-3 rounded-lg bg-black/20 text-xs text-slate-900/30">
            <p className="font-medium mb-1">Possible reasons:</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Image is too blurry or low contrast</li>
              <li>OMR sheet is not fully visible</li>
              <li>Poor lighting conditions</li>
              <li>Image resolution too low (&lt;400×400)</li>
              <li>Template does not match this OMR format</li>
            </ul>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleProcess}
          disabled={!file || processing}
          className="btn btn-primary flex-1"
        >
          {processing ? (
            <><span className="spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Processing...</>
          ) : "Process OMR Sheet"}
        </button>
        <Link href={`/tests/${testId}`} className="btn btn-secondary">Cancel</Link>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-white/2 border border-white/4">
        <p className="text-xs text-slate-900/25">
          💡 For best results: ensure the OMR sheet fills most of the frame, use good lighting, and avoid heavy shadows.
          The system uses computer vision to detect filled bubbles — no AI or cloud processing.
        </p>
      </div>
    </div>
  );
}
