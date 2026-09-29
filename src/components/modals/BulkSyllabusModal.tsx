import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';

interface BulkSyllabusModalProps {
  initialSubjectId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const BulkSyllabusModal: React.FC<BulkSyllabusModalProps> = ({
  initialSubjectId,
  isOpen,
  onClose,
}) => {
  const { bulkAddTopics, subjects } = usePlanner();

  const [isCreatingNewCourse, setIsCreatingNewCourse] = useState(subjects.length === 0);
  const [newCourseName, setNewCourseName] = useState('');
  const [subjectId, setSubjectId] = useState(initialSubjectId || subjects[0]?.id || '');
  const [rawText, setRawText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = rawText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) return;

    let finalSubId = subjectId;
    let fallbackName = 'General Course';

    if (isCreatingNewCourse || subjects.length === 0 || !subjectId) {
      fallbackName = newCourseName.trim() || 'General Course';
      finalSubId = `sub-${fallbackName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    } else {
      const selected = subjects.find(s => s.id === subjectId);
      fallbackName = selected?.name || 'General Course';
      finalSubId = selected?.id || subjectId;
    }

    bulkAddTopics(finalSubId, lines, fallbackName);
    setRawText('');
    setNewCourseName('');
    onClose();
  };

  const lineCount = rawText.split('\n').filter(l => l.trim().length > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] border border-[var(--border)] max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
              [ BATCH INGESTION ]
            </div>
            <h2 className="font-display text-xl text-[var(--foreground)] tracking-tight uppercase mt-0.5">
              BULK IMPORT SYLLABUS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1.5 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[var(--muted-foreground)] uppercase text-[10px]">
                Select Target Course
              </label>
              {subjects.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCreatingNewCourse(!isCreatingNewCourse)}
                  className="text-[10px] text-[var(--accent)] hover:underline"
                >
                  {isCreatingNewCourse ? 'Select existing' : '+ New Course'}
                </button>
              )}
            </div>

            {isCreatingNewCourse || subjects.length === 0 ? (
              <input
                type="text"
                required
                value={newCourseName}
                onChange={e => setNewCourseName(e.target.value)}
                placeholder="e.g. Operating Systems, Thermodynamics"
                className="editorial-input text-xs"
              />
            ) : (
              <select
                value={subjectId}
                onChange={e => setSubjectId(e.target.value)}
                className="editorial-input text-xs"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between text-[var(--muted-foreground)] uppercase text-[10px] mb-1">
              <span>Paste Topics (One per line)</span>
              <span>{lineCount} TOPICS DETECTED</span>
            </div>
            <textarea
              rows={8}
              required
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="Introduction to CSS&#10;CSS Box Model&#10;CSS Specificity &amp; Inheritance&#10;Flexbox Layouts&#10;Grid Layouts"
              className="editorial-input text-xs font-mono resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={lineCount === 0}
              className="btn-primary text-xs disabled:opacity-40"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import {lineCount} Topics</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
