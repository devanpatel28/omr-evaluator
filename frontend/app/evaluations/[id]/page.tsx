"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchEvaluation, getExportUrl, getOriginalImageUrl, getProcessedImageUrl } from "@/lib/api";
import type { Evaluation, EvaluationAnswer } from "@/types";

const RESULT_BADGE: Record<string, string> = {
  CORRECT: "badge-correct",
  WRONG: "badge-wrong",
  E: "badge-e",
  UNANSWERED: "badge-unanswered",
  AMBIGUOUS: "badge-ambiguous",
};

function DonutChart({ correct, wrong, e, unanswered, ambiguous }: {
  correct: number; wrong: number; e: number; unanswered: number; ambiguous: number;
}) {
  const total = correct + wrong + e + unanswered + ambiguous || 1;
  const segments = [
    { value: correct, color: "#22c55e", label: "Correct" },
    { value: wrong, color: "#ef4444", label: "Wrong" },
    { value: e, color: "#f97316", label: "E" },
    { value: unanswered, color: "#475569", label: "Unanswered" },
    { value: ambiguous, color: "#f59e0b", label: "Ambiguous" },
  ];

  const r = 70, cx = 90, cy = 90, strokeW = 22;
  const circumference = 2 * Math.PI * r;

  let accumulated = 0;
  const arcs = segments.map(seg => {
    const pct = seg.value / total;
    const dash = pct * circumference;
    const offset = circumference - accumulated * circumference;
    accumulated += pct;
    return { ...seg, dash, offset };
  });

  return (
    <svg viewBox="0 0 180 180" className="w-44 h-44">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeW} />
      {arcs.map((arc, i) => arc.value > 0 && (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={strokeW}
          strokeDasharray={`${arc.dash} ${circumference}`}
          strokeDashoffset={arc.offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          strokeLinecap="butt"
          style={{ transition: "all 0.8s ease" }}
        />
      ))}
    </svg>
  );
}

