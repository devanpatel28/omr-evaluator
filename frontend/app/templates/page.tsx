"use client";
import { useEffect, useState } from "react";
import { Card, Button, Input, Accordion } from "@heroui/react";
import { FileDown, RefreshCcw, Save, Info, AlertTriangle } from "lucide-react";
import { fetchDefaultTemplate, updateTemplate } from "@/lib/api";
import GenerateSheetModal from "./GenerateSheetModal";

export default function TemplatesPage() {
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localTemplate, setLocalTemplate] = useState<any>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  useEffect(() => {
    fetchDefaultTemplate().then(t => {
      setTemplate(t);
      setLocalTemplate(JSON.parse(JSON.stringify(t)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!localTemplate) return;
    setSaving(true);
    try {
      await updateTemplate("omrly-default-200", localTemplate);
      setTemplate(localTemplate);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  function updateSection(idx: number, field: string, value: number) {
    setLocalTemplate((prev: any) => {
      const t = JSON.parse(JSON.stringify(prev));
      t.sections[idx][field] = value;
      return t;
    });
  }

  if (loading) return <div className="p-8 text-default-500">Loading template...</div>;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">OMR Templates</h1>
          <p className="text-default-500 text-sm mt-1">Calibrate bubble grid coordinates for your OMR sheet format</p>
        </div>
        <Button onPress={() => setShowGenerateModal(true)} variant="primary">
          <FileDown size={16} className="mr-1.5" /> Generate Sheet PDF
        </Button>
      </div>

      <GenerateSheetModal 
        isOpen={showGenerateModal} 
        onClose={() => setShowGenerateModal(false)} 
      />

      {template && localTemplate && (
        <div className="space-y-6">
          <Card className="border border-default-200">
            <Card.Content className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Info size={16} className="text-primary" />
                <h2 className="font-semibold text-foreground">Template Info</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[
                  { label: "Template Name", value: localTemplate.name },
                  { label: "Total Questions", value: localTemplate.total_questions },
                  { label: "Options", value: localTemplate.options?.join(", ") },
                  { label: "Page Width (px)", value: localTemplate.page_width },
                  { label: "Page Height (px)", value: localTemplate.page_height },
                  { label: "Sections", value: localTemplate.sections?.length },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-default-500 mb-1">{item.label}</p>
                    <p className="text-sm text-foreground font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>

          <Card className="border border-default-200">
            <Card.Content className="p-6">
              <h2 className="font-semibold text-foreground mb-2">Column Sections</h2>
              <p className="text-xs text-default-500 mb-6">
                The OMRly sheet has 4 columns of 50 questions each. Adjust the coordinates to match the
                actual bubble positions after perspective correction to 1000×1400 px.
              </p>

              <Accordion className="px-0">
                {localTemplate.sections?.map((section: any, idx: number) => (
                  <Accordion.Item key={idx} className="border-default-200">
                    <Accordion.Heading>
                      <Accordion.Trigger className="text-sm font-medium">
                        Column {idx + 1}: Questions {section.start_question}–{section.end_question}
                      </Accordion.Trigger>
                    </Accordion.Heading>
                    <Accordion.Panel>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2 pb-4">
                        {[
                          { field: "start_x", label: "Start X (Option A center)", hint: "X coord of leftmost bubble" },
                          { field: "start_y", label: "Start Y (Q1 center)", hint: "Y coord of first question row" },
                          { field: "row_height", label: "Row Height (px)", hint: "Vertical distance between rows" },
                          { field: "option_spacing", label: "Option Spacing (px)", hint: "Horizontal gap between A,B,C,D,E" },
                          { field: "bubble_radius", label: "Bubble Radius (px)", hint: "Radius of each bubble circle" },
                        ].map(f => (
                          <div key={f.field} className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium">{f.label}</label>
                            <input
                              type="number"
                              step={0.1}
                              value={section[f.field]}
                              onChange={e => updateSection(idx, f.field, Number(e.target.value))}
                              className="w-full bg-default-100 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                            />
                            <p className="text-xs text-default-500">{f.hint}</p>
                          </div>
                        ))}
                      </div>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>

              <div className="flex gap-3 mt-6">
                <Button 
                  onPress={handleSave} 
                  isPending={saving} 
                  variant="primary"
                >
                  {!saving && !saved && <Save size={16} className="mr-1.5" />}
                  {saving ? "Saving..." : saved ? "Saved!" : "Save Template"}
                </Button>
                <Button onPress={() => setLocalTemplate(JSON.parse(JSON.stringify(template)))} variant="outline">
                  <RefreshCcw size={16} className="mr-1.5" /> Reset Changes
                </Button>
              </div>
            </Card.Content>
          </Card>

          <Card className="border border-primary-200 bg-primary-50/30">
            <Card.Content className="p-6">
              <h2 className="font-semibold text-primary-700 mb-3 flex items-center gap-2">
                <Info size={18} /> Calibration Guide
              </h2>
              <div className="space-y-2 text-sm text-primary-800/80">
                <p>1. Process a test OMR sheet and check the "Detection Preview" image on the result page.</p>
                <p>2. If bubbles are misaligned, adjust Start X/Y for each column section.</p>
                <p>3. If rows are too close/far apart, adjust Row Height.</p>
                <p>4. If A,B,C,D,E bubbles overlap, adjust Option Spacing.</p>
                <p>5. After saving, re-process the OMR to verify the alignment.</p>
              </div>
              <div className="mt-5 p-4 rounded-xl bg-warning-50 border border-warning-200 flex items-start gap-3">
                <AlertTriangle size={18} className="text-warning-600 mt-0.5 flex-shrink-0" />
                <p className="text-warning-700 text-xs leading-relaxed">
                  The default values are calibrated for the OMRly 200-question OMR sheet normalized to 1000×1400 px.
                  Changing these values affects all future evaluations. Existing evaluations are not affected.
                </p>
              </div>
            </Card.Content>
          </Card>
        </div>
      )}
    </div>
  );
}
