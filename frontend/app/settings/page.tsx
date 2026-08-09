"use client";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [local, setLocal] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("http://localhost:8000/api/settings")
      .then(r => r.json())
      .then(s => { setSettings(s); setLocal({ ...s }); })
      .catch(() => {});
  }, []);

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">OMR processing configuration and system settings</p>
      </div>

      {/* OMR Processing Config */}
      <div className="card mb-5">
        <h2 className="font-semibold text-slate-900 mb-1">OMR Detection Parameters</h2>
        <p className="text-xs text-slate-900/30 mb-4">
          These values are read from the backend config. To change them permanently, edit
          <code className="bg-white/8 px-1 rounded mx-1">backend/.env</code> or
          <code className="bg-white/8 px-1 rounded mx-1">backend/app/core/config.py</code>.
        </p>

        {local ? (
          <div className="space-y-4">
            {[
              { key: "fill_threshold", label: "Fill Threshold", hint: "Minimum fill ratio (0.0–1.0) to consider a bubble marked. Default: 0.35", min: 0.1, max: 0.9, step: 0.01 },
              { key: "confidence_threshold", label: "Confidence Threshold", hint: "Below this value, the detection is flagged as low confidence. Default: 0.80", min: 0.1, max: 1.0, step: 0.01 },
              { key: "ambiguity_margin", label: "Ambiguity Margin", hint: "If top-2 bubbles differ by less than this, mark AMBIGUOUS. Default: 0.10", min: 0.01, max: 0.3, step: 0.01 },
            ].map(f => (
              <div key={f.key}>
                <div className="flex justify-between mb-1">
                  <label className="label mb-0">{f.label}</label>
                  <span className="text-sm font-mono text-blue-400">{local[f.key]?.toFixed(2)}</span>
                </div>
                <input
                  type="range" min={f.min} max={f.max} step={f.step}
                  value={local[f.key]}
                  onChange={e => setLocal((p: any) => ({ ...p, [f.key]: Number(e.target.value) }))}
                  className="w-full accent-blue-500"
                />
                <p className="text-xs text-slate-900/25 mt-1">{f.hint}</p>
              </div>
            ))}

            <div className="p-3 rounded-xl bg-amber-500/6 border border-amber-500/15 mt-4">
              <p className="text-amber-400 text-xs">
                ⚠ These sliders show current values for reference only. To apply new values, update
                the environment variables in the backend and restart the server.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-900/30 text-sm">Backend not connected</p>
            <p className="text-slate-900/20 text-xs mt-1">Start the FastAPI server to view settings</p>
          </div>
        )}
      </div>

      {/* System info */}
      <div className="card">
        <h2 className="font-semibold text-slate-900 mb-4">System Information</h2>
        <div className="space-y-3 text-sm">
          {[
            { label: "Frontend", value: "Next.js + TypeScript + Tailwind CSS" },
            { label: "Backend", value: "Python + FastAPI + OpenCV + NumPy" },
            { label: "Database", value: "SQLite (local, no cloud)" },
            { label: "OMR Engine", value: "Computer vision (no AI, no cloud)" },
            { label: "Authentication", value: "None required" },
            { label: "Internet Required", value: "No — fully local" },
            { label: "Max Questions", value: "200 per test" },
            { label: "Export Formats", value: "CSV, JSON, PDF" },
          ].map(item => (
            <div key={item.label} className="flex justify-between py-2 border-b border-white/4 last:border-0">
              <span className="text-slate-500">{item.label}</span>
              <span className="text-slate-800 text-right max-w-[60%]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data locations */}
      <div className="card mt-5">
        <h2 className="font-semibold text-slate-900 mb-4">Data Storage</h2>
        <div className="space-y-2 font-mono text-xs text-slate-500">
          <p>📁 data/database/omr.sqlite</p>
          <p>📁 data/tests/&lt;test-id&gt;/</p>
          <p>📁 data/evaluations/&lt;eval-id&gt;/</p>
          <p>📁 data/templates/</p>
        </div>
        <p className="text-xs text-slate-900/25 mt-3">All data stored locally in the omr-evaluator/ project directory</p>
      </div>
    </div>
  );
}
