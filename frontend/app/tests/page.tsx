"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Button, Chip, Modal, ModalBackdrop, ModalContainer, ModalDialog, ModalHeader, ModalBody, ModalFooter, useOverlayState } from "@heroui/react";
import { Plus, ClipboardList, CheckCircle, AlertTriangle, WindowExpandBottomRight, Checklist, Trash6 } from "reicon-react";
import { fetchTests, deleteTest } from "@/lib/api";
import type { Test } from "@/types";

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [testToDelete, setTestToDelete] = useState<{id: number, name: string} | null>(null);
  const state = useOverlayState();

  async function load() {
    setLoading(true);
    try { setTests(await fetchTests()); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function confirmDelete(id: number, name: string) {
    setTestToDelete({ id, name });
    state.open();
  }

  async function handleDelete() {
    if (!testToDelete) return;
    setDeletingId(testToDelete.id);
    try {
      await deleteTest(testToDelete.id);
      setTests(p => p.filter(t => t.id !== testToDelete.id));
      state.close();
    } catch (e: any) {
      alert("Delete failed: " + e.message);
    } finally {
      setDeletingId(null);
      setTestToDelete(null);
    }
  }

  return (
    <div className="p-8">
      <div className="flex  items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tests</h1>
          <p className="text-default-500 text-sm mt-1">Manage your OMR evaluation tests</p>
        </div>
        <Link href="/tests/new"><Button   variant="primary" ><Plus/>Create Test</Button></Link>
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
            <Card variant="secondary" key={test.id}  className="shadow-none">
              <Card.Content className="p-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-5">
                  <Card className="w-12 h-12 rounded-xl flex items-center justify-center text-primary font-bold shadow-none">
                    {test.total_questions}
                  </Card>
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
                    <Button size="sm" variant="secondary" > Open</Button>
                  </Link>
                  {test.answer_key_count > 0 && (
                    <Link href={`/tests/${test.id}/evaluate`}>
                      <Button size="sm" variant="primary"><Checklist />Evaluate</Button>
                    </Link>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    onPress={() => confirmDelete(test.id, test.name)}
                  >
                    <Trash6 />
                    Delete
                  </Button>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      <Modal>
        <ModalBackdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
          <ModalContainer>
          <ModalDialog>
            {({ close }) => (
              <>
                <ModalHeader className="flex flex-col gap-1">Confirm Deletion</ModalHeader>
                <ModalBody>
                  <p>
                    Are you sure you want to delete the test <strong>{testToDelete?.name}</strong> and all its evaluations?
                  </p>
                  <p className="text-danger">This action cannot be undone.</p>
                </ModalBody>
                <ModalFooter>
                  <Button variant="tertiary" onPress={close}>
                    Cancel
                  </Button>
                  <Button variant="danger" isPending={deletingId === testToDelete?.id} onPress={handleDelete}>
                    Delete Test
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalDialog>
        </ModalContainer>
        </ModalBackdrop>
      </Modal>
    </div>
  );
}
