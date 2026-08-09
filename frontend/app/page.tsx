"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTests, fetchEvaluations } from "@/lib/api";
import type { Test, EvaluationSummary } from "@/types";

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="stat-card">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-900/30 mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [recentEvals, setRecentEvals] = useState<EvaluationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("http://localhost:8000/api/health");
        setBackendOk(res.ok);
      } catch {
        setBackendOk(false);
      }
      try {
        const t = await fetchTests();
        setTests(t);
        // Gather last 5 evaluations across all tests
        const allEvals: EvaluationSummary[] = [];
        for (const test of t.slice(0, 5)) {
          try {
            const evs = await fetchEvaluations(test.id);
            allEvals.push(...evs.slice(0, 2).map((e: EvaluationSummary) => ({ ...e, testName: test.name })));
          } catch {}
        }
        setRecentEvals(allEvals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6));
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const totalEvals = tests.reduce((s, t) => s + t.evaluation_count, 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">OMR Evaluation System</h1>
          <p className="text-slate-500 mt-1 text-sm">OMRly — Local OMR Processing</p>
        </div>
        <Link href="/tests/new" className="btn btn-primary">
          <span>+</span> Create Test
        </Link>
      </div>

      {/* Backend status */}
      {backendOk === false && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/8 flex items-center gap-3">
          <span className="text-red-400 text-lg">⚠</span>
          <div>
            <p className="text-red-300 text-sm font-medium">Backend not running</p>
            <p className="text-red-400/70 text-xs mt-0.5">
              Start the FastAPI server: <code className="bg-slate-100 px-1 rounded">uvicorn app.main:app --reload</code> in the <code className="bg-slate-100 px-1 rounded">backend/</code> directory
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Tests" value={tests.length} color="text-blue-400" />
        <StatCard label="Total Evaluations" value={totalEvals} color="text-indigo-400" />
        <StatCard label="Ready to Evaluate" value={tests.filter(t => t.answer_key_count > 0).length} color="text-emerald-400" />
      </div>

      {/* Recent Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">Recent Tests</h2>
            <Link href="/tests" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-white/3 animate-pulse" />)}
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-slate-500 text-sm">No tests yet</p>
              <Link href="/tests/new" className="btn btn-primary mt-4 text-sm inline-flex">Create your first test</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {tests.slice(0, 5).map(test => (
                <Link key={test.id} href={`/tests/${test.id}`} className="flex items-center justify-between p-4 rounded-xl bg-white/3 hover:bg-white/6 border border-white/4 hover:border-blue-500/20 transition-all group">
                  <div>
                    <p className="text-sm font-medium text-slate-900 group-hover:text-blue-300 transition-colors">{test.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {test.total_questions} questions · {test.evaluation_count} evaluations
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {test.answer_key_count > 0 ? (
                      <span className="badge badge-correct">Key ready</span>
                    ) : (
                      <span className="badge badge-unanswered">No key</span>
                    )}
                    <span className="text-slate-900/20 group-hover:text-slate-500 transition-colors">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Evaluations */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">Recent Evaluations</h2>
            <Link href="/evaluations" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-white/3 animate-pulse" />)}
            </div>
          ) : recentEvals.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-slate-500 text-sm">No evaluations yet</p>
              <p className="text-slate-900/25 text-xs mt-1">Upload an OMR sheet to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEvals.map(ev => (
                <Link key={ev.id} href={`/evaluations/${ev.id}`} className="flex items-center justify-between p-4 rounded-xl bg-white/3 hover:bg-white/6 border border-white/4 hover:border-indigo-500/20 transition-all group">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-indigo-400">{ev.total_marks.toFixed(1)}</span>
                      <span className="text-slate-900/30 text-xs">marks</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ✓{ev.correct_count} ✗{ev.wrong_count} E{ev.e_count} —{ev.unanswered_count}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-900/30">{new Date(ev.created_at).toLocaleDateString("en-IN")}</p>
                    {ev.is_finalized ? (
                      <span className="badge badge-correct mt-1">Final</span>
                    ) : (
                      <span className="badge badge-ambiguous mt-1">Draft</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick guide */}
      <div className="card mt-6">
        <h2 className="font-semibold text-slate-900 mb-4">Quick Start Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: "1", title: "Create Test", desc: "Set test name, question count, and scoring rules", href: "/tests/new", color: "from-blue-500 to-blue-600" },
            { step: "2", title: "Upload Answer Key", desc: "Import JSON or CSV answer key for the test", href: "/tests", color: "from-indigo-500 to-indigo-600" },
            { step: "3", title: "Process OMR", desc: "Upload a photo or scan of a filled OMR sheet", href: "/tests", color: "from-purple-500 to-purple-600" },
            { step: "4", title: "Review & Export", desc: "Correct detections, finalize score, export PDF/CSV", href: "/evaluations", color: "from-pink-500 to-pink-600" },
          ].map(item => (
            <Link key={item.step} href={item.href} className="flex flex-col gap-2 p-4 rounded-xl bg-white/3 hover:bg-slate-50 border border-white/4 transition-all">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-slate-900 text-sm font-bold`}>
                {item.step}
              </div>
              <p className="text-sm font-medium text-slate-900">{item.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
