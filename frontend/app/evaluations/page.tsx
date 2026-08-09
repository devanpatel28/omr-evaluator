"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Button, Chip } from "@heroui/react";
import { BarChart3, ChevronRight, Eye, Edit } from "lucide-react";
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
        <h1 className="text-2xl font-bold text-foreground">All Evaluations</h1>
        <p className="text-default-500 text-sm mt-1">{allEvals.length} evaluation{allEvals.length !== 1 ? "s" : ""} across {tests.length} test{tests.length !== 1 ? "s" : ""}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <Card key={i}  className="border border-default-200"><Card.Content className="h-16 animate-pulse bg-default-50" /></Card>)}
        </div>
      ) : allEvals.length === 0 ? (
        <Card  className="border border-default-200">
          <Card.Content className="text-center py-16">
            <BarChart3 size={48} className="mx-auto mb-4 text-default-300" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No evaluations yet</h3>
            <p className="text-default-500 text-sm mb-6">Process an OMR sheet to see results here</p>
            <Link href="/tests"><Button   variant="primary">Go to Tests</Button></Link>
          </Card.Content>
        </Card>
      ) : (
        <Card  className="border border-default-200 overflow-hidden">
          <Card.Content className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-default-200 bg-default-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-default-400 uppercase tracking-wider">Test</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-default-400 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-default-400 uppercase tracking-wider">Score</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-success-500 uppercase tracking-wider">Correct</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-danger-500 uppercase tracking-wider">Wrong</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-warning-500 uppercase tracking-wider">E</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-default-400 uppercase tracking-wider">Unanswered</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-default-400 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {allEvals.map(ev => (
                    <tr key={ev.id} className="border-b border-default-100 hover:bg-default-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">{ev.testName}</td>
                      <td className="py-3 px-4 text-default-500 text-xs">{new Date(ev.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                      <td className="py-3 px-4 font-bold text-secondary text-lg">{ev.total_marks.toFixed(2)}</td>
                      <td className="py-3 px-4 text-success font-semibold">{ev.correct_count}</td>
                      <td className="py-3 px-4 text-danger font-semibold">{ev.wrong_count}</td>
                      <td className="py-3 px-4 text-warning font-semibold">{ev.e_count}</td>
                      <td className="py-3 px-4 text-default-500">{ev.unanswered_count}</td>
                      <td className="py-3 px-4">
                        {ev.is_finalized
                          ? <Chip size="sm" color="success" variant="soft">Final</Chip>
                          : <Chip size="sm" color="warning" variant="soft">Draft</Chip>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Link href={`/evaluations/${ev.id}`} className="text-xs text-primary hover:underline flex items-center gap-1"><Eye size={12} /> View</Link>
                          {!ev.is_finalized && (
                            <Link href={`/evaluations/${ev.id}/review`} className="text-xs text-warning hover:underline flex items-center gap-1"><Edit size={12} /> Review</Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
}
