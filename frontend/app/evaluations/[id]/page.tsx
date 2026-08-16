"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, Button, Chip, Disclosure, Table, Tabs } from "@heroui/react";
import { Download, ChevronRight, Edit, Eye, EyeOff, Image as ImageIcon } from "lucide-react";
import { fetchEvaluation, getExportUrl, getOriginalImageUrl, getProcessedImageUrl } from "@/lib/api";
import type { Evaluation, EvaluationAnswer } from "@/types";
import ImageLightbox from "@/components/ImageLightbox";

const RESULT_CHIP: Record<string, { color: "success" | "danger" | "warning" | "default"; label: string }> = {
  CORRECT: { color: "success", label: "CORRECT" },
  WRONG: { color: "danger", label: "WRONG" },
  E: { color: "warning", label: "E" },
  UNANSWERED: { color: "default", label: "UNANSWERED" },
  AMBIGUOUS: { color: "default", label: "AMBIGUOUS" },
};

function DonutChart({ correct, wrong, e, unanswered }: {
  correct: number; wrong: number; e: number; unanswered: number;
}) {
  const total = correct + wrong + e + unanswered || 1;
  const segments = [
    { value: correct, color: "#22c55e", label: "Correct" },
    { value: wrong, color: "#ef4444", label: "Wrong" },
    { value: e, color: "#f97316", label: "E" },
    { value: unanswered, color: "#94a3b8", label: "Unanswered" },
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
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ffffff" strokeWidth={strokeW} />
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
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

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

  const FILTERS = ["ALL", "CORRECT", "WRONG", "E", "UNANSWERED"];

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
      <Card variant="secondary" className="mb-5 shadow-none">
        <Card.Content className="p-6">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Donut */}
            <div className="relative flex-shrink-0">
              <DonutChart
                correct={evaluation.correct_count}
                wrong={evaluation.wrong_count}
                e={evaluation.e_count}
                unanswered={evaluation.unanswered_count}
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
                <Card key={item.label} className={`flex items-left gap-4 p-4  ${item.bg}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-default-500">{item.label}</p>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
                      <span className="text-xs text-default-400">{item.marks}</span>
                    </div>
                  </div>
                </Card>
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
          { key: "CORRECT", label: "Correct" },
          { key: "WRONG", label: "Wrong" },
          { key: "E", label: "E Don't Know" },
          { key: "UNANSWERED", label: "Unanswered" },
        ].map(cat => (
          <Card variant="secondary" key={cat.key} className={`p-4 `}>
            <p className="text-xs font-semibold">{cat.label} ({byCategory[cat.key]?.length || 0})</p>
            <p className="text-xs leading-relaxed opacity-70 ">
              {byCategory[cat.key]?.length > 0
                ? byCategory[cat.key].join(", ")
                : "None"}
            </p>
          </Card>
        ))}
      </div>

     {/* Image Previews — Disclosure panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Original OMR */}
        <Disclosure>
          <Disclosure.Heading>
            <Button slot="trigger" variant="secondary" fullWidth>
              <span className="flex items-center gap-2">
                <ImageIcon size={16} className="text-primary" />
                Original OMR Sheet
              </span>
              <Disclosure.Indicator />
            </Button>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body className="mt-2 rounded-xl border border-default-200 bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${getOriginalImageUrl(evalId)}?t=${Date.now()}`}
                alt="Original OMR"
                className="w-full rounded-lg border border-default-200 object-contain max-h-96 cursor-zoom-in hover:opacity-90 transition-opacity"
                onClick={() => setLightboxSrc(`${getOriginalImageUrl(evalId)}?t=${Date.now()}`)}
              />
              <p className="text-xs text-default-400 mt-2 text-center">Click image to view fullscreen</p>
            </Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>

        {/* Detection Preview */}
        <Disclosure>
          <Disclosure.Heading>
            <Button slot="trigger" variant="secondary" fullWidth>
              <span className="flex items-center gap-2">
                <ImageIcon size={16} className="text-success" />
                Detection Preview
              </span>
              <Disclosure.Indicator />
            </Button>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body className="mt-2 rounded-xl border border-default-200 bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${getProcessedImageUrl(evalId)}?t=${Date.now()}`}
                alt="Detection Preview"
                className="w-full rounded-lg border border-default-200 object-contain max-h-96 cursor-zoom-in hover:opacity-90 transition-opacity"
                onClick={() => setLightboxSrc(`${getProcessedImageUrl(evalId)}?t=${Date.now()}`)}
              />
              <p className="text-xs text-default-400 mt-2 text-center">Click image to view fullscreen</p>
            </Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
      </div>

      {/* Fullscreen Lightbox */}
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt="OMR Preview"
          onClose={() => setLightboxSrc(null)}
        />
      )}

     {/* Question Table */}
  <Card  className="w-full border overflow-hidden">
  {/* Header / Filters */}
  <div className="flex items-center justify-between gap-4 px-4">
  <h2 className="w-full font-semibold text-foreground">
    Question-wise Result
  </h2>

  <Tabs
  selectedKey={filter}
  onSelectionChange={(key) => setFilter(String(key))}
  className="w-full"
