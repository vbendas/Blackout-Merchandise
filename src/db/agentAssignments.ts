import { db } from './index';
import { agentStaffAssignments, staff } from './schema';
import { eq, and } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

export type AgentStaffAssignment = InferSelectModel<typeof agentStaffAssignments>;

export async function createAssignment(data: {
  agentId: string;
  staffId: string;
  isPrimary?: boolean;
}): Promise<AgentStaffAssignment> {
  const [result] = await db
    .insert(agentStaffAssignments)
    .values({
      ...data,
      agentId: data.agentId as AgentStaffAssignment['agentId'],
      isPrimary: data.isPrimary ?? false,
      isActive: true,
    })
    .returning();
  return result;
}

export async function getPrimaryStaffForAgent(
  agentId: string
): Promise<(AgentStaffAssignment & { staff: typeof staff.$inferSelect }) | null> {
  const [result] = await db
    .select({
      assignment: agentStaffAssignments,
      staff: staff,
    })
    .from(agentStaffAssignments)
    .innerJoin(staff, eq(agentStaffAssignments.staffId, staff.id))
    .where(
      and(
        eq(agentStaffAssignments.agentId, agentId as AgentStaffAssignment['agentId']),
        eq(agentStaffAssignments.isPrimary, true),
        eq(agentStaffAssignments.isActive, true),
        eq(staff.isActive, true)
      )
    )
    .limit(1);

  if (!result) return null;

  return {
    ...result.assignment,
    staff: result.staff,
  };
}

export async function getAllAssignments(): Promise<
  (AgentStaffAssignment & { staff: typeof staff.$inferSelect })[]
> {
  const results = await db
    .select({
      assignment: agentStaffAssignments,
      staff: staff,
    })
    .from(agentStaffAssignments)
    .innerJoin(staff, eq(agentStaffAssignments.staffId, staff.id))
    .where(eq(agentStaffAssignments.isActive, true));

  return results.map((r) => ({
    ...r.assignment,
    staff: r.staff,
  }));
}

export async function setPrimaryAssignment(
  agentId: string,
  staffId: string
): Promise<AgentStaffAssignment> {
  // First, unset any existing primary for this agent
  await db
    .update(agentStaffAssignments)
    .set({ isPrimary: false })
    .where(
      and(
        eq(agentStaffAssignments.agentId, agentId as AgentStaffAssignment['agentId']),
        eq(agentStaffAssignments.isPrimary, true)
      )
    );

  // Check if assignment already exists
  const [existing] = await db
    .select()
    .from(agentStaffAssignments)
    .where(
      and(
        eq(agentStaffAssignments.agentId, agentId as AgentStaffAssignment['agentId']),
        eq(agentStaffAssignments.staffId, staffId)
      )
    )
    .limit(1);

  if (existing) {
    // Update existing to primary
    const [updated] = await db
      .update(agentStaffAssignments)
      .set({
        isPrimary: true,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(agentStaffAssignments.id, existing.id))
      .returning();
    return updated;
  }

  // Create new primary assignment
  const [result] = await db
    .insert(agentStaffAssignments)
    .values({
      agentId: agentId as AgentStaffAssignment['agentId'],
      staffId,
      isPrimary: true,
      isActive: true,
    })
    .returning();
  return result;
}

export async function deactivateAssignment(id: string): Promise<void> {
  await db
    .update(agentStaffAssignments)
    .set({
      isActive: false,
      isPrimary: false,
      updatedAt: new Date(),
    })
    .where(eq(agentStaffAssignments.id, id));
}

export async function deleteAssignment(id: string): Promise<void> {
  await db
    .delete(agentStaffAssignments)
    .where(eq(agentStaffAssignments.id, id));
}