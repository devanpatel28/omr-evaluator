"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, Button, Chip } from "@heroui/react";
import { BarChart3, Upload, ChevronRight, Play, AlertTriangle } from "lucide-react";
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
      <div className="h-8 w-64 bg-default-100 rounded-xl animate-pulse mb-8" />
      <div className="space-y-4">
        {[1,2,3].map(i => <Card key={i}  className="border border-default-200"><Card.Content className="h-20 animate-pulse bg-default-50" /></Card>)}
      </div>
    </div>
  );

  if (!test) return <div className="p-8 text-default-500">Test not found</div>;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs text-default-400 mb-2">
            <Link href="/tests" className="hover:text-foreground">Tests</Link>
            <ChevronRight size={12} />
            <span className="text-default-600">{test.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{test.name}</h1>
          <p className="text-default-500 text-sm mt-1">
            {test.total_questions} questions · Created {new Date(test.created_at).toLocaleDateString("en-IN")}
          </p>
        </div>
        <Link href={`/tests/${testId}/evaluate`}>
          <Button variant="primary" isDisabled={!test.answer_key_count}>
            Process OMR
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Test details + Answer key */}
        <div className="space-y-5">
          {/* Scoring */}
          <Card variant="secondary">
            <Card.Content className="p-3">
              <h2 className="font-semibold text-foreground mb-4">Scoring Rules</h2>
              <div className="space-y-2">
                {[
                  { label: "Correct", value: `+${test.correct_marks}`, color: "text-success" },
                  { label: "Wrong (A/B/C/D)", value: test.wrong_marks, color: "text-danger" },
                  { label: "E / Don't Know", value: test.e_marks, color: "text-warning" },
                  { label: "Unanswered", value: test.unanswered_marks, color: "text-default-500" },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-default-100 last:border-0">
                    <span className="text-sm text-default-500">{item.label}</span>
                    <span className={`text-sm font-semibold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>

          {/* Answer Key */}
          <Card variant="secondary">
            <Card.Content className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground">Answer Key</h2>
                <Button variant="secondary">
                  {uploading ? "Uploading..." : test.answer_key_count > 0 ? "Replace" : "Upload"}
                  <input type="file" accept=".json,.csv" className="hidden" onChange={handleKeyUpload} disabled={uploading} />
                </Button>
              </div>

              {keyErrors.length > 0 && (
                <div className="mb-3 p-3 rounded-lg bg-danger-50 border border-danger-200">
                  {keyErrors.map((e,i) => <p key={i} className="text-danger text-xs flex items-center gap-1"><AlertTriangle size={12} /> {e}</p>)}
                </div>
              )}

              {answerKey.length > 0 ? (
                <div className="bg-white p-4 rounded-2xl max-h-72 overflow-y-auto">
                  <div className="grid grid-cols-4 gap-2">
                    {answerKey.map(ak => (
                      <div key={ak.question_number} className="flex justify-around bg-surface-secondary items-center p-2 rounded-xl bg-default-50 text-sm">
                        <span className="text-default-400">{ak.question_number}</span>
                        <span className="font-bold text-primary">{ak.correct_answer}</span>
                      </div>
                    ))}
                  </div>
                  {/* {answerKey.length > 40 && (
                    <p className="text-xs text-default-400 text-center mt-2">+ {answerKey.length - 40} more</p>
                  )} */}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-default-400 text-sm">No answer key uploaded</p>
                  <p className="text-default-300 text-xs mt-1">Upload a JSON or CSV file</p>
                </div>
              )}
            </Card.Content>
          </Card>
        </div>

        {/* Right: Evaluation history */}
        <div className="lg:col-span-2">
          <Card  variant="secondary">
            <Card.Content className="p-3">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-foreground">Evaluation History</h2>
                <span className="text-xs text-default-400">{evaluations.length} evaluation{evaluations.length !== 1 ? "s" : ""}</span>
              </div>

              {evaluations.length === 0 ? (
                <div className="text-center py-10">
                  <BarChart3 size={40} className="mx-auto mb-3 text-default-300" />
                  <p className="text-default-500 text-sm">No evaluations yet</p>
                  {test.answer_key_count > 0 ? (
                    <Link href={`/tests/${testId}/evaluate`}>
                      <Button variant="primary" className="mt-4" size="sm">
                        Process First OMR Sheet
                      </Button>
                    </Link>
                  ) : (
                    <p className="text-default-400 text-xs mt-2">Upload an answer key first</p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-default-200">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Date</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Score</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-success-500 uppercase tracking-wider">Correct</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-danger-500 uppercase tracking-wider">Wrong</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-warning-500 uppercase tracking-wider">E</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Unanswered</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Status</th>
                        <th className="py-2 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluations.map(ev => (
                        <tr key={ev.id} className="border-b border-default-100 hover:bg-default-50 transition-colors">
                          <td className="py-3 px-3 text-default-500 text-xs">{new Date(ev.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                          <td className="py-3 px-3 font-bold text-secondary">{ev.total_marks.toFixed(2)}</td>
                          <td className="py-3 px-3 text-success">{ev.correct_count}</td>
                          <td className="py-3 px-3 text-danger">{ev.wrong_count}</td>
                          <td className="py-3 px-3 text-warning">{ev.e_count}</td>
                          <td className="py-3 px-3 text-default-500">{ev.unanswered_count}</td>
                          <td className="py-3 px-3">
                            {ev.is_finalized
                              ? <Chip size="sm" color="success" variant="soft">Final</Chip>
                              : <Chip size="sm" color="warning" variant="soft">Draft</Chip>}
                          </td>
                          <td className="py-3 px-3">
                            <Link href={`/evaluations/${ev.id}`} className="text-xs text-primary hover:underline flex items-center gap-1">View <ChevronRight size={12} /></Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
}
