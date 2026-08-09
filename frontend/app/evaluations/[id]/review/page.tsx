"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, Button, Chip, Separator, Select, ListBox } from "@heroui/react";
import { AlertTriangle, ArrowLeft, ChevronRight, Save } from "lucide-react";
import { fetchEvaluation, applyCorrections, finalizeEvaluation } from "@/lib/api";
import type { Evaluation, EvaluationAnswer } from "@/types";

const RESULT_CHIP: Record<string, { color: "success" | "danger" | "warning" | "default"; label: string }> = {
  CORRECT: { color: "success", label: "CORRECT" },
  WRONG: { color: "danger", label: "WRONG" },
  E: { color: "warning", label: "E" },
  UNANSWERED: { color: "default", label: "UNANSWERED" },
  AMBIGUOUS: { color: "default", label: "AMBIGUOUS" },
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

  if (loading) return <div className="p-8 text-default-500">Loading...</div>;
  if (!evaluation) return <div className="p-8 text-default-500">Evaluation not found</div>;

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

  const FILTERS = ["ALL", "CORRECT", "WRONG", "E", "UNANSWERED"];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Review Detected Answers</h1>
          <p className="text-default-500 text-sm mt-1">
            {evaluation.test_name_snapshot} · Evaluation #{evalId}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onPress={handleFinalize} isPending={finalizing} variant="primary" >
            {finalizing ? "Saving..." : "Finalize Score"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-4 border border-danger-200 bg-danger-50" >
          <Card.Content className="p-3 text-danger text-sm">{error}</Card.Content>
        </Card>
      )}

      {/* Score preview */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: "Correct", value: evaluation.correct_count, color: "text-success", bg: "bg-success-50 border-success-100" },
          { label: "Wrong", value: evaluation.wrong_count, color: "text-danger", bg: "bg-danger-50 border-danger-100" },
          { label: "E (Answered as Unknown)", value: evaluation.e_count, color: "text-warning", bg: "bg-warning-50 border-warning-100" },
          { label: "Unanswered", value: evaluation.unanswered_count, color: "text-default-500", bg: "bg-default-50 border-default-200" },
        ].map(item => (
          <Card variant="secondary" key={item.label} className={`p-4 ${item.bg}`}>
            <p className="text-xs text-default-500 mb-1">{item.label}</p>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
          </Card>
        ))}


        {/* Score */}
        <Card variant="secondary" className="flex flex-row items-center gap-4 p-4">
          <div>
            <p className="text-xs text-default-500">Current Score</p>
            <p className="text-3xl font-bold text-secondary">{evaluation.total_marks.toFixed(2)}</p>
          </div>
          <Separator orientation="vertical" variant="tertiary" />
          <div className="text-xs text-default-500 leading-relaxed">
            <p>+{evaluation.correct_count} x {evaluation.correct_marks_snapshot} = +{(evaluation.correct_count * evaluation.correct_marks_snapshot).toFixed(2)}</p>
            <p>{evaluation.wrong_count} x {evaluation.wrong_marks_snapshot} = {(evaluation.wrong_count * evaluation.wrong_marks_snapshot).toFixed(2)}</p>
            <p>E {evaluation.e_count} x {evaluation.e_marks_snapshot} = {(evaluation.e_count * evaluation.e_marks_snapshot).toFixed(2)}</p>
          </div>

        </Card>
      </div>

      {pendingReview > 0 && (
        <div className="w-1/3 bg-warning-soft  px-6 py-3 rounded-full text-base font-semibold text-warning flex items-center gap-2 mb-5">
          <AlertTriangle size={20} />
          {pendingReview} - correction{pendingReview !== 1 ? "s" : ""} pending
        </div>
      )}



      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <Button
            key={f}
            onPress={() => setFilter(f)}
            size="sm"
            variant={filter === f ? "primary" : "secondary"}
          >
            {f} {f === "ALL" ? `(${answers.length})` : `(${answers.filter(a => a.result_type === f).length})`}
          </Button>
        ))}
      </div>

      {/* Question Table */}
      <Card className="border border-default-200 overflow-hidden">
        <Card.Content className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-default-200 bg-default-50">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Q#</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Detected</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Correct Key</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Result</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Marks</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Confidence</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Manual Override</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnswers.map(ans => {
                  const overridden = corrections[ans.question_number];
                  return (
                    <tr key={ans.question_number} className={`border-b border-default-100 hover:bg-default-50 transition-colors ${ans.result_type === "AMBIGUOUS" ? "bg-warning-50/50" : ""}`}>
                      <td className="py-2.5 px-3 font-mono font-semibold text-default-700">{ans.question_number}</td>
                      <td className="py-2.5 px-3">
                        <span className={`font-bold ${overridden ? "line-through text-default-300" : "text-foreground"}`}>
                          {ans.detected_answer || "—"}
                        </span>
                        {overridden && <span className="ml-2 font-bold text-primary">{overridden}</span>}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-success">{ans.correct_answer || "—"}</td>
                      <td className="py-2.5 px-3">
                        {ans.result_type && RESULT_CHIP[ans.result_type] && (
                          <Chip size="sm" color={RESULT_CHIP[ans.result_type].color} variant="soft">
                            {RESULT_CHIP[ans.result_type].label}
                          </Chip>
                        )}
                      </td>
                      <td className={`py-2.5 px-3 font-semibold ${(ans.marks || 0) > 0 ? "text-success" : (ans.marks || 0) < 0 ? "text-danger" : "text-default-500"}`}>
                        {ans.marks !== null ? (ans.marks > 0 ? "+" : "") + ans.marks?.toFixed(2) : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 rounded-full bg-default-200">
                            <div
                              className={`h-full rounded-full ${(ans.confidence || 0) >= 0.8 ? "bg-success" : (ans.confidence || 0) >= 0.5 ? "bg-warning" : "bg-danger"}`}
                              style={{ width: `${(ans.confidence || 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-default-500">{((ans.confidence || 0) * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                     
                      <td className="py-2.5 px-3">
                        <Select
                          variant="secondary"
                          aria-label="Override answer"
                          placeholder="— No change —"
                          value={overridden ?? null}
                          onChange={(value) => {
                            if (value === null || value === "") {
                              setCorrections(prev => {
                                const n = { ...prev };
                                delete n[ans.question_number];
                                return n;
                              });
                            } else {
                              setCorrection(ans.question_number, value as string);
                            }
                          }}
                        >
                          <Select.Trigger className="text-xs py-1 px-2 h-auto min-h-0 bg-default-100 border border-default-200 rounded-lg focus:outline-none focus:border-primary">
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              <ListBox.Item id="" textValue="— No change —">
                                — No change —
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                              {ANSWER_OPTIONS.map(opt => (
                                <ListBox.Item key={opt} id={opt} textValue={opt}>
                                  {opt}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredAnswers.length === 0 && (
              <div className="text-center py-8 text-default-400">No questions in this category</div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Bottom action */}
      <div className="mt-6 flex justify-between items-center">
        <Link href={`/tests/${evaluation.test_id}`}>
          <Button variant="outline">Back to Test</Button>
        </Link>
        <div className="flex items-center gap-3">
          {pendingReview > 0 && (
            <p className="text-sm text-warning flex items-center gap-1">
              <AlertTriangle size={14} />
              {pendingReview} manual correction{pendingReview !== 1 ? "s" : ""} will be applied
            </p>
          )}
          <Button onPress={handleFinalize} isPending={finalizing} variant="primary" >
            {finalizing ? "Saving Final Score..." : "Save & Finalize Score"}
          </Button>
        </div>
      </div>
    </div>
  );
}
