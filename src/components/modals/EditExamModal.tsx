import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import type { Exam, Priority } from '../../types';

interface EditExamModalProps {
  exam: Exam | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditExamModal: React.FC<EditExamModalProps> = ({ exam, isOpen, onClose }) => {
  const { updateExam, subjects } = usePlanner();

  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [priority, setPriority] = useState<Priority>('HIGH');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (exam) {
      setName(exam.name);
      setSubjectId(exam.subjectId);
      setDate(exam.date);
      setTime(exam.time);
      setDurationMinutes(exam.durationMinutes);
      setPriority(exam.priority);
      setNotes(exam.notes || '');
    }
  }, [exam]);

  if (!isOpen || !exam) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const selectedSubject = subjects.find(s => s.id === subjectId);
    updateExam(exam.id, {
      name: name.trim(),
      subjectId,
      subjectName: selectedSubject?.name || name.trim(),
      date,
      time,
      durationMinutes: Number(durationMinutes),
      priority,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] border border-[var(--border)] max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
              [ EXAM MODIFICATION ]
            </div>
            <h2 className="font-display text-xl text-[var(--foreground)] tracking-tight uppercase mt-0.5">
              EDIT EXAMINATION
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
            <label className="block text-[var(--muted-foreground)] uppercase text-[10px] mb-1">
              Examination Title
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="editorial-input text-xs"
            />
          </div>

          <div>
            <label className="block text-[var(--muted-foreground)] uppercase text-[10px] mb-1">
              Associated Course
            </label>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[var(--muted-foreground)] uppercase text-[10px] mb-1">
                Date (YYYY-MM-DD)
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="editorial-input text-xs"
              />
            </div>

            <div>
              <label className="block text-[var(--muted-foreground)] uppercase text-[10px] mb-1">
                Start Time
              </label>
              <input
                type="text"
                required
                value={time}
                onChange={e => setTime(e.target.value)}
                className="editorial-input text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[var(--muted-foreground)] uppercase text-[10px] mb-1">
                Duration (Minutes)
              </label>
              <input
                type="number"
                min="30"
                step="15"
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="editorial-input text-xs"
              />
            </div>

            <div>
              <label className="block text-[var(--muted-foreground)] uppercase text-[10px] mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="editorial-input text-xs"
              >
                <option value="HIGH">HIGH PRIORITY</option>
                <option value="MEDIUM">MEDIUM PRIORITY</option>
                <option value="LOW">LOW PRIORITY</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[var(--muted-foreground)] uppercase text-[10px] mb-1">
              Examination Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="editorial-input text-xs resize-none"
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
              className="btn-primary text-xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
