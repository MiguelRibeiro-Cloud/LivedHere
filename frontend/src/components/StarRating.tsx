type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  label: string;
  readOnly?: boolean;
  minLabel?: string;
  maxLabel?: string;
};

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={filled ? 'h-5 w-5 text-accent' : 'h-5 w-5 text-slate-300'}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M10 15.27l-5.18 2.73 1-5.83L1.64 7.9l5.85-.85L10 1.75l2.51 5.3 5.85.85-4.18 4.27 1 5.83z"
      />
    </svg>
  );
}

export function StarRating({ value, onChange, label, readOnly: readOnlyProp, minLabel, maxLabel }: StarRatingProps) {
  const readOnly = Boolean(readOnlyProp) || !onChange;

  const helperText = !readOnly
    ? `1 = ${minLabel ?? 'very bad'}, 5 = ${maxLabel ?? 'very good'}`
    : null;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {helperText && <p className="text-xs text-ink/60">{helperText}</p>}
      </div>
      <div className="flex items-center gap-1" role={readOnly ? 'img' : 'radiogroup'} aria-label={label}>
        {Array.from({ length: 5 }).map((_, index) => {
          const starValue = index + 1;
          const filled = starValue <= value;
          if (readOnly) {
            return (
              <span key={starValue} className="p-1" aria-hidden="true">
                <Star filled={filled} />
              </span>
            );
          }
          return (
            <button
              key={starValue}
              type="button"
              className="rounded-md p-1 hover:bg-sand focus:outline-none focus:ring-2 focus:ring-primary/40"
              onClick={() => onChange(starValue)}
              role="radio"
              aria-checked={starValue === value}
              aria-label={`${label}: ${starValue} star${starValue === 1 ? '' : 's'}`}
            >
              <Star filled={filled} />
            </button>
          );
        })}
        {readOnly && <span className="ml-2 text-xs font-semibold text-ink/60">{value}/5</span>}
      </div>
    </div>
  );
}
