"use client";
import { useEffect, useState } from "react";
import { fetchDefaultTemplate, updateTemplate } from "@/lib/api";
import GenerateSheetModal from "./GenerateSheetModal";

export default function TemplatesPage() {
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editSection, setEditSection] = useState<number | null>(null);
  const [localTemplate, setLocalTemplate] = useState<any>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  useEffect(() => {
    fetchDefaultTemplate().then(t => {
      setTemplate(t);
      setLocalTemplate(JSON.parse(JSON.stringify(t)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!localTemplate) return;
    setSaving(true);
    try {
      await updateTemplate("omrly-default-200", localTemplate);
      setTemplate(localTemplate);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  function updateSection(idx: number, field: string, value: number) {
    setLocalTemplate((prev: any) => {
      const t = JSON.parse(JSON.stringify(prev));
      t.sections[idx][field] = value;
      return t;
    });
  }

  if (loading) return <div className="p-8 text-slate-500">Loading template...</div>;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="page-title">OMR Templates</h1>
          <p className="page-subtitle">Calibrate bubble grid coordinates for your OMR sheet format</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="btn btn-primary bg-indigo-600 hover:bg-indigo-500 border-indigo-500"
        >
          Generate Sheet PDF
        </button>
      </div>

      {showGenerateModal && (
        <GenerateSheetModal onClose={() => setShowGenerateModal(false)} />
      )}

      {template && localTemplate && (
        <div className="space-y-6">
          {/* Info card */}
          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-4">Template Info</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Template Name", value: localTemplate.name },
                { label: "Total Questions", value: localTemplate.total_questions },
                { label: "Options", value: localTemplate.options?.join(", ") },
                { label: "Page Width (px)", value: localTemplate.page_width },
                { label: "Page Height (px)", value: localTemplate.page_height },
                { label: "Sections", value: localTemplate.sections?.length },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="text-sm text-slate-900 font-medium mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sections calibration */}
          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-2">Column Sections</h2>
            <p className="text-xs text-slate-500 mb-4">
              The OMRly sheet has 4 columns of 50 questions each. Adjust the coordinates to match the
              actual bubble positions after perspective correction to 1000×1400 px.
            </p>

            <div className="space-y-4">
              {localTemplate.sections?.map((section: any, idx: number) => (
                <div key={idx} className="border border-white/6 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setEditSection(editSection === idx ? null : idx)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-900">
                      Column {idx + 1}: Questions {section.start_question}–{section.end_question}
                    </span>
                    <span className="text-slate-900/30 text-sm">{editSection === idx ? "▲" : "▼"}</span>
                  </button>

                  {editSection === idx && (
                    <div className="px-4 pb-4 grid grid-cols-2 lg:grid-cols-3 gap-4 border-t border-white/5 pt-4">
                      {[
                        { field: "start_x", label: "Start X (Option A center)", hint: "X coord of leftmost bubble" },
                        { field: "start_y", label: "Start Y (Q1 center)", hint: "Y coord of first question row" },
                        { field: "row_height", label: "Row Height (px)", hint: "Vertical distance between rows" },
                        { field: "option_spacing", label: "Option Spacing (px)", hint: "Horizontal gap between A,B,C,D,E" },
                        { field: "bubble_radius", label: "Bubble Radius (px)", hint: "Radius of each bubble circle" },
                      ].map(f => (
                        <div key={f.field}>
                          <label className="label">{f.label}</label>
                          <input
                            className="input"
                            type="number"
                            step="0.1"
                            value={section[f.field]}
                            onChange={e => updateSection(idx, f.field, Number(e.target.value))}
                          />
                          <p className="text-xs text-slate-900/25 mt-1">{f.hint}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Template"}
              </button>
              <button onClick={() => setLocalTemplate(JSON.parse(JSON.stringify(template)))} className="btn btn-secondary">
                Reset Changes
              </button>
            </div>
          </div>

          {/* Calibration guide */}
          <div className="card border-blue-500/15">
            <h2 className="font-semibold text-slate-900 mb-3">Calibration Guide</h2>
            <div className="space-y-2 text-sm text-slate-500">
              <p>1. Process a test OMR sheet and check the "Detection Preview" image on the result page.</p>
              <p>2. If bubbles are misaligned, adjust Start X/Y for each column section.</p>
              <p>3. If rows are too close/far apart, adjust Row Height.</p>
              <p>4. If A,B,C,D,E bubbles overlap, adjust Option Spacing.</p>
              <p>5. After saving, re-process the OMR to verify the alignment.</p>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-amber-500/6 border border-amber-500/15">
              <p className="text-amber-400 text-xs">
                ⚠ The default values are calibrated for the OMRly 200-question OMR sheet normalized to 1000×1400 px.
                Changing these values affects all future evaluations. Existing evaluations are not affected.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
