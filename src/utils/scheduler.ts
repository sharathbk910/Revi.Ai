import type { Exam, Topic, Availability, Preferences, StudyTask, CapacityWarning, SessionType } from '../types';

/**
 * Returns date string YYYY-MM-DD offset by dayCount days
 */
export function addDays(dateStr: string, dayCount: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + dayCount);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(fromStr: string, toStr: string): number {
  const [y1, m1, d1] = fromStr.split('-').map(Number);
  const [y2, m2, d2] = toStr.split('-').map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);
  const diffTime = date2.getTime() - date1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatReadableDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).toUpperCase();
  } catch {
    return dateStr;
  }
}

// Standard time slots throughout the day based on user preferences
export function getAvailableTimeSlots(dailyHours: number, sessionDuration: number = 45): { start: string; end: string }[] {
  const count = Math.max(1, Math.min(8, Math.floor((dailyHours * 60) / sessionDuration)));
  const masterSlots = [
    { start: '09:00', end: '09:45' },
    { start: '10:00', end: '10:45' },
    { start: '11:15', end: '12:00' },
    { start: '14:00', end: '14:45' },
    { start: '15:15', end: '16:00' },
    { start: '17:00', end: '17:45' },
    { start: '19:00', end: '19:45' },
    { start: '20:15', end: '21:00' },
  ];
  return masterSlots.slice(0, count);
}

/**
 * SMART SCHEDULING ENGINE
 * 
 * Rules:
 * 1. Prioritize upcoming exams (earliest exam dates scheduled first).
 * 2. Never schedule a topic on or after its exam date.
 * 3. Spread large workloads and observe daily availability limit.
 * 4. Reserve dedicated REVISION sessions 24-48 hours prior to exam.
 * 5. Intelligently rebalance remaining topics without blindly shifting by 1 day.
 * 6. Capacity pressure detection.
 */
export function generateStudySchedule(
  exams: Exam[],
  topics: Topic[],
  availability: Availability,
  preferences: Preferences,
  referenceDate: string = '2026-09-28',
  existingTasks: StudyTask[] = []
): { tasks: StudyTask[]; capacityWarning: CapacityWarning | null } {
  // If no topics, return empty schedule
  if (topics.length === 0) {
    return { tasks: [], capacityWarning: null };
  }

  // 1. Map of Subject ID -> Earliest Exam Date
  const examMap = new Map<string, Exam>();
  const sortedExams = [...exams].sort((a, b) => a.date.localeCompare(b.date));

  for (const exam of sortedExams) {
    if (!examMap.has(exam.subjectId)) {
      examMap.set(exam.subjectId, exam);
    }
  }

  // 2. Identify Pending Topics
  const pendingTopics = topics.filter(t => !t.completed);

  // 3. Sort pending topics by urgency
  // Urgency = Earliest exam date first, then High priority, then natural order
  const prioritizedTopics = [...pendingTopics].sort((a, b) => {
    const examA = examMap.get(a.subjectId);
    const examB = examMap.get(b.subjectId);

    const dateA = examA?.date || '2099-12-31';
    const dateB = examB?.date || '2099-12-31';

    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }

    const priorityWeight: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const pDiff = (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
    if (pDiff !== 0) return pDiff;

    return a.id.localeCompare(b.id);
  });

  // 4. Capacity Analysis
  const sessionDur = preferences.sessionDuration || 45;
  const dailySlots = getAvailableTimeSlots(availability.dailyHours, sessionDur);
  const slotsPerDay = dailySlots.length;

  let capacityWarning: CapacityWarning | null = null;
  if (sortedExams.length > 0) {
    const earliestExam = sortedExams[0];
    const daysToEarliestExam = Math.max(1, daysBetween(referenceDate, earliestExam.date));
    
    // Check if upcoming subject has more topics than slots available before its exam
    let totalDeficit = 0;
    let overloadSubject = '';

    for (const exam of sortedExams) {
      const subTopics = pendingTopics.filter(t => t.subjectId === exam.subjectId);
      const daysUntil = Math.max(0, daysBetween(referenceDate, exam.date));
      const availableSlotsBeforeExam = daysUntil * slotsPerDay;

      if (subTopics.length > availableSlotsBeforeExam && availableSlotsBeforeExam > 0) {
        const deficitSlots = subTopics.length - availableSlotsBeforeExam;
        const deficitH = Math.round((deficitSlots * sessionDur) / 60 * 10) / 10;
        if (deficitH > totalDeficit) {
          totalDeficit = deficitH;
          overloadSubject = exam.subjectName;
        }
      }
    }

    if (totalDeficit > 0) {
      capacityWarning = {
        isOverloaded: true,
        deficitHours: totalDeficit,
        totalTopics: pendingTopics.length,
        totalAvailableHours: Math.round(daysToEarliestExam * availability.dailyHours * 10) / 10,
        earliestExamDays: daysToEarliestExam,
        message: `Schedule pressure detected for ${overloadSubject}: ${totalDeficit} hours deficit before exam.`,
      };
    }
  }

  // 5. Generate Daily Schedule Plan
  const tasks: StudyTask[] = [];
  const completedTaskMap = new Map<string, StudyTask>();

  // Preserve already completed tasks from existingTasks so user never loses checkmarks
  for (const task of existingTasks) {
    if (task.status === 'COMPLETED') {
      completedTaskMap.set(task.topicId, task);
      tasks.push(task);
    }
  }

  // Pre-schedule Revision Sessions for subjects on the day before their exam
  const revisionScheduledDays = new Set<string>();
  if (preferences.revisionSessions) {
    for (const exam of sortedExams) {
      const dayBefore = addDays(exam.date, -1);
      if (dayBefore >= referenceDate && !revisionScheduledDays.has(dayBefore + exam.subjectId)) {
        revisionScheduledDays.add(dayBefore + exam.subjectId);
        tasks.push({
          id: `task-rev-${exam.id}-${dayBefore}`,
          topicId: `rev-${exam.id}`,
          topicTitle: `FINAL REVISION: ${exam.subjectName} High-Yield Concepts`,
          subjectId: exam.subjectId,
          subjectName: exam.subjectName,
          date: dayBefore,
          startTime: dailySlots[0]?.start || '09:00',
          endTime: dailySlots[0]?.end || '09:45',
          type: 'REVISION',
          status: 'PENDING',
          priority: 'HIGH',
          durationMinutes: sessionDur,
        });
      }
    }
  }

  // Now distribute prioritized pending topics across available day slots
  let currentDayOffset = 0;
  let currentSlotIdx = 0;
  const maxDaysToPlan = 21; // Plan up to 3 weeks ahead

  for (const topic of prioritizedTopics) {
    if (completedTaskMap.has(topic.id)) continue;

    const exam = examMap.get(topic.subjectId);
    const examDate = exam?.date;

    let placed = false;
    let attempts = 0;

    while (!placed && attempts < maxDaysToPlan * slotsPerDay) {
      const targetDate = addDays(referenceDate, currentDayOffset);

      if (examDate && targetDate >= examDate) {
        break;
      }

      const tasksOnDate = tasks.filter(t => t.date === targetDate);
      if (tasksOnDate.length < slotsPerDay) {
        const slotInfo = dailySlots[tasksOnDate.length] || {
          start: '10:00',
          end: '10:45',
        };

        const sessionType: SessionType = 
          topic.priority === 'HIGH' ? 'DEEP_WORK' : 
          topic.title.toLowerCase().includes('practice') || topic.title.toLowerCase().includes('activity') 
            ? 'PRACTICE' 
            : 'LEARN';

        tasks.push({
          id: `task-${topic.id}-${targetDate}`,
          topicId: topic.id,
          topicTitle: topic.title,
          subjectId: topic.subjectId,
          subjectName: topic.subjectName,
          date: targetDate,
          startTime: slotInfo.start,
          endTime: slotInfo.end,
          type: sessionType,
          status: 'PENDING',
          priority: topic.priority,
          durationMinutes: topic.estimatedMinutes || sessionDur,
        });

        placed = true;
      }

      currentSlotIdx++;
      if (currentSlotIdx >= slotsPerDay) {
        currentSlotIdx = 0;
        currentDayOffset++;
      }
      attempts++;
    }

    if (!placed) {
      const emergencyDate = referenceDate;
      const tasksOnEmergency = tasks.filter(t => t.date === emergencyDate);
      const slotNum = tasksOnEmergency.length + 1;
      tasks.push({
        id: `task-emg-${topic.id}-${emergencyDate}`,
        topicId: topic.id,
        topicTitle: topic.title,
        subjectId: topic.subjectId,
        subjectName: topic.subjectName,
        date: emergencyDate,
        startTime: `18:${slotNum < 10 ? '0' + slotNum : slotNum}`,
        endTime: `18:${slotNum + 45}`,
        type: 'LEARN',
        status: 'PENDING',
        priority: 'HIGH',
        durationMinutes: sessionDur,
      });
    }
  }

  tasks.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  return { tasks, capacityWarning };
}

