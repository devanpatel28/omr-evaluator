const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!res.ok) {
    let errorBody: any = {};
    try { errorBody = await res.json(); } catch (_) {}
    const message = errorBody?.detail?.message || errorBody?.detail || errorBody?.message || `HTTP ${res.status}`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }

  if (res.status === 204) {
    return null;
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

export async function fetchTests() {
  return apiFetch("/api/tests");
}

export async function fetchTest(id: number) {
  return apiFetch(`/api/tests/${id}`);
}

export async function createTest(data: {
  name: string;
  total_questions: number;
  correct_marks: number;
  wrong_marks: number;
  e_marks: number;
  unanswered_marks: number;
}) {
  return apiFetch("/api/tests", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteTest(id: number) {
  return apiFetch(`/api/tests/${id}`, { method: "DELETE" });
}

// ── Answer Key ─────────────────────────────────────────────────────────────────

export async function uploadAnswerKey(testId: number, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/tests/${testId}/answer-key`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    let body: any = {};
    try { body = await res.json(); } catch (_) {}
    const detail = body?.detail;
    throw Object.assign(new Error(detail?.message || "Upload failed"), { errors: detail?.errors || [], warnings: detail?.warnings || [] });
  }
  return res.json();
}

export async function validateAnswerKey(testId: number, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/tests/${testId}/answer-key/validate`, {
    method: "POST",
    body: form,
  });
  return res.json();
}

export async function fetchAnswerKey(testId: number) {
  return apiFetch(`/api/tests/${testId}/answer-key`);
}

// ── Evaluations ────────────────────────────────────────────────────────────────

export async function fetchEvaluations(testId: number) {
  return apiFetch(`/api/tests/${testId}/evaluations`);
}

export async function fetchEvaluation(evalId: number) {
  return apiFetch(`/api/evaluations/${evalId}`);
}

export async function evaluateOMR(testId: number, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/tests/${testId}/evaluate`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    let body: any = {};
    try { body = await res.json(); } catch (_) {}
    const detail = body?.detail;
    throw Object.assign(
      new Error(detail?.message || detail?.error || "OMR processing failed"),
      { steps: detail?.steps || [], warnings: detail?.warnings || [] }
    );
  }
  return res.json();
}

export async function applyCorrections(evalId: number, corrections: { question_number: number; answer: string }[]) {
  return apiFetch(`/api/evaluations/${evalId}/correct`, {
    method: "POST",
    body: JSON.stringify({ corrections }),
  });
}

export async function finalizeEvaluation(evalId: number, corrections?: { question_number: number; answer: string }[]) {
  return apiFetch(`/api/evaluations/${evalId}/finalize`, {
    method: "POST",
    body: JSON.stringify({ corrections }),
  });
}

export async function deleteEvaluation(evalId: number) {
  return apiFetch(`/api/evaluations/${evalId}`, { method: "DELETE" });
}

// ── Export ─────────────────────────────────────────────────────────────────────

export function getExportUrl(evalId: number, format: "csv" | "json" | "pdf") {
  return `${API_BASE}/api/evaluations/${evalId}/export/${format}`;
}

// ── Templates ──────────────────────────────────────────────────────────────────

export async function fetchTemplates() {
  return apiFetch("/api/templates");
}

export async function fetchDefaultTemplate() {
  return apiFetch("/api/templates/default");
}

export async function createTemplate(data: any) {
  return apiFetch("/api/templates", { method: "POST", body: JSON.stringify(data) });
}

export async function updateTemplate(id: string, data: any) {
  return apiFetch(`/api/templates/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function generateOMRSheet(formData: FormData) {
  const res = await fetch(`${API_BASE}/api/templates/generate`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to generate template");
  return res.blob();
}

// ── Images ─────────────────────────────────────────────────────────────────────

export function getOriginalImageUrl(evalId: number) {
  return `${API_BASE}/api/evaluations/${evalId}/image/original`;
}

export function getProcessedImageUrl(evalId: number) {
  return `${API_BASE}/api/evaluations/${evalId}/image/processed`;
}