export default function EvaluationPage() {
  const params = useParams();
  const evalId = Number(params.id);

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [showOriginal, setShowOriginal] = useState(false);
  const [showProcessed, setShowProcessed] = useState(false);

  useEffect(() => {
    fetchEvaluation(evalId)
      .then(ev => { setEvaluation(ev); })
      .finally(() => setLoading(false));
  }, [evalId]);

  if (loading) return <div className="p-8 text-slate-500">Loading results...</div>;
  if (!evaluation) return <div className="p-8 text-slate-500">Evaluation not found</div>;

  const answers = evaluation.answers || [];
  const filteredAnswers = filter === "ALL" ? answers : answers.filter(a => a.result_type === filter);

  // Category lists
  const byCategory: Record<string, number[]> = { CORRECT: [], WRONG: [], E: [], UNANSWERED: [], AMBIGUOUS: [] };
  answers.forEach(a => { if (a.result_type && byCategory[a.result_type]) byCategory[a.result_type].push(a.question_number); });

  const attempted = evaluation.correct_count + evaluation.wrong_count + evaluation.e_count;
  const accuracy = attempted > 0 ? ((evaluation.correct_count / attempted) * 100).toFixed(1) : "0.0";

  const FILTERS = ["ALL", "CORRECT", "WRONG", "E", "UNANSWERED", "AMBIGUOUS"];

  return (
    <div className="p-6">
      {/* Breadcrumb + header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-900/30 mb-2">
            <Link href="/evaluations" className="hover:text-slate-600">Evaluations</Link>
            <span>›</span>
            <span className="text-slate-500">#{evalId} — {evaluation.test_name_snapshot}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Evaluation Result</h1>
        </div>
        <div className="flex gap-2">
          {!evaluation.is_finalized && (
            <Link href={`/evaluations/${evalId}/review`} className="btn btn-secondary text-sm">
              Edit Corrections
            </Link>
          )}
          <a href={getExportUrl(evalId, "csv")} download className="btn btn-secondary text-sm">⬇ CSV</a>
          <a href={getExportUrl(evalId, "json")} download className="btn btn-secondary text-sm">⬇ JSON</a>
          <a href={getExportUrl(evalId, "pdf")} download className="btn btn-primary text-sm">⬇ PDF</a>
        </div>
      </div>

      {/* Score Hero */}
      <div className="card mb-5 bg-gradient-to-br from-[#131b2e] to-[#0f1629] border-blue-500/10">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Donut */}
          <div className="relative flex-shrink-0">
            <DonutChart
              correct={evaluation.correct_count}
              wrong={evaluation.wrong_count}
              e={evaluation.e_count}
              unanswered={evaluation.unanswered_count}
              ambiguous={evaluation.ambiguous_count}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-slate-900">{evaluation.total_marks.toFixed(1)}</span>
              <span className="text-xs text-slate-900/30">total marks</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 grid grid-cols-2 gap-3 w-full">
            {[
              { label: "Correct", value: evaluation.correct_count, marks: `+${(evaluation.correct_count * evaluation.correct_marks_snapshot).toFixed(2)}`, color: "text-emerald-400", dot: "#22c55e" },
              { label: "Wrong", value: evaluation.wrong_count, marks: `${(evaluation.wrong_count * evaluation.wrong_marks_snapshot).toFixed(2)}`, color: "text-red-400", dot: "#ef4444" },
              { label: "E (Don't Know)", value: evaluation.e_count, marks: `${(evaluation.e_count * evaluation.e_marks_snapshot).toFixed(2)}`, color: "text-orange-400", dot: "#f97316" },
              { label: "Unanswered", value: evaluation.unanswered_count, marks: "0.00", color: "text-slate-500", dot: "#475569" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.dot }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
                    <span className="text-xs text-slate-900/20">{item.marks}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Accuracy + scoring breakdown */}
          <div className="flex-shrink-0 text-right space-y-3">
            <div>
              <p className="text-xs text-slate-900/30 mb-1">Accuracy</p>
              <p className="text-3xl font-bold text-blue-400">{accuracy}%</p>
              <p className="text-xs text-slate-900/20">{evaluation.correct_count} / {attempted} attempted</p>
            </div>
            <div className="border-t border-white/5 pt-3 text-xs text-slate-900/30 space-y-1 text-right">
              <p>Correct: <span className="text-emerald-400">+{(evaluation.correct_count * evaluation.correct_marks_snapshot).toFixed(2)}</span></p>
              <p>Wrong penalty: <span className="text-red-400">{(evaluation.wrong_count * evaluation.wrong_marks_snapshot).toFixed(2)}</span></p>
              <p>E penalty: <span className="text-orange-400">{(evaluation.e_count * evaluation.e_marks_snapshot).toFixed(2)}</span></p>
              <div className="border-t border-white/5 pt-1 mt-1">
                <p>Final Score: <span className="text-slate-900 font-bold">{evaluation.total_marks.toFixed(2)}</span></p>
              </div>
            </div>
            <div className="text-xs">
              {evaluation.is_finalized
                ? <span className="badge badge-correct">Finalized</span>
                : <span className="badge badge-ambiguous">Draft</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Category question lists */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { key: "CORRECT", label: "✓ Correct", color: "text-emerald-400 border-emerald-500/15 bg-emerald-500/4" },
          { key: "WRONG", label: "✗ Wrong", color: "text-red-400 border-red-500/15 bg-red-500/4" },
          { key: "E", label: "E Don't Know", color: "text-orange-400 border-orange-500/15 bg-orange-500/4" },
          { key: "UNANSWERED", label: "— Unanswered", color: "text-slate-500 border-white/6 bg-white/3" },
        ].map(cat => (
          <div key={cat.key} className={`rounded-xl border p-4 ${cat.color}`}>
            <p className="text-xs font-semibold mb-2">{cat.label} ({byCategory[cat.key]?.length || 0})</p>
            <p className="text-xs leading-relaxed opacity-70 break-words">
              {byCategory[cat.key]?.length > 0
                ? byCategory[cat.key].join(", ")
                : "None"}
            </p>
          </div>
        ))}
      </div>

      {/* Image buttons */}
      <div className="flex gap-3 mb-5">
        <button onClick={() => setShowOriginal(v => !v)} className="btn btn-secondary text-sm">
          {showOriginal ? "Hide" : "View"} Original OMR
        </button>
        <button onClick={() => setShowProcessed(v => !v)} className="btn btn-secondary text-sm">
          {showProcessed ? "Hide" : "View"} Detection Preview
        </button>
      </div>

      {(showOriginal || showProcessed) && (
        <div className="flex gap-4 mb-5 flex-wrap">
          {showOriginal && (
            <div className="card flex-1 min-w-64">
              <p className="text-sm font-medium text-slate-900 mb-3">Original OMR Image</p>
              <img src={`${getOriginalImageUrl(evalId)}?t=${Date.now()}`} alt="Original OMR" className="w-full rounded-lg border border-slate-200 object-contain max-h-96" />
            </div>
          )}
          {showProcessed && (
            <div className="card flex-1 min-w-64">
              <p className="text-sm font-medium text-slate-900 mb-3">Detection Overlay</p>
              <img src={`${getProcessedImageUrl(evalId)}?t=${Date.now()}`} alt="Processed OMR" className="w-full rounded-lg border border-slate-200 object-contain max-h-96" />
            </div>
          )}
        </div>
      )}

      {/* Question Table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="font-semibold text-slate-900">Question-wise Result</h2>
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`btn text-xs py-1 px-2 ${filter === f ? "btn-primary" : "btn-secondary"}`}>
                {f} ({f === "ALL" ? answers.length : answers.filter(a => a.result_type === f).length})
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Q#</th>
                <th>Detected</th>
                <th>Correct</th>
                <th>Final</th>
                <th>Result</th>
                <th>Marks</th>
                <th>Confidence</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnswers.map(ans => (
                <tr key={ans.question_number}>
                  <td className="font-mono font-semibold text-slate-600">{ans.question_number}</td>
                  <td className="text-slate-500">{ans.detected_answer || "—"}</td>
                  <td className="font-bold text-emerald-400">{ans.correct_answer || "—"}</td>
                  <td className="font-bold text-slate-900">{ans.final_answer || ans.detected_answer || "—"}</td>
                  <td>
                    {ans.result_type && (
                      <span className={`badge ${RESULT_BADGE[ans.result_type] || ""}`}>
                        {ans.result_type}
                      </span>
                    )}
                  </td>
                  <td className={`font-semibold text-sm ${(ans.marks || 0) > 0 ? "text-emerald-400" : (ans.marks || 0) < 0 ? "text-red-400" : "text-slate-900/30"}`}>
                    {ans.marks !== null ? (ans.marks > 0 ? "+" : "") + (ans.marks ?? 0).toFixed(2) : "—"}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-white/8">
                        <div
                          className={`h-full rounded-full transition-all ${(ans.confidence || 0) >= 0.8 ? "bg-emerald-500" : (ans.confidence || 0) >= 0.5 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${(ans.confidence || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-900/30">{((ans.confidence || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`text-xs ${ans.detection_method === "MANUAL" ? "text-blue-400 font-medium" : "text-slate-900/20"}`}>
                      {ans.detection_method || "AUTO"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAnswers.length === 0 && (
            <div className="text-center py-8 text-slate-900/30 text-sm">No questions in this category</div>
          )}
        </div>
      </div>
    </div>
  );
}
