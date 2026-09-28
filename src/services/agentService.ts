/**
 * Client-side Agent Service
 * Sends messages + attachments to the server agent, then dispatches
 * the returned tool action to the PlannerContext.
 */

export interface AgentAttachment {
  name: string;
  mimeType: string;
  base64Data: string;
  previewUrl?: string;
  sizeBytes: number;
}

export interface AgentContextPayload {
  exams: Array<{ id: string; name: string; date: string; time: string; subjectName: string }>;
  subjects: Array<{ id: string; name: string }>;
  topics: Array<{ id: string; title: string; subjectName: string; completed: boolean; priority: string }>;
  tasks: Array<{ id: string; date: string; topicTitle: string; subjectName: string; status: string; startTime: string }>;
  missedTasks: Array<{ id: string; topicTitle: string; subjectName: string; date: string }>;
  overallProgressPercent: number;
  completedCount: number;
  totalTopicsCount: number;
  dailyHours: number;
  referenceDate: string;
  sessionDuration: number;
}

export interface AgentHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentServerResponse {
  message: string;
  tool?: { name: string; params: Record<string, unknown> };
  requiresConfirmation?: boolean;
  confirmationText?: string;
  extractedExams?: Array<{ name: string; date: string; time: string; subjectName?: string }>;
  extractedTopics?: Array<{ subjectName: string; title: string; priority?: string }>;
  fallback?: boolean;
}

export async function callAgent(
  message: string,
  context: AgentContextPayload,
  history: AgentHistoryMessage[],
  attachments?: AgentAttachment[]
): Promise<AgentServerResponse> {
  const payload = {
    message,
    context,
    history: history.slice(-12),
    attachments: attachments?.map(a => ({
      name: a.name,
      mimeType: a.mimeType,
      base64Data: a.base64Data,
    })),
  };

  const response = await fetch('/api/ai/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Agent API returned ${response.status}`);
  }

  return await response.json() as AgentServerResponse;
}

/**
 * Convert a File object to base64 for API transmission
 */
export async function fileToBase64(file: File): Promise<AgentAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(',')[1];
      resolve({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64Data,
        previewUrl: file.type.startsWith('image/') ? dataUrl : undefined,
        sizeBytes: file.size,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if file is acceptable for the agent
 */
export function isAcceptableFile(file: File): { ok: boolean; reason?: string } {
  const MAX_SIZE = 20 * 1024 * 1024; // 20MB
  const ACCEPTED_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'text/plain', 'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (file.size > MAX_SIZE) {
    return { ok: false, reason: `File too large (max 20MB). This file is ${formatFileSize(file.size)}.` };
  }

  if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|txt|csv|doc|docx|xls|xlsx|jpg|jpeg|png|webp)$/i)) {
    return { ok: false, reason: `File type not supported. Use PDF, image, or text files.` };
  }

  return { ok: true };
}
