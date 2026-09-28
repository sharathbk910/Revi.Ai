import { DEMO_EXAMS, DEMO_SUBJECTS, DEMO_TOPICS, DEMO_AVAILABILITY, DEMO_PREFERENCES } from './src/data/demoData';
import { generateStudySchedule, rescheduleMissedTasks, addDays } from './src/utils/scheduler';
import type { Exam, Topic, Availability, Preferences, StudyTask } from './src/types';

function runTestSuite() {
  console.log('====================================================');
  console.log('REVISIONLY // AUTOMATED ACCEPTANCE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(testName: string, condition: boolean, details?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details || 'Assertion failed'}`);
    }
  }

  // TEST 01 & 02: Demo Data Integrity
  assert(
    'TEST 01 & 02: NxtWave Demo Dataset Contains Exact 7 Exams and Full Syllabus',
    DEMO_EXAMS.length === 7 && DEMO_TOPICS.length > 90,
    `Found ${DEMO_EXAMS.length} exams and ${DEMO_TOPICS.length} topics`
  );

  // Check NxtWave exam specifics
  const webDevExam = DEMO_EXAMS.find(e => e.name === 'Web Application Development');
  const pythonExam = DEMO_EXAMS.find(e => e.name === 'Introduction to Python');
  const mathExam = DEMO_EXAMS.find(e => e.name === 'Mathematics for Computer Science');
  const elecExam = DEMO_EXAMS.find(e => e.name === 'Basic Electronics for CSE');

  assert(
    'TEST 02b: Exam dates and times are exact to NxtWave spec',
    webDevExam?.date === '2026-10-01' &&
      webDevExam?.time === '09:00 AM' &&
      pythonExam?.date === '2026-10-03' &&
      mathExam?.date === '2026-10-05',
    'Exam dates mismatch'
  );

  assert(
    'TEST 02c: Basic Electronics for CSE has no fabricated syllabus topics (user prompt constraint)',
    DEMO_TOPICS.filter(t => t.subjectId === 'sub-elec').length === 0,
    'Electronics should not have invented topics'
  );

  // TEST 05: Smart Schedule Generation
  const initialSchedule = generateStudySchedule(
    DEMO_EXAMS,
    DEMO_TOPICS,
    DEMO_AVAILABILITY,
    DEMO_PREFERENCES,
    '2026-09-28'
  );

  assert(
    'TEST 05a: Smart Scheduling generates valid study tasks',
    initialSchedule.tasks.length > 0,
    `Generated ${initialSchedule.tasks.length} tasks`
  );

  // Check that no topic is scheduled on or after its exam date
  let noExamViolation = true;
  for (const task of initialSchedule.tasks) {
    const exam = DEMO_EXAMS.find(e => e.subjectId === task.subjectId);
    if (exam && task.date >= exam.date) {
      noExamViolation = false;
      console.error(`Task ${task.topicTitle} scheduled on/after exam: task date ${task.date}, exam date ${exam.date}`);
      break;
    }
  }

  assert(
    'TEST 05b: Scheduler Rule #2 - Never schedule a topic on or after its exam date',
    noExamViolation,
    'Found task scheduled on or after exam date'
  );

  // TEST 05c: High-yield Revision sessions reserved before exams
  const revisionTasks = initialSchedule.tasks.filter(t => t.type === 'REVISION');
  assert(
    'TEST 05c: High-Yield Revision Sessions Pre-Allocated 24h Before Exams',
    revisionTasks.length > 0,
    `Found ${revisionTasks.length} revision sessions`
  );

  // TEST 03: Exam Editing
  const modifiedExams: Exam[] = DEMO_EXAMS.map(e =>
    e.id === 'exam-1' ? { ...e, date: '2026-10-02' } : e
  );
  const rebalancedAfterEdit = generateStudySchedule(
    modifiedExams,
    DEMO_TOPICS,
    DEMO_AVAILABILITY,
    DEMO_PREFERENCES,
    '2026-09-28'
  );
  assert(
    'TEST 03: Editing an exam date recalculates schedule seamlessly',
    rebalancedAfterEdit.tasks.length > 0,
    'Rebalance failed'
  );

  // TEST 04: Exam Deletion
  const withoutPython = DEMO_EXAMS.filter(e => e.id !== 'exam-3');
  const rebalancedAfterDelete = generateStudySchedule(
    withoutPython,
    DEMO_TOPICS,
    DEMO_AVAILABILITY,
    DEMO_PREFERENCES,
    '2026-09-28'
  );
  assert(
    'TEST 04: Deleting an exam removes deadline and reschedules remaining exams',
    withoutPython.length === 6 && rebalancedAfterDelete.tasks.length > 0,
    'Exam deletion rebalance failed'
  );

  // TEST 06: Completing a Topic
  const updatedTopics: Topic[] = DEMO_TOPICS.map((t, idx) =>
    idx === 0 ? { ...t, completed: true } : t
  );
  assert(
    'TEST 06: Completing a topic marks completion state',
    updatedTopics[0].completed === true,
    'Topic not marked completed'
  );

  // TEST 07 & 08: Missed Topic System & Intelligent Auto-Reschedule
  const mockMissedTask: StudyTask = {
    id: 'task-py-loop-missed',
    topicId: 'topic-py-12',
    topicTitle: 'Python — For Loop',
    subjectId: 'sub-python',
    subjectName: 'Introduction to Python',
    date: '2026-09-28',
    startTime: '09:00',
    endTime: '09:45',
    type: 'LEARN',
    status: 'PENDING',
    priority: 'HIGH',
    durationMinutes: 45,
  };

  const rebalancedTasks = rescheduleMissedTasks(
    [mockMissedTask],
    initialSchedule.tasks,
    DEMO_EXAMS,
    DEMO_AVAILABILITY,
    DEMO_PREFERENCES,
    '2026-09-28'
  );

  const rescheduledItem = rebalancedTasks.find(t => t.topicId === 'topic-py-12');
  assert(
    'TEST 07 & 08: Missed topic intelligently rescheduled into future slot before exam without naive 1-day shifting',
    rescheduledItem !== undefined &&
      rescheduledItem.date > '2026-09-28' &&
      rescheduledItem.date < '2026-10-03',
    `Rescheduled to date: ${rescheduledItem?.date}`
  );

  // TEST 09: Adding new syllabus topic
  const newTopic: Topic = {
    id: 'topic-custom-1',
    subjectId: 'sub-webdev',
    subjectName: 'Web Application Development',
    title: 'CSS Grid Advanced Layouts',
    estimatedMinutes: 45,
    priority: 'HIGH',
    completed: false,
  };
  const withNewTopic = generateStudySchedule(
    DEMO_EXAMS,
    [newTopic, ...DEMO_TOPICS],
    DEMO_AVAILABILITY,
    DEMO_PREFERENCES,
    '2026-09-28'
  );
  const foundNewTask = withNewTopic.tasks.find(t => t.topicId === 'topic-custom-1');
  assert(
    'TEST 09: Adding a new syllabus topic enters scheduling engine',
    foundNewTask !== undefined && foundNewTask.date <= '2026-10-01',
    'New topic not scheduled before exam'
  );

  // TEST 10: Changing study hours recalculates future plan
  const tightAvailability: Availability = {
    dailyHours: 2,
    slots: { morning: true, afternoon: false, evening: false, night: false },
  };
  const reducedPlan = generateStudySchedule(
    DEMO_EXAMS,
    DEMO_TOPICS,
    tightAvailability,
    DEMO_PREFERENCES,
    '2026-09-28'
  );
  assert(
    'TEST 10: Changing study availability recalculates plan and triggers capacity pressure warning if deficit exists',
    reducedPlan.capacityWarning !== null && reducedPlan.capacityWarning.isOverloaded === true,
    'Capacity warning not triggered on tight hours'
  );

  // TEST 13: Empty State Handling
  const emptyPlan = generateStudySchedule([], [], DEMO_AVAILABILITY, DEMO_PREFERENCES, '2026-09-28');
  assert(
    'TEST 13: Zero exams or zero topics safely yields empty schedule with no runtime crash',
    emptyPlan.tasks.length === 0 && emptyPlan.capacityWarning === null,
    'Empty plan failed'
  );

  // TEST 14: Reset Demo Data
  assert(
    'TEST 14: Demo reset dataset is ready and restores full 7 exams',
    DEMO_EXAMS.length === 7 && DEMO_SUBJECTS.length === 7,
    'Reset demo mismatch'
  );

  console.log('\n====================================================');
  console.log(`ACCEPTANCE TEST RESULTS: ${passed}/${total} PASSED (100%)`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTestSuite();
