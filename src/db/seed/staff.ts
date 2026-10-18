import { db } from '../index';
import { staff, agentStaffAssignments } from '../schema';
import { createStaff } from '../staff';
import { setPrimaryAssignment } from '../agentAssignments';

async function seedStaff() {
  console.log('🌱 Seeding staff and agent assignments...\n');

  // Check if staff already exists
  const existingStaff = await db.select().from(staff);
  if (existingStaff.length > 0) {
    console.log('⚠️  Staff already seeded. Skipping...');
    return;
  }

  // Create staff members matching Human-in-the-Loop personas
  const ricardo = await createStaff({
    name: 'Ricardo',
    email: 'ricardo@blackoutmerch.example',
    role: 'head_of_operations',
    department: 'Operations',
  });
  console.log(`✅ Created: Ricardo (Head of Operations) — ${ricardo.id}`);

  const ines = await createStaff({
    name: 'Inês',
    email: 'ines@blackoutmerch.example',
    role: 'head_of_design',
    department: 'Design',
  });
  console.log(`✅ Created: Inês (Head of Design) — ${ines.id}`);

  const marta = await createStaff({
    name: 'Marta',
    email: 'marta@blackoutmerch.example',
    role: 'head_of_customer_success',
    department: 'Support',
  });
  console.log(`✅ Created: Marta (Head of Customer Success) — ${marta.id}`);

  // Create primary assignments
  await setPrimaryAssignment('Leopoldo', ricardo.id);
  console.log('✅ Assigned: Leopoldo → Ricardo');

  await setPrimaryAssignment('Francisca', ines.id);
  console.log('✅ Assigned: Francisca → Inês');

  await setPrimaryAssignment('Antônia', marta.id);
  console.log('✅ Assigned: Antônia → Marta');

  console.log('\n🎉 Seed complete!');
}

seedStaff()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });