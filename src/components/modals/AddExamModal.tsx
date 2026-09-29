import React, { useState } from 'react';
import { X } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import type { Priority } from '../../types';

interface AddExamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddExamModal: React.FC<AddExamModalProps> = ({ isOpen, onClose }) => {
  const { addExam, subjects } = usePlanner();

  const [name, setName] = useState('');
  const [isCreatingNewCourse, setIsCreatingNewCourse] = useState(subjects.length === 0);
  const [newCourseName, setNewCourseName] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [date, setDate] = useState('2026-10-07');
  const [time, setTime] = useState('09:00 AM');
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [priority, setPriority] = useState<Priority>('HIGH');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalSubjectId = subjectId;
    let finalSubjectName = name.trim();

    if (isCreatingNewCourse || subjects.length === 0 || !subjectId) {
      finalSubjectName = newCourseName.trim() || name.trim();
      finalSubjectId = `sub-${finalSubjectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    } else {
      const selectedSubject = subjects.find(s => s.id === subjectId);
      finalSubjectName = selectedSubject?.name || name.trim();
      finalSubjectId = selectedSubject?.id || subjectId;
    }

    addExam({
      name: name.trim(),
      subjectId: finalSubjectId,
      subjectName: finalSubjectName,
      date,
      time,
      durationMinutes: Number(durationMinutes),
      priority,
      notes: notes.trim() || undefined,
    });

    setName('');
    setNewCourseName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] border border-[var(--border)] max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
              [ EXAM SCHEDULING ]
            </div>
            <h2 className="font-display text-xl text-[var(--foreground)] tracking-tight uppercase mt-0.5">
              ADD EXAMINATION
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
              placeholder="e.g. Distributed Cloud Computing"
              className="editorial-input text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[var(--muted-foreground)] uppercase text-[10px]">
                Associated Course
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
                placeholder="e.g. Cloud Computing Course"
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
                placeholder="09:00 AM"
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
              placeholder="Important modules, question weightage, instructions..."
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
              Save Exam
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
