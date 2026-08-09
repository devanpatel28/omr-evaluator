"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createTest, uploadAnswerKey } from "@/lib/api";

export default function NewTestPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(200);
  const [correctMarks, setCorrectMarks] = useState(1.0);
  const [wrongMarks, setWrongMarks] = useState(-1.25);
  const [eMarks, setEMarks] = useState(-1.0);
  const [unansweredMarks, setUnansweredMarks] = useState(0.0);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [keyErrors, setKeyErrors] = useState<string[]>([]);
  const [keyWarnings, setKeyWarnings] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyFile) { setError("Please upload an answer key file."); return; }
    setError(""); setKeyErrors([]); setKeyWarnings([]);
    setSaving(true);
    try {
      // Create test
      const test = await createTest({
        name,
        total_questions: totalQuestions,
        correct_marks: correctMarks,
        wrong_marks: wrongMarks,
        e_marks: eMarks,
        unanswered_marks: unansweredMarks,
      });
      // Upload answer key
      try {
        const keyResult = await uploadAnswerKey(test.id, keyFile);
        if (keyResult.warnings?.length) setKeyWarnings(keyResult.warnings);
        router.push(`/tests/${test.id}`);
      } catch (keyErr: any) {
        setKeyErrors(keyErr.errors || [keyErr.message]);
        setSaving(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create test");
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="page-title">Create New Test</h1>
        <p className="page-subtitle">Configure test settings and upload the answer key</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Test Info */}
        <div className="card space-y-5">
          <h2 className="font-semibold text-slate-900 border-b border-white/5 pb-3">Test Information</h2>

          <div>
            <label className="label">Test Name *</label>
            <input className="input" required value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. NEET Mock Test 01" />
          </div>

          <div>
            <label className="label">Total Questions *</label>
            <input className="input" type="number" min={1} max={200} required
              value={totalQuestions} onChange={e => setTotalQuestions(Number(e.target.value))} />
            <p className="text-xs text-slate-900/30 mt-1">Maximum: 200 questions</p>
          </div>
        </div>

        {/* Scoring */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-900 border-b border-white/5 pb-3">Scoring Rules</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Correct Answer", value: correctMarks, setter: setCorrectMarks, hint: "Marks awarded for correct answer" },
              { label: "Wrong Answer (A/B/C/D)", value: wrongMarks, setter: setWrongMarks, hint: "Marks deducted for wrong answer" },
              { label: "E / Don't Know", value: eMarks, setter: setEMarks, hint: "Marks deducted when student selects E" },
              { label: "Unanswered", value: unansweredMarks, setter: setUnansweredMarks, hint: "Marks for unanswered questions" },
            ].map(field => (
              <div key={field.label}>
                <label className="label">{field.label}</label>
                <input className="input" type="number" step="0.01"
                  value={field.value}
                  onChange={e => field.setter(Number(e.target.value))} />
                <p className="text-xs text-slate-900/25 mt-1">{field.hint}</p>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="mt-2 p-3 rounded-xl bg-white/3 border border-white/5">
            <p className="text-xs text-slate-500 font-medium mb-2">Score Preview (example: 100✓ 40✗ 20E 40—)</p>
            <p className="text-sm text-slate-900">
              {((100 * correctMarks) + (40 * wrongMarks) + (20 * eMarks) + (40 * unansweredMarks)).toFixed(2)} marks
            </p>
          </div>
        </div>

        {/* Answer Key */}
        <div className="card">
          <h2 className="font-semibold text-slate-900 border-b border-white/5 pb-3 mb-4">Answer Key *</h2>

          <div
            className={`dropzone ${keyFile ? "border-emerald-500/40 bg-emerald-500/4" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
            onDragLeave={e => e.currentTarget.classList.remove("drag-over")}
            onDrop={e => {
              e.preventDefault();
              e.currentTarget.classList.remove("drag-over");
              const f = e.dataTransfer.files[0];
              if (f) setKeyFile(f);
            }}
          >
            <input ref={fileRef} type="file" accept=".json,.csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setKeyFile(f); }} />

            {keyFile ? (
              <>
                <p className="text-3xl mb-2">✅</p>
                <p className="text-emerald-400 font-medium">{keyFile.name}</p>
                <p className="text-slate-900/30 text-sm mt-1">{(keyFile.size / 1024).toFixed(1)} KB — Click to change</p>
              </>
            ) : (
              <>
                <p className="text-4xl mb-3">📄</p>
                <p className="text-slate-600 font-medium">Drop answer key here or click to browse</p>
                <p className="text-slate-900/30 text-sm mt-1">Supported: JSON, CSV</p>
                <div className="mt-3 text-xs text-slate-900/20 font-mono">
                  CSV: question,answer&nbsp;&nbsp;|&nbsp;&nbsp;JSON: [{"{question:1, answer:'A'}"}]
                </div>
              </>
            )}
          </div>

          {keyErrors.length > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/8 border border-red-500/20">
              <p className="text-red-400 text-sm font-medium mb-2">Answer key validation errors:</p>
              <ul className="space-y-1">
                {keyErrors.map((e, i) => <li key={i} className="text-red-400/70 text-xs">• {e}</li>)}
              </ul>
            </div>
          )}

          {keyWarnings.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
              {keyWarnings.map((w, i) => <p key={i} className="text-amber-400/70 text-xs">⚠ {w}</p>)}
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
            {saving ? <><span className="spinner inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Creating...</> : "Create Test"}
          </button>
          <a href="/tests" className="btn btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  );
}