export function rescheduleMissedTasks(
  missedTasks: StudyTask[],
  allTasks: StudyTask[],
  exams: Exam[],
  availability: Availability,
  preferences: Preferences,
  referenceDate: string
): StudyTask[] {
  const sessionDur = preferences.sessionDuration || 45;
  const dailySlots = getAvailableTimeSlots(availability.dailyHours, sessionDur);
  const slotsPerDay = dailySlots.length;

  const updatedTasks = allTasks.filter(
    t => !missedTasks.some(m => m.id === t.id || (m.topicId && m.topicId === t.topicId))
  );

  let targetDayOffset = 1;

  for (const missed of missedTasks) {
    const exam = exams.find(e => e.subjectId === missed.subjectId);
    let rescheduled = false;

    for (let offset = targetDayOffset; offset <= 14; offset++) {
      const targetDate = addDays(referenceDate, offset);
      if (exam && targetDate >= exam.date) {
        break;
      }

      const tasksOnDate = updatedTasks.filter(t => t.date === targetDate);
      if (tasksOnDate.length < slotsPerDay) {
        const slot = dailySlots[tasksOnDate.length] || { start: '16:00', end: '16:45' };
        updatedTasks.push({
          ...missed,
          id: `task-resched-${missed.topicId}-${targetDate}`,
          date: targetDate,
          startTime: slot.start,
          endTime: slot.end,
          status: 'PENDING',
          rescheduledFrom: missed.date,
          priority: 'HIGH',
        });
        rescheduled = true;
        targetDayOffset = offset;
        break;
      }
    }

    if (!rescheduled) {
      const tomorrow = addDays(referenceDate, 1);
      updatedTasks.push({
        ...missed,
        id: `task-resched-force-${missed.topicId}-${tomorrow}`,
        date: tomorrow,
        startTime: '19:00',
        endTime: '19:45',
        status: 'PENDING',
        rescheduledFrom: missed.date,
        priority: 'HIGH',
      });
    }
  }

  updatedTasks.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  return updatedTasks;
}
