import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock Cloudinary
vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload: vi.fn(),
    },
  },
}));

import { v2 as cloudinary } from 'cloudinary';

// Mock auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ userId: 'test-user-id' }),
}));

/**
 * Creates a minimal mock UploadApiResponse with required Cloudinary fields.
 * The route only uses secure_url, public_id, width, height.
 */
function mockUploadResult(overrides: Record<string, unknown> = {}) {
  return {
    secure_url: 'https://res.cloudinary.com/test/image/upload/v123/design.jpg',
    public_id: 'blackout-merchandise/studio/references/test-user-id/ref_123',
    width: 1920,
    height: 1080,
    ...overrides,
  } as Awaited<ReturnType<typeof cloudinary.uploader.upload>>;
}

describe('Design Reference Upload API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upload image successfully', async () => {
    const mockResult = mockUploadResult();

    vi.mocked(cloudinary.uploader.upload).mockResolvedValue(mockResult);

    // Create a mock File
    const mockFile = new File(['test image content'], 'design.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('image', mockFile);

    const request = new Request('http://localhost/api/upload/design-reference', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.url).toBe(mockResult.secure_url);
    expect(data.publicId).toBe(mockResult.public_id);
    expect(data.width).toBe(1920);
    expect(data.height).toBe(1080);
  });

  it('should return 401 when not authenticated', async () => {
    vi.mocked(require('@clerk/nextjs/server')).auth = () => Promise.resolve({ userId: null });

    const formData = new FormData();
    const request = new Request('http://localhost/api/upload/design-reference', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 when no image provided', async () => {
    const formData = new FormData();
    const request = new Request('http://localhost/api/upload/design-reference', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('No image provided');
  });

  it('should return 400 for non-image files', async () => {
    const mockFile = new File(['not an image'], 'document.pdf', { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('image', mockFile);

    const request = new Request('http://localhost/api/upload/design-reference', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Only image files are allowed');
  });

  it('should return 400 for files larger than 10MB', async () => {
    // Create a mock file that appears to be > 10MB
    const largeContent = new Uint8Array(11 * 1024 * 1024); // 11MB
    const mockFile = new File([largeContent], 'large-image.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('image', mockFile);

    const request = new Request('http://localhost/api/upload/design-reference', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Image must be less than 10MB');
  });

  it('should upload to correct Cloudinary folder', async () => {
    const mockResult = mockUploadResult();

    const mockUpload = vi.fn().mockResolvedValue(mockResult);
    vi.mocked(cloudinary.uploader.upload).mockImplementation(mockUpload);

    const mockFile = new File(['test'], 'design.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('image', mockFile);

    const request = new Request('http://localhost/api/upload/design-reference', {
      method: 'POST',
      body: formData,
    });

    await POST(request);

    expect(mockUpload).toHaveBeenCalled();
    const callArgs = mockUpload.mock.calls[0];
    expect(callArgs[1]).toMatchObject({
      folder: 'blackout-merchandise/studio/references/test-user-id',
    });
  });

  it('should preserve original dimensions', async () => {
    const mockResult = mockUploadResult({ width: 4000, height: 3000 });

    vi.mocked(cloudinary.uploader.upload).mockResolvedValue(mockResult);

    const mockFile = new File(['test'], 'design.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('image', mockFile);

    const request = new Request('http://localhost/api/upload/design-reference', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.width).toBe(4000);
    expect(data.height).toBe(3000);
  });
});
