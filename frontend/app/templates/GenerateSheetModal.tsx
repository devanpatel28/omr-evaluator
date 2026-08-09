"use client";
import { useState, useRef } from "react";
import { 
  Modal, 
  Button, 
  Input 
} from "@heroui/react";
import { FileDown, Image as ImageIcon, AlertCircle } from "lucide-react";
import { generateOMRSheet } from "@/lib/api";

export default function GenerateSheetModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const [instituteName, setInstituteName] = useState("");
  const [examName, setExamName] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<"pdf" | "png">("pdf");
  const [error, setError] = useState("");
  
  const fileRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    
    try {
      const formData = new FormData();
      if (instituteName) formData.append("institute_name", instituteName);
      if (examName) formData.append("exam_name", examName);
      if (logo) formData.append("logo", logo);
      formData.append("format", format);

      const blob = await generateOMRSheet(formData);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `omr_sheet_200.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to generate sheet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} >
      <Modal.Dialog>
        <Modal.Header className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-foreground">Generate OMR Sheet</h2>
          <p className="text-sm text-default-500 font-normal">
            Generate a printable 200-question OMR sheet. Optional fields will appear in the header.
          </p>
        </Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as "pdf" | "png")}
                className="w-full bg-default-100 border-2 border-transparent hover:bg-default-200 focus:bg-default-100 focus:border-primary rounded-xl px-3 py-2 text-sm outline-none transition-colors"
              >
                <option value="pdf">PDF</option>
                <option value="png">PNG Image</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Institute Name (Optional)</label><input className="w-full bg-default-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. OMRly Institute" 
              value={instituteName}
              onChange={(e) => setInstituteName(e.target.value)}
             /></div>
            
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Exam Name (Optional)</label><input className="w-full bg-default-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Final Examination 2026" 
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
             /></div>

            <div>
              <p className="text-sm text-foreground mb-2">Logo (Optional)</p>
              <div 
                className="border-2 border-dashed border-default-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-default-50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setLogo(e.target.files?.[0] || null)}
                />
                {logo ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-primary truncate max-w-[200px]">{logo.name}</p>
                    <p className="text-xs text-default-400 mt-1">Click to change</p>
                  </div>
                ) : (
                  <div className="text-center flex flex-col items-center">
                    <ImageIcon size={24} className="text-default-400 mb-2" />
                    <p className="text-sm text-default-600">Click to upload logo</p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-xl flex items-start gap-2">
                <AlertCircle size={16} className="text-danger mt-0.5" />
                <p className="text-danger text-sm">{error}</p>
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline" onPress={onClose} isDisabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onPress={handleGenerate} isPending={loading}>
            {!loading && <FileDown size={16} />}
            {loading ? "Generating..." : "Generate PDF"}
          </Button>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal>
  );
}
