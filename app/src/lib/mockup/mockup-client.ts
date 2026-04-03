import type {
  MockupBatchRequest,
  MockupBatchResponse,
  MockupRequest,
  MockupResponse,
  TemplateInfo,
  TemplatesResponse,
} from './types';

const MOCKUP_SERVICE_URL = process.env.MOCKUP_SERVICE_URL || 'http://localhost:8000';

export class MockupClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || MOCKUP_SERVICE_URL;
  }

  async generateMockup(request: MockupRequest): Promise<MockupResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/mockups/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(`Mockup generation failed: ${error.detail || response.statusText}`);
    }

    return response.json();
  }

  async generateBatch(request: MockupBatchRequest): Promise<MockupBatchResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/mockups/generate-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designs: request.designs }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(`Batch generation failed: ${error.detail || response.statusText}`);
    }

    return response.json();
  }

  async getTemplates(): Promise<TemplatesResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/mockups/templates`);

    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.statusText}`);
    }

    return response.json();
  }

  async getTemplate(sku: string): Promise<TemplateInfo> {
    const response = await fetch(`${this.baseUrl}/api/v1/mockups/templates/${sku}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.statusText}`);
    }

    return response.json();
  }
}

export const mockupClient = new MockupClient();
