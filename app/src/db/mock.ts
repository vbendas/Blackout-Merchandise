/**
 * Mock database for development/testing
 * Use this when DATABASE_URL is not configured or for quick testing
 */

// In-memory storage for mock data
const mockStorage = {
  waitlist: [] as Array<{
    id: string;
    email: string;
    name: string;
    socialLink?: string | null;
    followerRange?: string | null;
    interviewResponses?: Record<string, string>;
    source: string;
    position: number;
    status: string;
    timestamp: Date;
    notified: boolean;
  }>,
};

// Generate UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Mock waitlist schema
const waitlist = {
  email: 'email',
};

// Mock eq function
const eq = (field: string, value: string) => `eq(${field}, "${value}")`;

// Mock database operations
export const mockDb = {
  // Waitlist operations
  waitlist: {
    // Select with where clause
    select: () => ({
      from: (_table: any) => ({
        where: (condition: any) => {
          // Parse the condition to extract email
          const emailMatch = condition.toString().match(/eq\(email,\s*"([^"]+)"\)/);
          if (emailMatch) {
            const email = emailMatch[1];
            const results = mockStorage.waitlist.filter((w) => w.email === email);
            return Promise.resolve(results);
          }
          return Promise.resolve([]);
        },
      }),
      // Count operation
      count: () => ({
        from: (_table: any) => {
          return Promise.resolve([{ count: mockStorage.waitlist.length }]);
        },
      }),
    }),

    // Insert operation
    insert: (_data: any) => ({
      values: async (values: any) => {
        const newEntry = {
          id: generateUUID(),
          ...values,
          timestamp: new Date(),
        };
        mockStorage.waitlist.push(newEntry);

        // Return with returning
        return {
          returning: async () => [newEntry],
        };
      },
    }),
  },

  // Clear all data (for testing)
  clear: () => {
    mockStorage.waitlist = [];
  },

  // Get all waitlist entries (for testing)
  getAllWaitlist: () => {
    return mockStorage.waitlist;
  },
};

// Export for use in API
export { waitlist, eq };
