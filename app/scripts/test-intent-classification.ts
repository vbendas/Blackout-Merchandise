/**
 * Day 1 Deliverable Test: Intent Classification
 *
 * Verifies that the intent classifier correctly assigns agents
 * for 5 representative test messages.
 *
 * Run: cd app && bun scripts/test-intent-classification.ts
 */

import { classifyIntentSync } from '../src/lib/intent-classifier';
import type { AgentId } from '../src/types/chat';

interface TestCase {
  message: string;
  expectedAgent: AgentId;
  description: string;
}

const TEST_CASES: TestCase[] = [
  {
    message: 'How do I sign up for the waitlist and create my store?',
    expectedAgent: 'leopoldo',
    description: 'Onboarding intent → Leopoldo',
  },
  {
    message: 'I want to design a black metal t-shirt with skull graphics',
    expectedAgent: 'francisca',
    description: 'Design intent → Francisca',
  },
  {
    message: 'Where is my order? I need tracking information.',
    expectedAgent: 'antonia',
    description: 'Order tracking intent → Antonia',
  },
  {
    message: 'What are your pricing and profit margins for bulk orders?',
    expectedAgent: 'leopoldo',
    description: 'Billing intent → Leopoldo',
  },
  {
    message: 'Hello, what can you help me with?',
    expectedAgent: 'leopoldo',
    description: 'General/greeting intent → Leopoldo (default)',
  },
];

let passed = 0;
let failed = 0;

console.log('\n🧪 Intent Classification Test Suite\n');
console.log('='.repeat(60));

for (const test of TEST_CASES) {
  const result = classifyIntentSync(test.message);
  const ok = result.agent === test.expectedAgent;

  if (ok) {
    passed++;
    console.log(`\n✅ PASS — ${test.description}`);
  } else {
    failed++;
    console.log(`\n❌ FAIL — ${test.description}`);
    console.log(`   Expected: ${test.expectedAgent}`);
    console.log(`   Got:      ${result.agent}`);
  }

  console.log(`   Message:  "${test.message}"`);
  console.log(`   Intent:   ${result.intent} (confidence: ${result.confidence.toFixed(2)})`);
  console.log(`   Reason:   ${result.reason}`);
}

console.log('\n' + '='.repeat(60));
console.log(`\nResults: ${passed} passed, ${failed} failed / ${TEST_CASES.length} total`);

const accuracy = (passed / TEST_CASES.length) * 100;
console.log(`Accuracy: ${accuracy.toFixed(0)}%`);

if (accuracy >= 80) {
  console.log('\n🎉 Day 1 Deliverable MET — >80% accuracy achieved');
} else {
  console.log('\n⚠️  Day 1 Deliverable NOT MET — accuracy below 80%');
}

process.exit(failed > 0 ? 1 : 0);
