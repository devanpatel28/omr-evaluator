"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, Button, Chip } from "@heroui/react";
import { Download, ChevronRight, Edit, Eye, EyeOff, Image as ImageIcon } from "lucide-react";
import { fetchEvaluation, getExportUrl, getOriginalImageUrl, getProcessedImageUrl } from "@/lib/api";
import type { Evaluation, EvaluationAnswer } from "@/types";

const RESULT_CHIP: Record<string, { color: "success" | "danger" | "warning" | "default"; label: string }> = {
  CORRECT: { color: "success", label: "CORRECT" },
  WRONG: { color: "danger", label: "WRONG" },
  E: { color: "warning", label: "E" },
  UNANSWERED: { color: "default", label: "UNANSWERED" },
  AMBIGUOUS: { color: "default", label: "AMBIGUOUS" },
};

function DonutChart({ correct, wrong, e, unanswered, ambiguous }: {
  correct: number; wrong: number; e: number; unanswered: number; ambiguous: number;
}) {
  const total = correct + wrong + e + unanswered + ambiguous || 1;
  const segments = [
    { value: correct, color: "#22c55e", label: "Correct" },
    { value: wrong, color: "#ef4444", label: "Wrong" },
    { value: e, color: "#f97316", label: "E" },
    { value: unanswered, color: "#94a3b8", label: "Unanswered" },
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
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />
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

  if (loading) return <div className="p-8 text-default-500">Loading results...</div>;
  if (!evaluation) return <div className="p-8 text-default-500">Evaluation not found</div>;

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
          <div className="flex items-center gap-2 text-xs text-default-400 mb-2">
            <Link href="/evaluations" className="hover:text-foreground">Evaluations</Link>
            <ChevronRight size={12} />
            <span className="text-default-600">#{evalId} — {evaluation.test_name_snapshot}</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Evaluation Result</h1>
        </div>
        <div className="flex gap-2">
          {!evaluation.is_finalized && (
            <Link href={`/evaluations/${evalId}/review`}>
              <Button variant="outline" size="sm">
                Edit Corrections
              </Button>
            </Link>
          )}
          <a href={getExportUrl(evalId, "csv")} download>
            <Button variant="outline" size="sm">CSV</Button>
          </a>
          <a href={getExportUrl(evalId, "json")} download>
            <Button variant="outline" size="sm">JSON</Button>
          </a>
          <a href={getExportUrl(evalId, "pdf")} download>
            <Button variant="primary" size="sm">PDF</Button>
          </a>
        </div>
      </div>

      {/* Score Hero */}
      <Card  className="mb-5 border border-default-200 bg-gradient-to-br from-slate-50 to-blue-50">
        <Card.Content className="p-6">
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
                <span className="text-4xl font-black text-foreground">{evaluation.total_marks.toFixed(1)}</span>
                <span className="text-xs text-default-400">total marks</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 grid grid-cols-2 gap-3 w-full">
              {[
                { label: "Correct", value: evaluation.correct_count, marks: `+${(evaluation.correct_count * evaluation.correct_marks_snapshot).toFixed(2)}`, color: "text-success", bg: "bg-success-50 border-success-100" },
                { label: "Wrong", value: evaluation.wrong_count, marks: `${(evaluation.wrong_count * evaluation.wrong_marks_snapshot).toFixed(2)}`, color: "text-danger", bg: "bg-danger-50 border-danger-100" },
                { label: "E (Don't Know)", value: evaluation.e_count, marks: `${(evaluation.e_count * evaluation.e_marks_snapshot).toFixed(2)}`, color: "text-warning", bg: "bg-warning-50 border-warning-100" },
                { label: "Unanswered", value: evaluation.unanswered_count, marks: "0.00", color: "text-default-500", bg: "bg-default-50 border-default-200" },
              ].map(item => (
                <div key={item.label} className={`flex items-center gap-3 p-3 rounded-xl border ${item.bg}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-default-500">{item.label}</p>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
                      <span className="text-xs text-default-400">{item.marks}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Accuracy + scoring breakdown */}
            <div className="flex-shrink-0 text-right space-y-3">
              <div>
                <p className="text-xs text-default-400 mb-1">Accuracy</p>
                <p className="text-3xl font-bold text-primary">{accuracy}%</p>
                <p className="text-xs text-default-400">{evaluation.correct_count} / {attempted} attempted</p>
              </div>
              <div className="border-t border-default-200 pt-3 text-xs text-default-500 space-y-1 text-right">
                <p>Correct: <span className="text-success">+{(evaluation.correct_count * evaluation.correct_marks_snapshot).toFixed(2)}</span></p>
                <p>Wrong penalty: <span className="text-danger">{(evaluation.wrong_count * evaluation.wrong_marks_snapshot).toFixed(2)}</span></p>
                <p>E penalty: <span className="text-warning">{(evaluation.e_count * evaluation.e_marks_snapshot).toFixed(2)}</span></p>
                <div className="border-t border-default-200 pt-1 mt-1">
                  <p>Final Score: <span className="text-foreground font-bold">{evaluation.total_marks.toFixed(2)}</span></p>
                </div>
              </div>
              <div className="text-xs">
                {evaluation.is_finalized
                  ? <Chip size="sm" color="success" variant="soft">Finalized</Chip>
                  : <Chip size="sm" color="warning" variant="soft">Draft</Chip>}
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Category question lists */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { key: "CORRECT", label: "Correct", color: "border-success-200 bg-success-50 text-success-700" },
          { key: "WRONG", label: "Wrong", color: "border-danger-200 bg-danger-50 text-danger-700" },
          { key: "E", label: "E Don't Know", color: "border-warning-200 bg-warning-50 text-warning-700" },
          { key: "UNANSWERED", label: "Unanswered", color: "border-default-200 bg-default-50 text-default-600" },
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
        <Button onPress={() => setShowOriginal(v => !v)} variant="outline" size="sm">
          {showOriginal ? "Hide" : "View"} Original OMR
        </Button>
        <Button onPress={() => setShowProcessed(v => !v)} variant="outline" size="sm">
          {showProcessed ? "Hide" : "View"} Detection Preview
        </Button>
      </div>

      {(showOriginal || showProcessed) && (
        <div className="flex gap-4 mb-5 flex-wrap">
          {showOriginal && (
            <Card  className="flex-1 min-w-64 border border-default-200">
              <Card.Content className="p-4">
                <p className="text-sm font-medium text-foreground mb-3">Original OMR Image</p>
                <img src={`${getOriginalImageUrl(evalId)}?t=${Date.now()}`} alt="Original OMR" className="w-full rounded-lg border border-default-200 object-contain max-h-96" />
              </Card.Content>
            </Card>
          )}
          {showProcessed && (
            <Card  className="flex-1 min-w-64 border border-default-200">
              <Card.Content className="p-4">
                <p className="text-sm font-medium text-foreground mb-3">Detection Overlay</p>
                <img src={`${getProcessedImageUrl(evalId)}?t=${Date.now()}`} alt="Processed OMR" className="w-full rounded-lg border border-default-200 object-contain max-h-96" />
              </Card.Content>
            </Card>
          )}
        </div>
      )}

      {/* Question Table */}
      <Card  className="border border-default-200 overflow-hidden">
        <Card.Content className="p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-default-200">
            <h2 className="font-semibold text-foreground">Question-wise Result</h2>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map(f => (
                <Button key={f} onPress={() => setFilter(f)} size="sm"
                  variant={filter === f ? "primary" : "secondary"}>
                  {f} ({f === "ALL" ? answers.length : answers.filter(a => a.result_type === f).length})
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-default-200 bg-default-50">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Q#</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Detected</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Correct</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Final</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Result</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Marks</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Confidence</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-default-400 uppercase tracking-wider">Method</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnswers.map(ans => (
                  <tr key={ans.question_number} className="border-b border-default-100 hover:bg-default-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-default-600">{ans.question_number}</td>
                    <td className="py-2.5 px-3 text-default-500">{ans.detected_answer || "—"}</td>
                    <td className="py-2.5 px-3 font-bold text-success">{ans.correct_answer || "—"}</td>
                    <td className="py-2.5 px-3 font-bold text-foreground">{ans.final_answer || ans.detected_answer || "—"}</td>
                    <td className="py-2.5 px-3">
                      {ans.result_type && RESULT_CHIP[ans.result_type] && (
                        <Chip size="sm" color={RESULT_CHIP[ans.result_type].color} variant="soft">
                          {RESULT_CHIP[ans.result_type].label}
                        </Chip>
                      )}
                    </td>
                    <td className={`py-2.5 px-3 font-semibold text-sm ${(ans.marks || 0) > 0 ? "text-success" : (ans.marks || 0) < 0 ? "text-danger" : "text-default-400"}`}>
                      {ans.marks !== null ? (ans.marks > 0 ? "+" : "") + (ans.marks ?? 0).toFixed(2) : "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-default-200">
                          <div
                            className={`h-full rounded-full transition-all ${(ans.confidence || 0) >= 0.8 ? "bg-success" : (ans.confidence || 0) >= 0.5 ? "bg-warning" : "bg-danger"}`}
                            style={{ width: `${(ans.confidence || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-default-400">{((ans.confidence || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs ${ans.detection_method === "MANUAL" ? "text-primary font-medium" : "text-default-400"}`}>
                        {ans.detection_method || "AUTO"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAnswers.length === 0 && (
              <div className="text-center py-8 text-default-400 text-sm">No questions in this category</div>
            )}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
