import { useId, type ComponentProps, type ReactNode } from 'react';

// Field primitive (Round 9 WP6a). Look: .mf-field in design-tokens/components.css.
//
//   kind  input     single line, 48px (size="lg": 56px, waitlist)
//         textarea  multi line
//         composer  two-line textarea + actions row inside one ink-glass box
//                   (ink contexts only; `actions` takes the send Button)
//
// The label is always present (`hideLabel` makes it sr-only). aria-invalid,
// aria-describedby and the ids are wired here. The error message carries an
// icon so invalid is never colour alone.

type Base = {
  label: ReactNode;
  hideLabel?: boolean;
  hint?: ReactNode;
  /** A message turns the field invalid. */
  error?: ReactNode;
  size?: 'md' | 'lg';
  className?: string;
};

type InputField = Base & { kind?: 'input' } & Omit<ComponentProps<'input'>, keyof Base | 'size'>;
type TextareaField = Base & { kind: 'textarea' } & Omit<ComponentProps<'textarea'>, keyof Base>;
type ComposerField = Base & {
  kind: 'composer';
  /** Row 2 of the composer, right aligned: attach, mic, the send Button. */
  actions?: ReactNode;
} & Omit<ComponentProps<'textarea'>, keyof Base | 'rows'>;

export type FieldProps = InputField | TextareaField | ComposerField;

function ErrorIcon() {
  return (
    <svg className="mf-field__error-icon" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path d="M7 1 13 12.5H1Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" />
      <path d="M7 5.5v3.2M7 10v1.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function Field(props: FieldProps) {
  const autoId = useId();
  const { label, hideLabel, hint, error, size = 'md', className } = props;
  const id = props.id ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined;
  const invalid = error ? true : props['aria-invalid'];

  const labelEl = (
    <label htmlFor={id} className={hideLabel ? 'sr-only' : 'mf-field__label t-label'}>
      {label}
    </label>
  );

  let control: ReactNode;
  if (props.kind === 'composer') {
    const { actions, ...native } = stripBase(props);
    control = (
      <div className="mf-field__composer">
        <textarea
          rows={2}
          {...native}
          id={id}
          className="mf-field__bare"
          data-ring="custom"
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
        {actions ? <div className="mf-field__actions">{actions}</div> : null}
      </div>
    );
  } else if (props.kind === 'textarea') {
    const native = stripBase(props);
    control = (
      <textarea
        {...native}
        id={id}
        className="mf-field__input"
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
    );
  } else {
    const native = stripBase(props);
    control = (
      <input
        {...native}
        id={id}
        className="mf-field__input"
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
    );
  }

  return (
    <div className={['mf-field', className].filter(Boolean).join(' ')} data-kind={props.kind ?? 'input'} data-size={size}>
      {labelEl}
      {control}
      {hint ? (
        <p id={hintId} className="mf-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mf-field__error">
          <ErrorIcon />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

// Remove the wrapper-level props so only native attributes reach the element.
function stripBase<T extends Base & { kind?: string }>(props: T) {
  const {
    label: _label,
    hideLabel: _hideLabel,
    hint: _hint,
    error: _error,
    size: _size,
    className: _className,
    kind: _kind,
    ...native
  } = props;
  void [_label, _hideLabel, _hint, _error, _size, _className, _kind];
  return native;
}
