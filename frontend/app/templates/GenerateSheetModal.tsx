"use client";
import { useState } from "react";
import { generateOMRSheet } from "@/lib/api";

export default function GenerateSheetModal({ onClose }: { onClose: () => void }) {
  const [instituteName, setInstituteName] = useState("");
  const [examName, setExamName] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<"pdf" | "png">("pdf");
  const [error, setError] = useState("");

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const formData = new FormData();
      if (instituteName) formData.append("institute_name", instituteName);
      if (examName) formData.append("exam_name", examName);
      if (logo) formData.append("logo", logo);
      formData.append("format", format);

      const blob = await generateOMRSheet(formData);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `omr_sheet_200.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to generate sheet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Generate OMR Sheet</h2>
          <p className="text-sm text-slate-500 mb-6">
            Generate a printable 200-question OMR sheet. Optional fields will appear in the header.
          </p>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="label">Format</label>
              <select
                className="input"
                value={format}
                onChange={(e) => setFormat(e.target.value as "pdf" | "png")}
              >
                <option value="pdf">PDF</option>
                <option value="png">PNG Image</option>
              </select>
            </div>
            
            <div>
              <label className="label">Institute Name (Optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. OMRly Institute"
                value={instituteName}
                onChange={(e) => setInstituteName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="label">Exam Name (Optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Final Examination 2026"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Logo (Optional)</label>
              <input
                type="file"
                accept="image/*"
                className="input cursor-pointer"
                onChange={(e) => setLogo(e.target.files?.[0] || null)}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary flex-1"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={loading}
              >
                {loading ? "Generating..." : "Generate PDF"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
