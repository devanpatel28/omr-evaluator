"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTests, fetchEvaluations } from "@/lib/api";
import type { Test, EvaluationSummary } from "@/types";

export default function EvaluationsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [allEvals, setAllEvals] = useState<(EvaluationSummary & { testName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const ts = await fetchTests();
      setTests(ts);
      const evals: (EvaluationSummary & { testName: string })[] = [];
      for (const t of ts) {
        try {
          const evs = await fetchEvaluations(t.id);
          evs.forEach((ev: EvaluationSummary) => evals.push({ ...ev, testName: t.name }));
        } catch {}
      }
      setAllEvals(evals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="page-title">All Evaluations</h1>
        <p className="page-subtitle">{allEvals.length} evaluation{allEvals.length !== 1 ? "s" : ""} across {tests.length} test{tests.length !== 1 ? "s" : ""}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="card h-16 animate-pulse bg-white/3" />)}
        </div>
      ) : allEvals.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-5xl mb-4">📊</p>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No evaluations yet</h3>
          <p className="text-slate-500 text-sm mb-6">Process an OMR sheet to see results here</p>
          <Link href="/tests" className="btn btn-primary">Go to Tests</Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Test</th>
                <th>Date</th>
                <th>Score</th>
                <th className="text-emerald-400/60">Correct</th>
                <th className="text-red-400/60">Wrong</th>
                <th className="text-orange-400/60">E</th>
                <th>Unanswered</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {allEvals.map(ev => (
                <tr key={ev.id}>
                  <td className="font-medium text-slate-800">{ev.testName}</td>
                  <td className="text-slate-500 text-xs">{new Date(ev.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="font-bold text-indigo-400 text-lg">{ev.total_marks.toFixed(2)}</td>
                  <td className="text-emerald-400 font-semibold">{ev.correct_count}</td>
                  <td className="text-red-400 font-semibold">{ev.wrong_count}</td>
                  <td className="text-orange-400 font-semibold">{ev.e_count}</td>
                  <td className="text-slate-500">{ev.unanswered_count}</td>
                  <td>
                    {ev.is_finalized
                      ? <span className="badge badge-correct">Final</span>
                      : <span className="badge badge-ambiguous">Draft</span>}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Link href={`/evaluations/${ev.id}`} className="text-xs text-blue-400 hover:text-blue-300">View</Link>
                      {!ev.is_finalized && (
                        <Link href={`/evaluations/${ev.id}/review`} className="text-xs text-amber-400 hover:text-amber-300">Review</Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
