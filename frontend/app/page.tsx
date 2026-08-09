"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Button, Chip, ProgressBar } from "@heroui/react";
import {
  Plus,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  ArrowRight,
  FileText,
  CheckCircle,
  BookOpen,
  Download,
  KeyRound,
} from "lucide-react";
import { fetchTests, fetchEvaluations } from "@/lib/api";
import type { Test, EvaluationSummary } from "@/types";

function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card variant="tertiary">
      <Card.Content className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-default-400">
              {label}
            </p>
            <p className="text-3xl font-bold text-foreground mt-2 leading-none">
              {value}
            </p>
            {sublabel && (
              <p className="text-xs text-default-400 mt-2">{sublabel}</p>
            )}
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} ${iconColor} shrink-0`}
          >
            <Icon size={32} />
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}

function SkeletonRow() {
  return <div className="h-16 rounded-xl bg-default-100 animate-pulse" />;
}

function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12">
      <div className="w-14 h-14 rounded-2xl bg-default-100 flex items-center justify-center mx-auto mb-4">
        <Icon size={24} className="text-default-300" />
      </div>
      <p className="text-default-600 text-sm font-medium">{title}</p>
      {subtitle && <p className="text-default-400 text-xs mt-1">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
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
        const allEvals: EvaluationSummary[] = [];
        for (const test of t.slice(0, 5)) {
          try {
            const evs = await fetchEvaluations(test.id);
            allEvals.push(
              ...evs.slice(0, 2).map((e: EvaluationSummary) => ({
                ...e,
                testName: test.name,
              }))
            );
          } catch {}
        }
        setRecentEvals(
          allEvals
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
            .slice(0, 6)
        );
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const totalEvals = tests.reduce((s, t) => s + t.evaluation_count, 0);
  const readyTests = tests.filter((t) => t.answer_key_count > 0).length;
  const readyPct = tests.length > 0 ? Math.round((readyTests / tests.length) * 100) : 0;
  const finalizedCount = recentEvals.filter((e) => e.is_finalized).length;

  return (
    <div className="p-8  mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            OMR Evaluation System
          </h1>
          <p className="text-default-500 mt-1 text-sm">
            OMRly — Local OMR Processing
          </p>
        </div>
        <Link href="/tests/new">
          <Button >
            <Plus/>
            Create New Test
          </Button>
        </Link>
      </div>

      {/* Backend status */}
      {backendOk === false && (
        <Card variant="tertiary" className="mb-6 border border-danger-200 bg-danger-50 shadow-none">
          <Card.Content className="p-4 flex flex-row items-center gap-3">
            <AlertTriangle size={18} className="text-danger flex-shrink-0" />
            <div>
              <p className="text-danger text-sm font-medium">
                Backend not running
              </p>
              <p className="text-danger-400 text-xs mt-0.5">
                Start the FastAPI server:{" "}
                <code className="bg-white/60 px-1.5 py-0.5 rounded text-xs">
                  uvicorn app.main:app --reload
                </code>{" "}
                in the{" "}
                <code className="bg-white/60 px-1.5 py-0.5 rounded text-xs">
                  backend/
                </code>{" "}
                directory
              </p>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Total Tests"
          value={tests.length}
          sublabel={tests.length > 0 ? `${totalEvals} total evaluations run` : "No tests created yet"}
          icon={ClipboardList}
          iconBg="bg-primary-100"
          iconColor="text-primary"
        />
        <StatCard
          label="Total Evaluations"
          value={totalEvals}
          sublabel={recentEvals.length > 0 ? `${finalizedCount} finalized recently` : "Upload a sheet to begin"}
          icon={BarChart3}
          iconBg="bg-secondary-100"
          iconColor="text-secondary"
        />
        <StatCard
          label="Ready to Evaluate"
          value={readyTests}
          sublabel={tests.length > 0 ? `${readyPct}% of tests have answer keys` : "Add an answer key to start"}
          icon={CheckCircle}
          iconBg="bg-success-100"
          iconColor="text-success"
        />
      </div>

      {/* Recent Tests + Evaluations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="tertiary">
          <Card.Content className="p-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-foreground">Recent Tests</h2>
              <Link
                href="/tests"
              >
               <Button variant="secondary">
                 View all <ArrowRight size={12} />
               </Button>
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            ) : tests.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No tests yet"
                subtitle="Create your first test to get started"
                action={
                  <Link href="/tests/new">
                    <Button variant="tertiary" size="sm">
                      Create your first test
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {tests.slice(0, 5).map((test) => (
                  <Link
                    key={test.id}
                    href={`/tests/${test.id}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-default-50 hover:bg-default-100 border border-default-100 hover:border-primary-200 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary flex items-center justify-center shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                          {test.name}
                        </p>
                        <p className="text-xs text-default-500 mt-0.5">
                          {test.total_questions} questions · {test.evaluation_count} evaluations
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {test.answer_key_count > 0 ? (
                        <Chip size="sm" color="success" variant="soft">
                          Key ready
                        </Chip>
                      ) : (
                        <Chip size="sm" color="default" variant="soft">
                          No key
                        </Chip>
                      )}
                      <ArrowRight
                        size={14}
                        className="text-default-300 group-hover:text-default-500 transition-colors"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Recent Evaluations */}
        <Card variant="tertiary">
          <Card.Content className="p-3">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-foreground">Recent Evaluations</h2>
              <Link
                href="/evaluations"
              >
                <Button variant="secondary">
                 View all <ArrowRight size={12} />
               </Button>
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            ) : recentEvals.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No evaluations yet"
                subtitle="Upload an OMR sheet to get started"
              />
            ) : (
              <div className="space-y-3">
                {recentEvals.map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/evaluations/${ev.id}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-default-50 hover:bg-default-100 border border-default-100 hover:border-secondary-200 transition-all group"
                  >
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-secondary leading-none">
                          {ev.total_marks.toFixed(1)}
                        </span>
                        <span className="text-default-400 text-xs">marks</span>
                      </div>
                      <div className="flex items-center gap-2.5 mt-1.5 text-xs">
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle size={10} />
                          {ev.correct_count}
                        </span>
                        <span className="text-danger">✕ {ev.wrong_count}</span>
                        <span className="text-warning">E {ev.e_count}</span>
                        <span className="text-default-400">— {ev.unanswered_count}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-default-400">
                        {new Date(ev.created_at).toLocaleDateString("en-IN")}
                      </p>
                      {ev.is_finalized ? (
                        <Chip size="sm" color="success" variant="soft" className="mt-1">
                          Final
                        </Chip>
                      ) : (
                        <Chip size="sm" color="warning" variant="soft" className="mt-1">
                          Draft
                        </Chip>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Ready-to-evaluate progress */}
      {tests.length > 0 && (
        <Card variant="tertiary" className="mt-6 border border-default-200 shadow-none">
          <Card.Content className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground text-sm">
                Answer key coverage
              </h2>
              <span className="text-xs text-default-500">
                {readyTests} of {tests.length} tests ready
              </span>
            </div>
            <ProgressBar value={readyPct} color="success" className="h-2" />
          </Card.Content>
        </Card>
      )}

      {/* Quick guide */}
      <Card variant="tertiary" className="mt-6 shadow-none">
        <Card.Content className="p-3">
          <h2 className="font-semibold text-foreground mb-4">Quick Start Guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                step: "1",
                title: "Create Test",
                desc: "Set test name, question count, and scoring rules",
                href: "/tests/new",
                icon: FileText,
                color: "bg-primary-100 text-primary",
              },
              {
                step: "2",
                title: "Upload Answer Key",
                desc: "Import JSON or CSV answer key for the test",
                href: "/tests",
                icon: BookOpen,
                color: "bg-secondary-100 text-secondary",
              },
              {
                step: "3",
                title: "Process OMR",
                desc: "Upload a photo or scan of a filled OMR sheet",
                href: "/tests",
                icon: BarChart3,
                color: "bg-purple-100 text-purple-600",
              },
              {
                step: "4",
                title: "Review & Export",
                desc: "Correct detections, finalize score, export PDF/CSV",
                href: "/evaluations",
                icon: Download,
                color: "bg-pink-100 text-pink-600",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.step}
                  href={item.href}
                  className="relative flex flex-col gap-2 p-4 rounded-3xl bg-white hover:bg-white/90 hover:scale-105 border border-default-100 transition-all"
                >
                  <span className="absolute top-3 right-3 text-[10px] font-bold text-default-300">
                    {item.step}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center`}
                  >
                    <Icon size={16} />
                  </div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-default-500 leading-relaxed">{item.desc}</p>
                </Link>
              );
            })}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}