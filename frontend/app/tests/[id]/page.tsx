"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchTest, fetchEvaluations, uploadAnswerKey, fetchAnswerKey } from "@/lib/api";
import type { Test, EvaluationSummary, AnswerKeyItem } from "@/types";

export default function TestDetailPage() {
  const params = useParams();
  const testId = Number(params.id);

  const [test, setTest] = useState<Test | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationSummary[]>([]);
  const [answerKey, setAnswerKey] = useState<AnswerKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [keyErrors, setKeyErrors] = useState<string[]>([]);

  async function load() {
    try {
      const [t, evs, ak] = await Promise.all([
        fetchTest(testId),
        fetchEvaluations(testId),
        fetchAnswerKey(testId),
      ]);
      setTest(t);
      setEvaluations(evs);
      setAnswerKey(ak);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [testId]);

  async function handleKeyUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setKeyErrors([]);
    try {
      await uploadAnswerKey(testId, file);
      await load();
    } catch (err: any) {
      setKeyErrors(err.errors || [err.message]);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return (
    <div className="p-8">
      <div className="h-8 w-64 bg-slate-50 rounded-xl animate-pulse mb-8" />
      <div className="space-y-4">
        {[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse bg-white/3" />)}
      </div>
    </div>
  );

  if (!test) return <div className="p-8 text-slate-500">Test not found</div>;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-900/30 mb-2">
            <Link href="/tests" className="hover:text-slate-600">Tests</Link>
            <span>›</span>
            <span className="text-slate-500">{test.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{test.name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {test.total_questions} questions · Created {new Date(test.created_at).toLocaleDateString("en-IN")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/tests/${testId}/evaluate`} className={`btn btn-primary ${!test.answer_key_count ? "opacity-50 pointer-events-none" : ""}`}>
            Process OMR
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Test details + Answer key */}
        <div className="space-y-5">
          {/* Scoring */}
          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-4">Scoring Rules</h2>
            <div className="space-y-2">
              {[
                { label: "Correct", value: `+${test.correct_marks}`, color: "text-emerald-400" },
                { label: "Wrong (A/B/C/D)", value: test.wrong_marks, color: "text-red-400" },
                { label: "E / Don't Know", value: test.e_marks, color: "text-orange-400" },
                { label: "Unanswered", value: test.unanswered_marks, color: "text-slate-500" },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-white/4 last:border-0">
                  <span className="text-sm text-slate-500">{item.label}</span>
                  <span className={`text-sm font-semibold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Answer Key */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900">Answer Key</h2>
              <label className="btn btn-secondary text-xs py-1.5 px-3 cursor-pointer">
                {uploading ? "Uploading..." : test.answer_key_count > 0 ? "Replace" : "Upload"}
                <input type="file" accept=".json,.csv" className="hidden" onChange={handleKeyUpload} disabled={uploading} />
              </label>
            </div>

            {keyErrors.length > 0 && (
              <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                {keyErrors.map((e,i) => <p key={i} className="text-red-400 text-xs">• {e}</p>)}
              </div>
            )}

            {answerKey.length > 0 ? (
              <div className="max-h-48 overflow-y-auto">
                <div className="grid grid-cols-4 gap-1">
                  {answerKey.slice(0, 40).map(ak => (
                    <div key={ak.question_number} className="flex justify-between items-center px-2 py-1 rounded bg-white/3 text-xs">
                      <span className="text-slate-900/30">{ak.question_number}</span>
                      <span className="font-bold text-blue-400">{ak.correct_answer}</span>
                    </div>
                  ))}
                </div>
                {answerKey.length > 40 && (
                  <p className="text-xs text-slate-900/30 text-center mt-2">+ {answerKey.length - 40} more</p>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-900/30 text-sm">No answer key uploaded</p>
                <p className="text-slate-900/20 text-xs mt-1">Upload a JSON or CSV file</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Evaluation history */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-900">Evaluation History</h2>
              <span className="text-xs text-slate-900/30">{evaluations.length} evaluation{evaluations.length !== 1 ? "s" : ""}</span>
            </div>

            {evaluations.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-3">📊</p>
                <p className="text-slate-500 text-sm">No evaluations yet</p>
                {test.answer_key_count > 0 ? (
                  <Link href={`/tests/${testId}/evaluate`} className="btn btn-primary mt-4 inline-flex">
                    Process First OMR Sheet
                  </Link>
                ) : (
                  <p className="text-slate-900/25 text-xs mt-2">Upload an answer key first</p>
                )}
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Score</th>
                    <th className="text-emerald-400/60">Correct</th>
                    <th className="text-red-400/60">Wrong</th>
                    <th className="text-orange-400/60">E</th>
                    <th className="text-slate-900/30">Unanswered</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map(ev => (
                    <tr key={ev.id}>
                      <td className="text-slate-500 text-xs">{new Date(ev.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                      <td className="font-bold text-indigo-400">{ev.total_marks.toFixed(2)}</td>
                      <td className="text-emerald-400">{ev.correct_count}</td>
                      <td className="text-red-400">{ev.wrong_count}</td>
                      <td className="text-orange-400">{ev.e_count}</td>
                      <td className="text-slate-500">{ev.unanswered_count}</td>
                      <td>
                        {ev.is_finalized
                          ? <span className="badge badge-correct">Final</span>
                          : <span className="badge badge-ambiguous">Draft</span>}
                      </td>
                      <td>
                        <Link href={`/evaluations/${ev.id}`} className="text-xs text-blue-400 hover:text-blue-300">View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
