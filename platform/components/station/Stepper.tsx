'use client';

import type { ProductionStage, StationJobSummary } from '@/lib/services/production-progress';
import { IconCheck } from './icons';
import { STAGE_LABEL, stepsFor } from './model';

/** Where the job is: Queued, Screens (screen print only), Printing, Curing, Folding. The step it is on is filled, the ones before it
 * are ticked; a tap on any other step moves the job there (the screen asks first when the move has to be forced). */
export function Stepper({ method, stage, canWork, onPick }: { method: StationJobSummary['method']; stage: ProductionStage; canWork: boolean; onPick: (stage: ProductionStage) => void }) {
  const steps = stepsFor(method, stage);
  const current = stage === 'shipped' ? steps.length : steps.indexOf(stage);
  return (
    <ol className="st-stepper" aria-label="Stage of the job">
      {steps.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={step}>
            <button
              type="button"
              className="st-stage"
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
              disabled={!canWork || state === 'current'}
              onClick={() => onPick(step)}
            >
              {state === 'done' ? <IconCheck width={20} height={20} /> : <span className="st-stage-n">{i + 1}</span>}
              <span>{STAGE_LABEL[step]}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
