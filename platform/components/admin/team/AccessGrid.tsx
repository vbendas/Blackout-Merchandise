'use client';

import {
  AREA_LABELS,
  AREA_LEVEL_HELP,
  LEVEL_LABELS,
  PRESETS,
  PRESET_IDS,
  STAFF_AREAS,
  levelsFor,
  matchingPreset,
  presetPermissions,
  type Area,
  type Level,
  type PermissionMap,
} from '@/lib/auth/permissions';

function helpFor(area: Area, level: Level): string {
  switch (level) {
    case 'none':
      return 'Hidden from them.';
    case 'view':
      return 'They can see it.';
    case 'work':
      return `${AREA_LEVEL_HELP[area].work}.`;
    case 'manage':
      return area === 'money' ? `${AREA_LEVEL_HELP[area].manage}.` : `${AREA_LEVEL_HELP[area].work}, and ${AREA_LEVEL_HELP[area].manage.toLowerCase()}.`;
  }
}

/** The owner's grid: one row per area, a segmented control of its levels
 * (real radio buttons, 44px tall), and a line saying what the chosen level
 * allows. Team is the owner's alone, so it has no row. */
export function AccessGrid({
  value,
  onChange,
  idPrefix,
  disabled,
}: {
  value: PermissionMap;
  onChange: (next: PermissionMap) => void;
  idPrefix: string;
  disabled?: boolean;
}) {
  function choose(area: Area, level: Level) {
    const next: PermissionMap = { ...value };
    if (level === 'none') delete next[area];
    else next[area] = level;
    onChange(next);
  }

  return (
    <div className="tm-grid">
      {STAFF_AREAS.map((area) => {
        const current = value[area] ?? 'none';
        const labelId = `${idPrefix}-${area}-label`;
        const helpId = `${idPrefix}-${area}-help`;
        return (
          <div key={area} className="tm-row">
            <span id={labelId} className="tm-area">
              {AREA_LABELS[area]}
            </span>
            <div className="tm-seg" role="radiogroup" aria-labelledby={labelId} aria-describedby={helpId}>
              {levelsFor(area).map((level) => (
                <label key={level} className="tm-seg-opt">
                  <input
                    type="radio"
                    name={`${idPrefix}-${area}`}
                    value={level}
                    checked={current === level}
                    disabled={disabled}
                    onChange={() => choose(area, level)}
                  />
                  {LEVEL_LABELS[level]}
                </label>
              ))}
            </div>
            <p id={helpId} className="tm-help">
              {helpFor(area, current)}
            </p>
          </div>
        );
      })}
      <div className="tm-row">
        <span className="tm-area">{AREA_LABELS.team}</span>
        <p className="tm-help">Owner only. Owners can invite people and change anyone&rsquo;s access.</p>
      </div>
    </div>
  );
}

/** Starting points: a button per preset; the one the grid matches is pressed. */
export function PresetPicker({ value, onPick, disabled }: { value: PermissionMap; onPick: (next: PermissionMap) => void; disabled?: boolean }) {
  const matched = matchingPreset(value);
  return (
    <div className="tm-presets">
      <span className="tm-dim">Start from</span>
      {PRESET_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className="tm-btn"
          aria-pressed={matched === id}
          disabled={disabled}
          onClick={() => onPick(presetPermissions(id))}
        >
          {PRESETS[id].label}
        </button>
      ))}
    </div>
  );
}
