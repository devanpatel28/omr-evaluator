"use client";
import { useEffect, useState } from "react";
import { Card, Slider, Button } from "@heroui/react";
import { AlertTriangle, Folder, Database, Image as ImageIcon, Settings as SettingsIcon, Shield, Wifi, HardDrive, FileType } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [local, setLocal] = useState<any>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch("http://localhost:8000/api/settings")
      .then(r => r.json())
      .then(s => { setSettings(s); setLocal({ ...s }); })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("http://localhost:8000/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fill_threshold: local.fill_threshold,
          confidence_threshold: local.confidence_threshold,
          ambiguity_margin: local.ambiguity_margin,
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error("Failed to save settings", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-default-500 text-sm mt-1">OMR processing configuration and system settings</p>
      </div>

      <Card className="mb-5 border border-default-200">
        <Card.Content className="p-6">
          <h2 className="font-semibold text-foreground mb-1">OMR Detection Parameters</h2>
          <p className="text-xs text-default-400 mb-6 leading-relaxed">
            These values are read from the backend config. To change them permanently, edit
            <code className="bg-default-100 px-1 rounded mx-1 text-default-600">backend/.env</code> or
            <code className="bg-default-100 px-1 rounded mx-1 text-default-600">backend/app/core/config.py</code>.
          </p>

          {local ? (
            <div className="space-y-8">
              {[
                { key: "fill_threshold", label: "Fill Threshold", hint: "Minimum fill ratio (0.0–1.0) to consider a bubble marked. Default: 0.35", min: 0.1, max: 0.9, step: 0.01 },
                { key: "confidence_threshold", label: "Confidence Threshold", hint: "Below this value, the detection is flagged as low confidence. Default: 0.80", min: 0.1, max: 1.0, step: 0.01 },
                { key: "ambiguity_margin", label: "Ambiguity Margin", hint: "If top-2 bubbles differ by less than this, mark AMBIGUOUS. Default: 0.10", min: 0.01, max: 0.3, step: 0.01 },
              ].map(f => (
                <div key={f.key}>
                  <Slider
                    step={f.step}
                    maxValue={f.max}
                    minValue={f.min}
                    value={local[f.key]}
                    onChange={(val) => setLocal((p: any) => ({ ...p, [f.key]: val }))}
                    className="max-w-md"
                    
                  >
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{f.label}</span>
                      <Slider.Output className="text-sm font-medium">
                        {({ state }) => `${Number(state.values[0]).toFixed(2)}`}
                      </Slider.Output>
                    </div>
                    <Slider.Track>
                      <Slider.Fill className="bg-primary" />
                      <Slider.Thumb className="bg-primary border-primary-500" />
                    </Slider.Track>
                  </Slider>
                  <p className="text-xs text-default-400 mt-2">{f.hint}</p>
                </div>
              ))}

              <div className="mt-8 flex items-center gap-4">
                <Button 
                  color="primary" 
                  onPress={handleSave} 
                  isLoading={isSaving}
                >
                  Save Changes
                </Button>
                {saveSuccess && (
                  <span className="text-success-600 text-sm font-medium">Settings saved successfully!</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <SettingsIcon size={32} className="mx-auto mb-3 text-default-300" />
              <p className="text-default-500 text-sm">Backend not connected</p>
              <p className="text-default-400 text-xs mt-1">Start the FastAPI server to view settings</p>
            </div>
          )}
        </Card.Content>
      </Card>

      <Card className="mb-5 border border-default-200">
        <Card.Content className="p-6">
          <h2 className="font-semibold text-foreground mb-4">System Information</h2>
          <div className="space-y-0 text-sm">
            {[
              { label: "Frontend", value: "Next.js + TypeScript + HeroUI", icon: SettingsIcon },
              { label: "Backend", value: "Python + FastAPI + OpenCV + NumPy", icon: Database },
              { label: "Database", value: "SQLite (local, no cloud)", icon: Database },
              { label: "OMR Engine", value: "Computer vision (no AI, no cloud)", icon: ImageIcon },
              { label: "Authentication", value: "None required", icon: Shield },
              { label: "Internet Required", value: "No — fully local", icon: Wifi },
              { label: "Max Questions", value: "200 per test", icon: FileType },
              { label: "Export Formats", value: "CSV, JSON, PDF", icon: HardDrive },
            ].map((item, i) => (
              <div key={item.label} className="flex justify-between py-3 border-b border-default-100 last:border-0 items-center">
                <span className="text-default-500 flex items-center gap-2">
                  <item.icon size={14} className="text-default-400" />
                  {item.label}
                </span>
                <span className="text-foreground text-right font-medium max-w-[60%]">{item.value}</span>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>

      <Card className="border border-default-200">
        <Card.Content className="p-6">
          <h2 className="font-semibold text-foreground mb-4">Data Storage</h2>
          <div className="space-y-3 font-mono text-xs text-default-600 bg-default-50 p-4 rounded-xl border border-default-100">
            <p className="flex items-center gap-2"><Folder size={14} className="text-primary" /> data/database/omr.sqlite</p>
            <p className="flex items-center gap-2"><Folder size={14} className="text-primary" /> data/tests/&lt;test-id&gt;/</p>
            <p className="flex items-center gap-2"><Folder size={14} className="text-primary" /> data/evaluations/&lt;eval-id&gt;/</p>
            <p className="flex items-center gap-2"><Folder size={14} className="text-primary" /> data/templates/</p>
          </div>
          <p className="text-xs text-default-400 mt-4 flex items-center gap-1.5">
            <HardDrive size={12} /> All data stored locally in the omr-evaluator/ project directory
          </p>
        </Card.Content>
      </Card>
    </div>
  );
}
