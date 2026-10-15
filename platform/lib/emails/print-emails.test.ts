// The print-prep emails to artists: plain words, the link to the proof page,
// the staff note escaped, and never a Pantone code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { printReapprovalEmail, printSentBackEmail } from '@/lib/emails';

const DESIGN = '0b7f3c1e-2d4a-4c55-9e1a-6f0d2b8c9a11';

test('sent back: the note, escaped, and a link to the proof page', () => {
  const email = printSentBackEmail({ designId: DESIGN, designName: 'Underwriter', note: 'Thicken the <thin> lines & send it again' });
  assert.equal(email.subject, 'A change is needed on Underwriter');
  assert.match(email.html, /Thicken the &lt;thin&gt; lines &amp; send it again/);
  assert.doesNotMatch(email.html, /<thin>/);
  assert.match(email.html, new RegExp(`/studio/approve/${DESIGN}`));
  assert.doesNotMatch(email.html + email.text, /pantone/i);
});

test('re-approval: asks the artist to look again, with the same link', () => {
  const email = printReapprovalEmail({ designId: DESIGN, designName: 'Underwriter' });
  assert.equal(email.subject, 'Please approve Underwriter again');
  assert.match(email.text, /approve it again/i);
  assert.match(email.html, new RegExp(`/studio/approve/${DESIGN}`));
  assert.doesNotMatch(email.html + email.text, /pantone/i);
});

test('without a name or a design the emails still read, and link to the Studio', () => {
  const sent = printSentBackEmail({});
  assert.equal(sent.subject, 'A change is needed on your design');
  assert.match(sent.html, /\/studio"/);
  assert.equal(printReapprovalEmail({}).subject, 'Please approve your design again');
});
