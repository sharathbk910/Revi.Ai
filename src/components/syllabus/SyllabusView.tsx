import React, { useState, useMemo } from 'react';
import { usePlanner } from '../../context/PlannerContext';
import { Plus, Upload, Trash2, Check, Circle, Search } from 'lucide-react';

interface SyllabusViewProps {
  onOpenAddTopic: (subjectId?: string) => void;
  onOpenBulkImport: (subjectId?: string) => void;
}

export const SyllabusView: React.FC<SyllabusViewProps> = ({
  onOpenAddTopic,
  onOpenBulkImport,
}) => {
  const { subjects, topics, toggleTopicCompleted, deleteTopic } = usePlanner();
  const [searchQuery, setSearchQuery] = useState('');

  const subjectGroups = useMemo(() => {
    const subjectMap = new Map<string, typeof subjects[0]>();
    for (const sub of subjects) {
      subjectMap.set(sub.id, sub);
    }
    // Also capture any subject from topics so topics are never invisible
    for (const topic of topics) {
      if (!subjectMap.has(topic.subjectId)) {
        subjectMap.set(topic.subjectId, {
          id: topic.subjectId,
          name: topic.subjectName || 'General Academic Course',
          color: '#00ff88',
          code: (topic.subjectName || 'SUB').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'SUB',
        });
      }
    }

    const allSubs = Array.from(subjectMap.values());

    return allSubs.map((sub, idx) => {
      const subTopics = topics.filter(
        t => t.subjectId === sub.id || (t.subjectName && t.subjectName.toLowerCase() === sub.name.toLowerCase())
      );
      const filtered = searchQuery.trim()
        ? subTopics.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : subTopics;

      const completed = subTopics.filter(t => t.completed).length;
      const total = subTopics.length;
      const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        number: idx < 9 ? `0${idx + 1}` : `${idx + 1}`,
        subject: sub,
        displayedTopics: filtered,
        completed,
        total,
        progressPercent,
      };
    });
  }, [subjects, topics, searchQuery]);

  return (
    <div className="space-y-12 animate-in fade-in duration-150">
      {/* Header Bar */}
      <section className="border-b border-[var(--border)] pb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2">
              [ MASTER SYLLABUS DIRECTORY ]
            </div>
            <h1 className="font-display text-4xl sm:text-6xl text-[var(--foreground)] tracking-tight-poster uppercase leading-none">
              SYLLABUS.
            </h1>
            <div className="font-mono text-xs sm:text-sm text-[var(--muted-foreground)] mt-3">
              {topics.length} total concepts across {subjectGroups.length} academic courses
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter concepts..."
                className="editorial-input text-xs pl-8 pr-3 w-44 sm:w-56"
              />
            </div>

            <button
              onClick={() => onOpenBulkImport()}
              className="btn-secondary text-xs"
              title="Bulk import topic list"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Import</span>
            </button>

            <button
              onClick={() => onOpenAddTopic()}
              className="btn-primary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Topic</span>
            </button>
          </div>
        </div>
      </section>

      {/* Structured Editorial Checklist Groups */}
      {subjectGroups.length === 0 ? (
        <div className="border border-[var(--border)] bg-[var(--card)] p-12 text-center space-y-4 font-mono">
          <div className="text-xs uppercase text-[var(--muted-foreground)] tracking-wider">
            SYLLABUS DIRECTORY EMPTY
          </div>
          <div className="font-display text-2xl text-[var(--foreground)] uppercase">
            NO SYLLABUS TOPICS RECORDED YET
          </div>
          <p className="text-xs text-[var(--muted-foreground)] max-w-md mx-auto">
            Add topics manually or bulk paste your syllabus topics below to immediately generate your revision schedule.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={() => onOpenAddTopic()} className="btn-primary text-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Topic</span>
            </button>
            <button onClick={() => onOpenBulkImport()} className="btn-secondary text-xs">
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Import</span>
            </button>
          </div>
        </div>
      ) : (
      <div className="space-y-12">
        {subjectGroups.map(group => {
          const { number, subject, displayedTopics, completed, total, progressPercent } = group;

          return (
            <div key={subject.id} className="border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-6">
              {/* Group Header */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[var(--border)] pb-4">
                <div>
                  <div className="font-mono text-xs text-[var(--accent)] font-bold tracking-widest uppercase">
                    {number} / {subject.code}
                  </div>
                  <h2 className="font-display text-xl sm:text-3xl text-[var(--foreground)] tracking-tight uppercase mt-1">
                    {subject.name}
                  </h2>
                </div>

                <div className="flex items-center gap-4 font-mono text-xs">
                  <div className="text-right">
                    <span className="font-bold text-[var(--foreground)]">{progressPercent}%</span>
                    <span className="text-[var(--muted-foreground)] uppercase ml-1">COMPLETE</span>
                  </div>
                  <span className="text-[var(--muted-foreground)]">•</span>
                  <div className="text-[var(--muted-foreground)]">
                    {completed} / {total} TOPICS
                  </div>
                  <button
                    onClick={() => onOpenAddTopic(subject.id)}
                    className="btn-ghost text-xs py-1 px-2"
                  >
                    + Add Topic
                  </button>
                </div>
              </div>

              {/* Topics Checklist Rows */}
              {total === 0 ? (
                <div className="py-8 text-center space-y-2 font-mono text-xs text-[var(--muted-foreground)]">
                  <div>No syllabus topics entered for this course yet.</div>
                  <button
                    onClick={() => onOpenBulkImport(subject.id)}
                    className="btn-secondary text-xs mt-2"
                  >
                    + Paste {subject.name} Topics
                  </button>
                </div>
              ) : displayedTopics.length > 0 ? (
                <div className="divide-y divide-[var(--border)]">
                  {displayedTopics.map(topic => (
                    <div
                      key={topic.id}
                      className="py-3 flex items-center justify-between gap-4 hover:bg-[var(--muted)]/20 px-2 transition-colors duration-150 group"
                    >
                      <button
                        onClick={() => toggleTopicCompleted(topic.id)}
                        className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer bg-none border-none p-0"
                      >
                        <span className="shrink-0">
                          {topic.completed ? (
                            <Check className="w-4 h-4 text-[var(--accent)] stroke-[3]" />
                          ) : (
                            <Circle className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors" />
                          )}
                        </span>
                        <span
                          className={`text-sm tracking-tight truncate ${
                            topic.completed
                              ? 'line-through text-[var(--muted-foreground)]'
                              : 'text-[var(--foreground)] font-medium'
                          }`}
                        >
                          {topic.title}
                        </span>
                      </button>

                      <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                        <span className="text-[10px] text-[var(--muted-foreground)] uppercase hidden sm:inline">
                          {topic.priority} PRIORITY
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)] hidden sm:inline">
                          {topic.estimatedMinutes} MIN
                        </span>
                        <button
                          onClick={() => deleteTopic(topic.id)}
                          className="opacity-0 group-hover:opacity-100 text-[var(--muted-foreground)] hover:text-[#FF3D00] p-1 transition-all"
                          title="Delete topic"
                          aria-label="Delete topic"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 font-mono text-xs text-[var(--muted-foreground)]">
                  No concepts match "{searchQuery}"
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};
