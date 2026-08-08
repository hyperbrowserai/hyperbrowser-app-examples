const BASE_URL = 'https://humanpages.ai';

interface HumanSearchResult {
  id: string;
  name: string;
  skills: string[];
  rating: number;
  available: boolean;
}

interface JobCreateResponse {
  id: string;
  status: string;
  humanId: string;
  title: string;
}

interface JobStatusResponse {
  id: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  result?: string;
  humanId: string;
  title: string;
}

interface JobMessage {
  id: string;
  content: string;
  sender: 'agent' | 'human';
  createdAt: string;
}

function headers(apiKey: string) {
  return {
    'Content-Type': 'application/json',
    'X-Agent-Key': apiKey,
  };
}

/**
 * Search for available humans with web task skills.
 */
export async function searchHumans(apiKey: string): Promise<HumanSearchResult[]> {
  const res = await fetch(
    `${BASE_URL}/api/humans/search?skill=web+task&available=true`,
    { headers: headers(apiKey) }
  );
  if (!res.ok) {
    throw new Error(`Human Pages search failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.humans || data || [];
}

/**
 * Create a job offer for a human to complete a web task.
 */
export async function createJob(
  apiKey: string,
  params: {
    humanId: string;
    title: string;
    description: string;
    priceUsdc: number;
    deadlineHours: number;
  }
): Promise<JobCreateResponse> {
  const res = await fetch(`${BASE_URL}/api/jobs`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`Human Pages job creation failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Check the status of an existing job.
 */
export async function getJobStatus(
  apiKey: string,
  jobId: string
): Promise<JobStatusResponse> {
  const res = await fetch(`${BASE_URL}/api/jobs/${jobId}`, {
    headers: headers(apiKey),
  });
  if (!res.ok) {
    throw new Error(`Human Pages job status failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Get messages for a job (communication between agent and human).
 */
export async function getJobMessages(
  apiKey: string,
  jobId: string
): Promise<JobMessage[]> {
  const res = await fetch(`${BASE_URL}/api/jobs/${jobId}/messages`, {
    headers: headers(apiKey),
  });
  if (!res.ok) {
    throw new Error(`Human Pages messages failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.messages || data || [];
}
