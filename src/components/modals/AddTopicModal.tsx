import React, { useState } from 'react';
import { X } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import type { Priority } from '../../types';

interface AddTopicModalProps {
  initialSubjectId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AddTopicModal: React.FC<AddTopicModalProps> = ({
  initialSubjectId,
  isOpen,
  onClose,
}) => {
  const { addTopic, subjects } = usePlanner();

  const [title, setTitle] = useState('');
  const [isCreatingNewCourse, setIsCreatingNewCourse] = useState(subjects.length === 0);
  const [newCourseName, setNewCourseName] = useState('');
  const [subjectId, setSubjectId] = useState(initialSubjectId || subjects[0]?.id || '');
  const [estimatedMinutes, setEstimatedMinutes] = useState(45);
  const [priority, setPriority] = useState<Priority>('MEDIUM');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let finalSubjectId = subjectId;
    let finalSubjectName = 'General Course';

    if (isCreatingNewCourse || subjects.length === 0 || !subjectId) {
      finalSubjectName = (newCourseName.trim() || 'General Course');
      finalSubjectId = `sub-${finalSubjectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    } else {
      const selectedSubject = subjects.find(s => s.id === subjectId);
      finalSubjectName = selectedSubject?.name || 'General Course';
      finalSubjectId = selectedSubject?.id || subjectId;
    }

    addTopic({
      title: title.trim(),
      subjectId: finalSubjectId,
      subjectName: finalSubjectName,
      estimatedMinutes: Number(estimatedMinutes),
      priority,
    });

    setTitle('');
    setNewCourseName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] border border-[var(--border)] max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
              [ SYLLABUS DIRECTORY ]
            </div>
            <h2 className="font-display text-xl text-[var(--foreground)] tracking-tight uppercase mt-0.5">
              ADD TOPIC
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
              Topic / Concept Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Asynchronous JavaScript & Promises"
              className="editorial-input text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[var(--muted-foreground)] uppercase text-[10px]">
                Academic Course
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
                placeholder="e.g. Computer Science, Mathematics"
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
                Estimated Duration
              </label>
              <select
                value={estimatedMinutes}
                onChange={e => setEstimatedMinutes(Number(e.target.value))}
                className="editorial-input text-xs"
              >
                <option value={30}>30 MINUTES</option>
                <option value={45}>45 MINUTES</option>
                <option value={60}>60 MINUTES</option>
                <option value={90}>90 MINUTES</option>
              </select>
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
              Save Topic
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
