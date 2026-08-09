"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTests, deleteTest } from "@/lib/api";
import type { Test } from "@/types";

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try { setTests(await fetchTests()); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete test "${name}" and all its evaluations? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteTest(id);
      setTests(p => p.filter(t => t.id !== id));
    } catch (e: any) {
      alert("Delete failed: " + e.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Tests</h1>
          <p className="page-subtitle">Manage your OMR evaluation tests</p>
        </div>
        <Link href="/tests/new" className="btn btn-primary">+ Create Test</Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="card h-24 animate-pulse bg-white/3" />)}
        </div>
      ) : tests.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-5xl mb-4">📋</p>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No tests yet</h3>
          <p className="text-slate-500 text-sm mb-6">Create a test to start evaluating OMR sheets</p>
          <Link href="/tests/new" className="btn btn-primary">Create your first test</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map(test => (
            <div key={test.id} className="card flex items-center justify-between hover:border-blue-500/20 transition-all">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center text-blue-400 font-bold text-lg border border-blue-500/10">
                  {test.total_questions}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{test.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {test.total_questions} questions ·
                    {test.answer_key_count > 0
                      ? <span className="text-emerald-400"> ✓ Answer key ready ({test.answer_key_count} answers)</span>
                      : <span className="text-amber-400"> ⚠ No answer key</span>
                    }
                    · Created {new Date(test.created_at).toLocaleDateString("en-IN")}
                  </p>
                  <p className="text-xs text-slate-900/30 mt-0.5">
                    Scoring: +{test.correct_marks} | {test.wrong_marks} | E:{test.e_marks} | Unanswered:{test.unanswered_marks}
                    · {test.evaluation_count} evaluation{test.evaluation_count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/tests/${test.id}`} className="btn btn-secondary text-xs py-2 px-3">Open</Link>
                {test.answer_key_count > 0 && (
                  <Link href={`/tests/${test.id}/evaluate`} className="btn btn-primary text-xs py-2 px-3">Evaluate</Link>
                )}
                <button
                  onClick={() => handleDelete(test.id, test.name)}
                  disabled={deletingId === test.id}
                  className="btn btn-danger text-xs py-2 px-3"
                >
                  {deletingId === test.id ? "..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
