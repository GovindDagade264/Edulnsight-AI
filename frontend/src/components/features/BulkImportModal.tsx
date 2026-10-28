import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  X,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileDown,
  RotateCcw,
  Check
} from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [csvText, setCsvText] = useState<string>('');
  const [step, setStep] = useState<'upload' | 'preview' | 'confirmed'>('upload');
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [commitResult, setCommitResult] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAssessments();
      setStep('upload');
      setPreviewData(null);
      setError(null);
    }
  }, [isOpen]);

  const loadAssessments = async () => {
    try {
      const res = await api.academic.getAssessments();
      setAssessments(res.assessments);
      if (res.assessments.length > 0) {
        setSelectedAssessmentId(res.assessments[0].id);
      }
    } catch (err) {
      console.error('Failed to load assessments', err);
    }
  };

  const loadFormatTemplate = () => {
    const template = `roll_number,marks_obtained,status,remarks
`;
    setCsvText(template);
  };

  const handleParseAndPreview = async () => {
    if (!selectedAssessmentId) {
      setError('Please select an assessment.');
      return;
    }
    if (!csvText.trim()) {
      setError('Please paste or upload CSV data.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Parse CSV text into rows
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        setError('CSV must contain a header row and at least one student data row.');
        setLoading(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const rollIdx = headers.indexOf('roll_number');
      const marksIdx = headers.indexOf('marks_obtained');
      const statusIdx = headers.indexOf('status');
      const remarksIdx = headers.indexOf('remarks');

      if (rollIdx === -1) {
        setError("CSV header must contain 'roll_number'.");
        setLoading(false);
        return;
      }

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',').map(c => c.trim());
        rows.push({
          roll_number: cols[rollIdx] || '',
          marks_obtained: marksIdx !== -1 ? cols[marksIdx] : null,
          status: statusIdx !== -1 ? cols[statusIdx] : 'PRESENT',
          remarks: remarksIdx !== -1 ? cols[remarksIdx] : '',
        });
      }

      const res = await api.imports.preview({
        assessment_id: selectedAssessmentId,
        rows,
      });

      setPreviewData(res);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Validation preview failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData || !previewData.preview_rows) return;

    try {
      setLoading(true);
      setError(null);
      const res = await api.imports.commit({
        assessment_id: selectedAssessmentId,
        rows: previewData.preview_rows,
      });
      setCommitResult(res);
      setStep('confirmed');
      if (onImportSuccess) onImportSuccess();
    } catch (err: any) {
      setError(err.message || 'Import transaction failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-plum-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel-elevated rounded-3xl w-full max-w-4xl max-h-[85vh] border border-violet-lavender/30 shadow-2xl flex flex-col bg-plum-900/95 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-violet-lavender/15 flex items-center justify-between bg-plum-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-brand/20 text-violet-lavender border border-violet-brand/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Import Assessment Marks
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full glass-pill text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-left">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Target Assessment</label>
                <select
                  value={selectedAssessmentId}
                  onChange={(e) => setSelectedAssessmentId(e.target.value)}
                  className="w-full bg-plum-950/90 border border-violet-lavender/25 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-violet-brand"
                >
                  {assessments.map(asm => (
                    <option key={asm.id} value={asm.id}>
                      {asm.name} — {asm.subject_name} ({asm.class_name} • Max: {asm.max_marks} marks)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">CSV Records (Paste or Edit)</label>
                <button
                  type="button"
                  onClick={loadFormatTemplate}
                  className="text-xs font-semibold text-violet-lavender hover:text-white flex items-center gap-1 underline transition-colors"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Insert CSV Format Template</span>
                </button>
              </div>

              <textarea
                rows={8}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="roll_number,marks_obtained,status,remarks"
                className="w-full bg-plum-950/90 border border-violet-lavender/25 rounded-xl py-3 px-3.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-violet-brand resize-none leading-relaxed"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Rule: Missing or absent marks are safely preserved as non-zero values.
                </span>
                <button
                  type="button"
                  onClick={handleParseAndPreview}
                  disabled={loading}
                  className="liquid-btn px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-violet-pill"
                >
                  <span>{loading ? 'Validating...' : 'Proceed to Validation Preview'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && previewData && (
            <div className="space-y-4 animate-fadeIn">
              {/* Validation Summary Bar */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-plum-950/80 border border-violet-lavender/15">
                  <span className="text-xs text-slate-400 block">Total Rows Analyzed</span>
                  <strong className="text-lg font-mono text-white">{previewData.total_rows}</strong>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                  <span className="text-xs text-emerald-400 block">Valid Rows</span>
                  <strong className="text-lg font-mono text-emerald-300">{previewData.valid_count}</strong>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25">
                  <span className="text-xs text-rose-400 block">Invalid / Blocked Rows</span>
                  <strong className="text-lg font-mono text-rose-300">{previewData.invalid_count}</strong>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-violet-lavender/20 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-plum-950 text-slate-400 text-[10px] uppercase font-semibold border-b border-violet-lavender/15">
                    <tr>
                      <th className="py-2 px-3">Roll</th>
                      <th className="py-2 px-3">Student Name</th>
                      <th className="py-2 px-3 text-center">Marks</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3">Validation Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-lavender/10 bg-plum-950/60 font-mono">
                    {previewData.preview_rows.map((r: any) => (
                      <tr key={r.row_index} className={r.is_valid ? 'hover:bg-plum-900/50' : 'bg-rose-500/5'}>
                        <td className="py-2 px-3 font-semibold text-white">{r.roll_number}</td>
                        <td className="py-2 px-3 font-sans">{r.student_name}</td>
                        <td className="py-2 px-3 text-center">
                          {r.marks_obtained !== null ? `${r.marks_obtained}` : <span className="text-slate-500">NULL</span>}
                        </td>
                        <td className="py-2 px-3 text-center font-sans">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-plum-800 text-slate-300">
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans">
                          {r.is_valid ? (
                            <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                            </span>
                          ) : (
                            <span className="text-rose-400 text-[11px]">
                              {r.errors.join('; ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-violet-lavender/15">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Back to Edit CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={loading || previewData.valid_count === 0}
                  className="liquid-btn px-6 py-2.5 rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 shadow-violet-pill disabled:opacity-40"
                >
                  <Check className="w-4 h-4" />
                  <span>{loading ? 'Committing...' : `Commit Valid ${previewData.valid_count} Records`}</span>
                </button>
              </div>
            </div>
          )}

          {step === 'confirmed' && commitResult && (
            <div className="text-center py-6 space-y-4 animate-fadeIn">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-white tracking-tight">Batch Import Committed Successfully!</h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                {commitResult.message} Academic statistics, longitudinal progression charts, and explainable AI insights have been recalculated.
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="liquid-btn px-6 py-2.5 rounded-xl text-xs font-bold"
                >
                  Close & View Updated Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
