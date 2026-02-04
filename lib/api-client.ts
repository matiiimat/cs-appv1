/**
 * API Client for database operations
 * Replaces localStorage-based operations with PostgreSQL API calls
 */

export interface ApiMessage {
  id: string;
  organization_id: string;
  ticket_id: string;
  customer_name: string | null;
  customer_email: string | null;
  subject: string | null;
  message: string | null;
  category: string | null;
  ai_suggested_response: string | null;
  status: 'new' | 'to_send_queue' | 'rejected' | 'edited' | 'sent' | 'to_review_queue';
  agent_id: string | null;
  processed_at: string | null;
  response_time_ms: number | null;
  ai_reviewed: boolean;
  is_generating: boolean;
  edit_history: Array<{
    timestamp: string;
    originalResponse: string;
    editedResponse: string;
    reason: string;
  }>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ApiStats {
  totalMessages: number;
  pendingMessages: number;
  approvedMessages: number;
  rejectedMessages: number;
  editedMessages: number;
  sentMessages: number;
  reviewMessages: number;
  avgResponseTime: number;
  approvalRate: number;
  todayProcessed: number;
}

export interface ApiActivity {
  id: string;
  type: string;
  message: ApiMessage;
  timestamp: string;
  agentId?: string;
}

export interface CreateMessageInput {
  customer_name: string;
  customer_email: string;
  subject: string;
  message: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateMessageInput {
  category?: string;
  ai_suggested_response?: string;
  status?: ApiMessage['status'];
  agent_id?: string;
  ai_reviewed?: boolean;
  is_generating?: boolean;
  edit_history?: Array<{
    timestamp: string;
    originalResponse: string;
    editedResponse: string;
    reason: string;
  }>;
  metadata?: Record<string, unknown>;
}

class ApiClient {
  private baseUrl = '/api';

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Message operations
  async getMessages(options: {
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    messages: ApiMessage[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());

    const query = params.toString();
    return this.request(`/messages${query ? `?${query}` : ''}`);
  }

  async createMessage(messageData: CreateMessageInput): Promise<{ message: ApiMessage }> {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async updateMessage(id: string, updates: UpdateMessageInput): Promise<{ message: ApiMessage }> {
    return this.request('/messages', {
      method: 'PUT',
      body: JSON.stringify({ id, ...updates }),
    });
  }

  // Stats operations
  async getStats(options: { dateRange?: '7d' | '30d' | 'all' } = {}): Promise<{ stats: ApiStats }> {
    const params = new URLSearchParams();
    if (options.dateRange && options.dateRange !== 'all') {
      params.append('dateRange', options.dateRange);
    }
    const query = params.toString();
    return this.request(`/messages/stats${query ? `?${query}` : ''}`);
  }

  // Activity operations
  async getActivity(limit = 10): Promise<{ activities: ApiActivity[] }> {
    return this.request(`/messages/activity?limit=${limit}`);
  }
}

export const apiClient = new ApiClient();