>
  <Tabs.ListContainer className="w-full">
    <Tabs.List
      aria-label="Question result filters"
      className="w-full"
    >
      {FILTERS.map((f) => (
        <Tabs.Tab
          key={f}
          id={f}
          className="whitespace-nowrap"
        >
          {f} (
          {f === "ALL"
            ? answers.length
            : answers.filter((a) => a.result_type === f).length}
          )
          <Tabs.Indicator />
        </Tabs.Tab>
      ))}
    </Tabs.List>
  </Tabs.ListContainer>
</Tabs>
</div>
  {/* Table */}
  <Table>
    <Table.ScrollContainer>
      <Table.Content
        aria-label="Question-wise result"
        className="min-w-[900px]"
      >
        <Table.Header>
          <Table.Column isRowHeader id="question">
            Q#
          </Table.Column>

          <Table.Column id="detected">
            Detected
          </Table.Column>

          <Table.Column id="correct">
            Correct
          </Table.Column>

          <Table.Column id="final">
            Final
          </Table.Column>

          <Table.Column id="result">
            Result
          </Table.Column>

          <Table.Column id="marks">
            Marks
          </Table.Column>

          <Table.Column id="confidence">
            Confidence
          </Table.Column>

          <Table.Column id="method">
            Method
          </Table.Column>
        </Table.Header>

        <Table.Body>
          {filteredAnswers.map((ans) => (
            <Table.Row key={ans.question_number} id={ans.question_number}>
              {/* Q# */}
              <Table.Cell className="font-mono font-semibold text-default-600">
                {ans.question_number}
              </Table.Cell>

              {/* Detected */}
              <Table.Cell className="text-default-500">
                {ans.detected_answer || "—"}
              </Table.Cell>

              {/* Correct */}
              <Table.Cell className="font-bold text-success">
                {ans.correct_answer || "—"}
              </Table.Cell>

              {/* Final */}
              <Table.Cell className="font-bold text-foreground">
                {ans.final_answer ||
                  ans.detected_answer ||
                  "—"}
              </Table.Cell>

              {/* Result */}
              <Table.Cell>
                {ans.result_type &&
                  RESULT_CHIP[ans.result_type] && (
                    <Chip
                      size="sm"
                      color={RESULT_CHIP[ans.result_type].color}
                      variant="soft"
                    >
                      {RESULT_CHIP[ans.result_type].label}
                    </Chip>
                  )}
              </Table.Cell>

              {/* Marks */}
              <Table.Cell>
                <span
                  className={`font-semibold ${
                    (ans.marks || 0) > 0
                      ? "text-success"
                      : (ans.marks || 0) < 0
                        ? "text-danger"
                        : "text-default-400"
                  }`}
                >
                  {ans.marks !== null
                    ? `${ans.marks > 0 ? "+" : ""}${(
                        ans.marks ?? 0
                      ).toFixed(2)}`
                    : "—"}
                </span>
              </Table.Cell>

              {/* Confidence */}
              <Table.Cell>
                <div className="flex min-w-[110px] items-center gap-2">
                  <div className="h-1.5 w-12 overflow-hidden rounded-full bg-default-200">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (ans.confidence || 0) >= 0.8
                          ? "bg-success"
                          : (ans.confidence || 0) >= 0.5
                            ? "bg-warning"
                            : "bg-danger"
                      }`}
                      style={{
                        width: `${(ans.confidence || 0) * 100}%`,
                      }}
                    />
                  </div>

                  <span className="text-xs text-default-400">
                    {((ans.confidence || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </Table.Cell>

              {/* Method */}
              <Table.Cell>
                <span
                  className={`text-xs ${
                    ans.detection_method === "MANUAL"
                      ? "font-medium text-primary"
                      : "text-default-400"
                  }`}
                >
                  {ans.detection_method || "AUTO"}
                </span>
              </Table.Cell>
            </Table.Row>
          ))}

        </Table.Body>
      </Table.Content>
    </Table.ScrollContainer>

    {/* Empty state */}
    {filteredAnswers.length === 0 && (
      <div className="border-t border-default-200 py-8 text-center text-sm text-default-400">
        No questions in this category
      </div>
    )}
  </Table>
  </Card>
</div>
  );
}
