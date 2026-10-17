// The sample job sheet as data (the Underwriter test design on the T-shirt: a screen run and the shop's
// DTG/DTF, in the same words as the sample PDF of PRINT_MOCK), for the sample views that need no database:
// PRINT_MOCK's getJobSheetView and the station's STATION_MOCK. Development only; never in production code paths.
// Pure: no database, no storage.
import { buildJobSheetView, type JobSheetView } from '@/lib/print/job-sheet-view';
import { MOCK_JOB_SHEET, MOCK_JOB_SHEET_PROOFS } from '@/lib/print/mock-views';

const MOCK_PROOF_COLOURS: Record<string, string> = { Black: 'black', 'French Navy': 'navy', White: 'white' };

/** The stand-in image of a sample proof (public/dev/print-mock): one per colour and technique. */
export function mockProofUrl(proof: { colourName: string; label: string }): string | null {
  const colour = MOCK_PROOF_COLOURS[proof.colourName];
  return colour ? `/dev/print-mock/proof-${proof.label.startsWith('Screen') ? 'screen' : 'dtg'}-${colour}.webp` : null;
}

/** The pack each sample screen set was "built" in. */
export const mockPackId = (setName: string) => `mock-pack-${setName.toLowerCase()}`;

/** The sample sheet as data, the sets with their sample pack ids and the proofs with their sample images. */
export function sampleJobSheetView(now: Date = new Date()): JobSheetView {
  return buildJobSheetView({
    ...MOCK_JOB_SHEET,
    generatedAt: now.toISOString(),
    screenSets: MOCK_JOB_SHEET.screenSets.map((set) => ({ ...set, packId: mockPackId(set.setName) })),
    proofs: MOCK_JOB_SHEET_PROOFS.map((proof) => ({ colourName: proof.colourName, label: proof.label, url: mockProofUrl(proof) })),
  });
}
