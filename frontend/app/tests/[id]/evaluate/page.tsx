"use client";
import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Button } from "@heroui/react";
import { ImagePlus, Lightbulb, ChevronRight, Check, X, Circle, Loader } from "lucide-react";
import { evaluateOMR } from "@/lib/api";
import type { ProcessingStep } from "@/types";
import CameraScanModal from "@/components/CameraScanModal";
import { Camera } from "reicon-react";

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
  const [showScanModal, setShowScanModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setFile(f);
    setError("");
    setSteps([]);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  function handleScanReady(f: File) {
    setShowScanModal(false);
    handleFile(f);
    // Auto-trigger processing after a short delay so the preview renders
    setTimeout(() => {
      handleProcess(f);
    }, 300);
  }

  async function handleProcess(overrideFile?: File) {
    const target = overrideFile ?? file;
    if (!target) return;
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
      const result = await evaluateOMR(testId, target);
      clearInterval(interval);
      if (result.steps) {
        setSteps(result.steps);
      } else {
        setSteps(STEP_LABELS.map(name => ({ name, status: "done", message: "" })));
      }
      setWarnings(result.warnings || []);

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
      {/* Camera Scan Modal */}
      {showScanModal && (
        <CameraScanModal
          testId={testId}
          onImageReady={handleScanReady}
          onClose={() => setShowScanModal(false)}
        />
      )}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-default-400 mb-2">
          <Link href="/tests" className="hover:text-foreground">Tests</Link>
          <ChevronRight size={12} />
          <Link href={`/tests/${testId}`} className="hover:text-foreground">Test #{testId}</Link>
          <ChevronRight size={12} />
          <span className="text-default-600">Evaluate OMR</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Evaluate OMR Sheet</h1>
        <p className="text-default-500 text-sm mt-1">Upload a scanned or photographed OMR answer sheet</p>
      </div>

      {/* Upload Area */}
      <Card variant="secondary" className="mb-5">
        <Card.Content className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Upload OMR Sheet</h2>
            <Button
              variant="primary"
              size="sm"
              onPress={() => setShowScanModal(true)}
              isDisabled={processing}
              className="gap-2"
            >
              <Camera weight="Filled" size={24} />
              Scan by Cam
            </Button>
          </div>

          <div
            className={`border-2 border-dashed rounded-2xl bg-white p-10 text-center cursor-pointer transition-all ${
              dragOver ? "border-primary-400 bg-primary-50" : ""
            } ${file && !processing ? "border-primary-300 bg-primary-50/50" : !dragOver ? "border-default-300 bg-default-50 hover:border-primary-300 hover:bg-primary-50" : ""}`}
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
                {file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf") ? (
                  <div className="h-48 aspect-[3/4] bg-default-100 rounded-lg border border-default-200 flex flex-col items-center justify-center gap-2">
                    <ImagePlus size={32} className="text-default-400" />
                    <span className="text-default-500 font-medium text-sm">PDF Document</span>
                  </div>
                ) : (
                  <img src={preview} alt="OMR preview" className="max-h-48 rounded-lg border border-default-200 object-contain" />
                )}
                <p className="text-default-700 text-sm font-medium">{file?.name}</p>
                <p className="text-default-400 text-xs">{file ? (file.size / 1024).toFixed(0) : 0} KB — Click to change</p>
              </div>
            ) : processing ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-12 h-12 border-2 border-primary-200 border-t-primary rounded-full spinner" />
                <p className="text-primary font-medium">Processing OMR sheet...</p>
                <p className="text-default-400 text-sm">This may take a few seconds</p>
              </div>
            ) : (
              <>
                <ImagePlus size={36} className="mx-auto mb-6 text-default-300" />
                <p className="text-default-700 font-semibold text-lg">Drop OMR sheet here</p>
                <p className="text-default-500 mt-1">or click to browse</p>
                <p className="text-default-400 text-sm mt-3">Supports JPG, JPEG, PNG, PDF</p>
              </>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Processing Steps */}
      {steps.length > 0 && (
        <Card  className="mb-5 border border-default-200">
          <Card.Content className="p-6">
            <h2 className="font-semibold text-foreground mb-4">Processing Progress</h2>
            <div className="space-y-1">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    step.status === "done" ? "bg-success-100 text-success" : step.status === "error" ? "bg-danger-100 text-danger" : "bg-default-100 text-default-400"
                  }`}>
                    {step.status === "done" ? <Check size={14} /> : step.status === "error" ? <X size={14} /> : <Circle size={14} />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${step.status === "done" ? "text-foreground" : step.status === "error" ? "text-danger" : "text-default-400"}`}>
                      {step.name}
                    </p>
                    {step.message && (
                      <p className="text-xs text-default-400 mt-0.5">{step.message}</p>
                    )}
                  </div>
                  {step.status === "pending" && processing && i === steps.findIndex(s => s.status === "pending") && (
                    <Loader size={14} className="text-primary spinner" />
                  )}
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="mb-5 border border-warning-200 bg-warning-50" >
          <Card.Content className="p-4">
            <p className="text-warning-600 font-medium text-sm mb-2">Warnings</p>
            {warnings.map((w, i) => <p key={i} className="text-warning-500 text-xs flex items-center gap-1"><Lightbulb size={12} /> {w}</p>)}
          </Card.Content>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="mb-5 border border-danger-200 bg-danger-50" >
          <Card.Content className="p-4">
            <p className="text-danger font-medium text-sm mb-1">Processing Failed</p>
            <p className="text-danger-500 text-xs">{error}</p>
            <div className="mt-3 p-3 rounded-lg bg-default-100 text-xs text-default-500">
              <p className="font-medium mb-1">Possible reasons:</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Image is too blurry or low contrast</li>
                <li>OMR sheet is not fully visible</li>
                <li>Poor lighting conditions</li>
                <li>Image resolution too low (&lt;400x400)</li>
                <li>Template does not match this OMR format</li>
              </ul>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onPress={() => handleProcess()}
          isDisabled={!file || processing}
          variant="primary"
          className="flex-1"
          isPending={processing}
        >
          {processing ? "Processing..." : "Process OMR Sheet"}
        </Button>
        <Link href={`/tests/${testId}`}>
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <Card className="mt-4 border border-default-200 bg-default-50" >
        <Card.Content className="p-3 flex flex-row items-start gap-2">
          <Lightbulb size={14} className="text-default-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-default-500">
            For best results: ensure the OMR sheet fills most of the frame, use good lighting, and avoid heavy shadows.
            The system uses computer vision to detect filled bubbles — no AI or cloud processing.
          </p>
        </Card.Content>
      </Card>
    </div>
  );
}
