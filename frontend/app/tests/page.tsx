"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Button, Chip } from "@heroui/react";
import { Plus, ClipboardList, CheckCircle, AlertTriangle, Trash2, ExternalLink, Play } from "lucide-react";
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
          <h1 className="text-2xl font-bold text-foreground">Tests</h1>
          <p className="text-default-500 text-sm mt-1">Manage your OMR evaluation tests</p>
        </div>
        <Link href="/tests/new"><Button   variant="primary" >Create Test</Button></Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Card key={i}  className="border border-default-200"><Card.Content className="h-24 animate-pulse bg-default-50" /></Card>)}
        </div>
      ) : tests.length === 0 ? (
        <Card variant="secondary" >
          <Card.Content className="text-center py-16">
            <ClipboardList size={48} className="mx-auto mb-4 text-default-300" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No tests yet</h3>
            <p className="text-default-500 text-sm mb-6">Create a test to start evaluating OMR sheets</p>
            <Link href="/tests/new"><Button   variant="primary">Create your first test</Button></Link>
          </Card.Content>
        </Card>
      ) : (
        <div className="space-y-4">
          {tests.map(test => (
            <Card variant="secondary" key={test.id}  className="hover:border-primary-200 transition-all">
              <Card.Content className="p-5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary font-bold text-lg border border-primary-100">
                    {test.total_questions}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{test.name}</h3>
                    <p className="text-xs text-default-500 mt-1 flex items-center gap-1">
                      {test.total_questions} questions ·
                      {test.answer_key_count > 0
                        ? <span className="text-success flex items-center gap-0.5"><CheckCircle size={12} /> Answer key ready ({test.answer_key_count} answers)</span>
                        : <span className="text-warning flex items-center gap-0.5"><AlertTriangle size={12} /> No answer key</span>
                      }
                      · Created {new Date(test.created_at).toLocaleDateString("en-IN")}
                    </p>
                    <p className="text-xs text-default-400 mt-0.5">
                      Scoring: +{test.correct_marks} | {test.wrong_marks} | E:{test.e_marks} | Unanswered:{test.unanswered_marks}
                      · {test.evaluation_count} evaluation{test.evaluation_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/tests/${test.id}`}>
                    <Button size="sm" variant="outline">Open</Button>
                  </Link>
                  {test.answer_key_count > 0 && (
                    <Link href={`/tests/${test.id}/evaluate`}>
                      <Button size="sm" variant="primary">Evaluate</Button>
                    </Link>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    isPending={deletingId === test.id}
                    onPress={() => handleDelete(test.id, test.name)}
                  >
                    Delete
                  </Button>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
