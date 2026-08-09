"use client";
import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Input } from "@heroui/react";
import { CheckCircle2, FileText, Upload, AlertTriangle } from "lucide-react";
import { createTest, uploadAnswerKey } from "@/lib/api";

export default function NewTestPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(200);
  const [correctMarks, setCorrectMarks] = useState(1.0);
  const [wrongMarks, setWrongMarks] = useState(-1.25);
  const [eMarks, setEMarks] = useState(-1.0);
  const [unansweredMarks, setUnansweredMarks] = useState(-1.25);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [keyErrors, setKeyErrors] = useState<string[]>([]);
  const [keyWarnings, setKeyWarnings] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyFile) { setError("Please upload an answer key file."); return; }
    setError(""); setKeyErrors([]); setKeyWarnings([]);
    setSaving(true);
    try {
      // Create test
      const test = await createTest({
        name,
        total_questions: totalQuestions,
        correct_marks: correctMarks,
        wrong_marks: wrongMarks,
        e_marks: eMarks,
        unanswered_marks: unansweredMarks,
      });
      // Upload answer key
      try {
        const keyResult = await uploadAnswerKey(test.id, keyFile);
        if (keyResult.warnings?.length) setKeyWarnings(keyResult.warnings);
        router.push(`/tests/${test.id}`);
      } catch (keyErr: any) {
        setKeyErrors(keyErr.errors || [keyErr.message]);
        setSaving(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create test");
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Create New Test</h1>
        <p className="text-default-500 text-sm mt-1">Configure test settings and upload the answer key</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
          {/* Test Info */}
        <Card variant="secondary">
          <Card.Content className="p-6 space-y-5">
            <h2 className="font-semibold text-foreground border-b border-default-100 pb-3">Test Information</h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Test Name</label>
              <Input className="w-full bg-default-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                required
                placeholder="e.g. NEET Mock Test 01"
                value={name}
                onChange={(e) => setName(e.target.value)}

              />
            </div>

            <div>
              <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Total Questions</label>
              <Input type="number" min={1} max={200} value={String(totalQuestions)} onChange={(e) => setTotalQuestions(Number(e.target.value))} className="w-full bg-default-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" /><p className="text-xs text-default-500">Maximum: 200 questions</p></div>
            </div>
          </Card.Content>
        </Card>

        {/* Scoring */}
        <Card variant="secondary">
          <Card.Content className="p-6 space-y-4">
            <h2 className="font-semibold text-foreground border-b border-default-100 pb-3">Scoring Rules</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Correct Answer", value: correctMarks, setter: setCorrectMarks, hint: "Marks awarded for correct answer" },
                { label: "Wrong Answer (A/B/C/D)", value: wrongMarks, setter: setWrongMarks, hint: "Marks deducted for wrong answer" },
                { label: "E / Don't Know", value: eMarks, setter: setEMarks, hint: "Marks deducted when student selects E" },
                { label: "Unanswered", value: unansweredMarks, setter: setUnansweredMarks, hint: "Marks for unanswered questions" },
              ].map(field => (
                <div key={field.label} className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">{field.label}</label>
                  <Input
                    type="number"
                    step={0.01}
                    value={field.value}
                    onChange={e => field.setter(Number(e.target.value))}
                    className="w-full bg-default-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-default-500">{field.hint}</p>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="mt-2 p-3 rounded-2xl bg-white border border-default-100">
              <p className="text-xs text-default-500 font-medium mb-2">Score Preview (example: 100 correct, 40 wrong, 20 E, 40 unanswered)</p>
              <p className="text-sm text-foreground font-semibold">
                {((100 * correctMarks) + (40 * wrongMarks) + (20 * eMarks) + (40 * unansweredMarks)).toFixed(2)} marks
              </p>
            </div>
          </Card.Content>
        </Card>
      


       
          {/* Answer Key */}
        <Card variant="secondary">
          <Card.Content className="p-6">
            <h2 className="font-semibold text-foreground border-b border-default-100 pb-3 mb-4">Answer Key *</h2>

            <div
              className={`border-2 border-dashed rounded-2xl bg-white p-10 text-center cursor-pointer transition-all ${keyFile
                  ? "border-success-300 bg-success-50"
                  : "border-default-300 bg-default-50 hover:border-primary-300 hover:bg-primary-50"
                }`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-primary-400", "bg-primary-50"); }}
              onDragLeave={e => { e.currentTarget.classList.remove("border-primary-400", "bg-primary-50"); }}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-primary-400", "bg-primary-50");
                const f = e.dataTransfer.files[0];
                if (f) setKeyFile(f);
              }}
            >
              <input ref={fileRef} type="file" accept=".json,.csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) setKeyFile(f); }} />

              {keyFile ? (
                <>
                  <CheckCircle2 size={40} className="mx-auto mb-2 text-success" />
                  <p className="text-success-600 font-medium">{keyFile.name}</p>
                  <p className="text-default-400 text-sm mt-1">{(keyFile.size / 1024).toFixed(1)} KB — Click to change</p>
                </>
              ) : (
                <>
                  <FileText size={40} className="mx-auto mb-3 text-default-300" />
                  <p className="text-default-600 font-medium">Drop answer key here or click to browse</p>
                  <p className="text-default-400 text-sm mt-1">Supported: JSON, CSV</p>
                  <div className="mt-3 text-xs text-default-400 font-mono">
                    CSV: question,answer&nbsp;&nbsp;|&nbsp;&nbsp;JSON: [&#123;&quot;question:1, answer:&apos;A&apos;&quot;&#125;]
                  </div>
                </>
              )}
            </div>

            {keyErrors.length > 0 && (
              <Card className="mt-4 border border-danger-200 bg-danger-50" >
                <Card.Content className="p-4">
                  <p className="text-danger text-sm font-medium mb-2">Answer key validation errors:</p>
                  <ul className="space-y-1">
                    {keyErrors.map((e, i) => <li key={i} className="text-danger-500 text-xs flex items-start gap-1"><AlertTriangle size={12} className="mt-0.5 flex-shrink-0" /> {e}</li>)}
                  </ul>
                </Card.Content>
              </Card>
            )}

            {keyWarnings.length > 0 && (
              <Card className="mt-4 border border-warning-200 bg-warning-50" >
                <Card.Content className="p-3">
                  {keyWarnings.map((w, i) => <p key={i} className="text-warning-600 text-xs flex items-center gap-1"><AlertTriangle size={12} /> {w}</p>)}
                </Card.Content>
              </Card>
            )}
          </Card.Content>
        </Card>
        </div>
        <div className="grid grid-cols-5 ">
          
        {error && (
          <Card className="border border-danger-200 bg-danger-50" >
            <Card.Content className="p-4 text-danger text-sm">{error}</Card.Content>
          </Card>
        )}

        <div className="flex gap-3">
          <Button type="submit" variant="primary" className="flex-1" isPending={saving}>
            {saving ? "Creating..." : "Create Test"}
          </Button>
          <Link href="/tests"><Button variant="outline">Cancel</Button></Link>
        </div>
        </div>

     
     
      </form>
    </div>
  );
}
