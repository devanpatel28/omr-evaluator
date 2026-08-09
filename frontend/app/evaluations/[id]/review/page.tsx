"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { fetchEvaluation, applyCorrections, finalizeEvaluation } from "@/lib/api";
import type { Evaluation, EvaluationAnswer } from "@/types";

const RESULT_BADGE: Record<string, string> = {
  CORRECT: "badge-correct",
  WRONG: "badge-wrong",
  E: "badge-e",
  UNANSWERED: "badge-unanswered",
  AMBIGUOUS: "badge-ambiguous",
};

const ANSWER_OPTIONS = ["A", "B", "C", "D", "E", "UNANSWERED"];

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const evalId = Number(params.id);

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [corrections, setCorrections] = useState<Record<number, string>>({});
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEvaluation(evalId).then(ev => { setEvaluation(ev); setLoading(false); }).catch(() => setLoading(false));
  }, [evalId]);

  if (loading) return <div className="p-8 text-slate-500">Loading...</div>;
  if (!evaluation) return <div className="p-8 text-slate-500">Evaluation not found</div>;

  const answers = evaluation.answers || [];
  const filteredAnswers = filter === "ALL" ? answers : answers.filter(a => a.result_type === filter);

  const ambiguousCount = answers.filter(a => a.result_type === "AMBIGUOUS").length;
  const pendingReview = Object.keys(corrections).length;

  async function handleFinalize() {
    setFinalizing(true);
    setError("");
    try {
      const corrList = Object.entries(corrections).map(([qnum, ans]) => ({
        question_number: Number(qnum),
        answer: ans,
      }));
      await finalizeEvaluation(evalId, corrList.length > 0 ? corrList : undefined);
      router.push(`/evaluations/${evalId}`);
    } catch (e: any) {
      setError(e.message);
      setFinalizing(false);
    }
  }

  function setCorrection(qnum: number, answer: string) {
    setCorrections(prev => ({ ...prev, [qnum]: answer }));
  }

  const FILTERS = ["ALL", "CORRECT", "WRONG", "E", "UNANSWERED", "AMBIGUOUS"];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Review Detected Answers</h1>
          <p className="text-slate-500 text-sm mt-1">
            {evaluation.test_name_snapshot} · Evaluation #{evalId}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {ambiguousCount > 0 && (
            <span className="text-amber-400 text-sm">
              ⚠ {ambiguousCount} question{ambiguousCount !== 1 ? "s" : ""} need review
            </span>
          )}
          <button onClick={handleFinalize} disabled={finalizing} className="btn btn-primary">
            {finalizing ? "Saving..." : "Finalize Score →"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {/* Score preview */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: "Correct", value: evaluation.correct_count, color: "text-emerald-400", bg: "bg-emerald-500/8 border-emerald-500/15" },
          { label: "Wrong", value: evaluation.wrong_count, color: "text-red-400", bg: "bg-red-500/8 border-red-500/15" },
          { label: "E", value: evaluation.e_count, color: "text-orange-400", bg: "bg-orange-500/8 border-orange-500/15" },
          { label: "Unanswered", value: evaluation.unanswered_count, color: "text-slate-500", bg: "bg-white/4 border-white/8" },
          { label: "Ambiguous", value: evaluation.ambiguous_count, color: "text-amber-400", bg: "bg-amber-500/8 border-amber-500/15" },
        ].map(item => (
          <div key={item.label} className={`rounded-xl border px-4 py-3 ${item.bg}`}>
            <p className="text-xs text-slate-500 mb-1">{item.label}</p>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Score */}
      <div className="flex items-center gap-4 mb-5 p-4 rounded-xl bg-indigo-500/8 border border-indigo-500/15">
        <div>
          <p className="text-xs text-slate-500">Current Score</p>
          <p className="text-3xl font-bold text-indigo-400">{evaluation.total_marks.toFixed(2)}</p>
        </div>
        <div className="text-xs text-slate-900/30 leading-relaxed">
          <p>+{evaluation.correct_count} × {evaluation.correct_marks_snapshot} = +{(evaluation.correct_count * evaluation.correct_marks_snapshot).toFixed(2)}</p>
          <p>{evaluation.wrong_count} × {evaluation.wrong_marks_snapshot} = {(evaluation.wrong_count * evaluation.wrong_marks_snapshot).toFixed(2)}</p>
          <p>E {evaluation.e_count} × {evaluation.e_marks_snapshot} = {(evaluation.e_count * evaluation.e_marks_snapshot).toFixed(2)}</p>
        </div>
        {pendingReview > 0 && (
          <div className="ml-auto text-xs text-amber-400">
            {pendingReview} correction{pendingReview !== 1 ? "s" : ""} pending
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn text-xs py-1.5 px-3 ${filter === f ? "btn-primary" : "btn-secondary"}`}
          >
            {f} {f === "ALL" ? `(${answers.length})` : `(${answers.filter(a => a.result_type === f).length})`}
          </button>
        ))}
      </div>

      {/* Question Table */}
      <div className="card p-0 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Q#</th>
              <th>Detected</th>
              <th>Correct Key</th>
              <th>Result</th>
              <th>Marks</th>
              <th>Confidence</th>
              <th>Method</th>
              <th>Manual Override</th>
            </tr>
          </thead>
          <tbody>
            {filteredAnswers.map(ans => {
              const overridden = corrections[ans.question_number];
              return (
                <tr key={ans.question_number} className={ans.result_type === "AMBIGUOUS" ? "bg-amber-500/4" : ""}>
                  <td className="font-mono font-semibold text-slate-700">{ans.question_number}</td>
                  <td>
                    <span className={`font-bold ${overridden ? "line-through text-slate-900/30" : "text-slate-900"}`}>
                      {ans.detected_answer || "—"}
                    </span>
                    {overridden && <span className="ml-2 font-bold text-blue-400">{overridden}</span>}
                  </td>
                  <td className="font-bold text-emerald-400">{ans.correct_answer || "—"}</td>
                  <td>
                    {ans.result_type && (
                      <span className={`badge ${RESULT_BADGE[ans.result_type] || "badge-unanswered"}`}>
                        {ans.result_type}
                      </span>
                    )}
                  </td>
                  <td className={`font-semibold ${(ans.marks || 0) > 0 ? "text-emerald-400" : (ans.marks || 0) < 0 ? "text-red-400" : "text-slate-500"}`}>
                    {ans.marks !== null ? (ans.marks > 0 ? "+" : "") + ans.marks?.toFixed(2) : "—"}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${(ans.confidence || 0) >= 0.8 ? "bg-emerald-500" : (ans.confidence || 0) >= 0.5 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${(ans.confidence || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{((ans.confidence || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`text-xs ${ans.detection_method === "MANUAL" ? "text-blue-400" : "text-slate-900/25"}`}>
                      {ans.detection_method || "AUTO"}
                    </span>
                  </td>
                  <td>
                    <select
                      className="input py-1 px-2 text-xs w-28"
                      value={overridden || ""}
                      onChange={e => {
                        if (e.target.value === "") {
                          setCorrections(prev => { const n = {...prev}; delete n[ans.question_number]; return n; });
                        } else {
                          setCorrection(ans.question_number, e.target.value);
                        }
                      }}
                    >
                      <option value="">— No change —</option>
                      {ANSWER_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredAnswers.length === 0 && (
          <div className="text-center py-8 text-slate-900/30">No questions in this category</div>
        )}
      </div>

      {/* Bottom action */}
      <div className="mt-6 flex justify-between items-center">
        <Link href={`/tests/${evaluation.test_id}`} className="btn btn-secondary">← Back to Test</Link>
        <div className="flex items-center gap-3">
          {pendingReview > 0 && (
            <p className="text-sm text-amber-400">
              {pendingReview} manual correction{pendingReview !== 1 ? "s" : ""} will be applied
            </p>
          )}
          <button onClick={handleFinalize} disabled={finalizing} className="btn btn-primary">
            {finalizing ? "Saving Final Score..." : "Save & Finalize Score"}
          </button>
        </div>
      </div>
    </div>
  );
}
