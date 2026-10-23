import { ChevronDown, CircleAlert, Eye, EyeOff } from 'lucide-react';
import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  aside?: ReactNode;
  children: (describedBy: string | undefined) => ReactNode;
};

export function Field({ id, label, error, hint, aside, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm font-semibold text-navy-800">
          {label}
        </label>
        {aside}
      </div>
      {children(describedBy)}
      {error ? (
        <p id={errorId} className="mt-2 flex items-center gap-1.5 text-sm font-medium text-red-600">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="mt-2 text-sm text-navy-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export const controlClass = (invalid: boolean) =>
  `h-12 w-full rounded-xl border bg-white px-4 text-[0.9375rem] text-navy-900 transition placeholder:text-navy-300 focus:ring-4 focus-visible:outline-none ${
    invalid
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
      : 'border-navy-200 hover:border-navy-300 focus:border-gold-500 focus:ring-gold-400/25'
  }`;

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'children'> & {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  aside?: ReactNode;
};

export function TextField({ id, label, error, hint, aside, className = '', ...input }: InputProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint} aside={aside}>
      {(describedBy) => (
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`${controlClass(Boolean(error))} ${className}`}
          {...input}
        />
      )}
    </Field>
  );
}

export function PhoneField({ id, label, error, hint, aside, ...input }: InputProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint} aside={aside}>
      {(describedBy) => (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-2 left-0 flex items-center border-r border-navy-100 pr-3 pl-4 text-[0.9375rem] font-semibold text-navy-600">
            +237
          </span>
          <input
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="6 XX XX XX XX"
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={`${controlClass(Boolean(error))} pl-[5.25rem] tracking-wide`}
            {...input}
          />
        </div>
      )}
    </Field>
  );
}

export function PasswordField({ id, label, error, hint, aside, ...input }: InputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Field id={id} label={label} error={error} hint={hint} aside={aside}>
      {(describedBy) => (
        <div className="relative">
          <input
            id={id}
            type={visible ? 'text' : 'password'}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={`${controlClass(Boolean(error))} pr-12`}
            {...input}
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-pressed={visible}
            aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            className="absolute inset-y-1 right-1 grid w-10 place-items-center rounded-lg text-navy-400 transition hover:bg-navy-50 hover:text-navy-700"
          >
            {visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
          </button>
        </div>
      )}
    </Field>
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  id: string;
  label: string;
  error?: string;
  options: readonly string[];
  placeholder: string;
};

export function SelectField({ id, label, error, options, placeholder, ...select }: SelectProps) {
  return (
    <Field id={id} label={label} error={error}>
      {(describedBy) => (
        <div className="relative">
          <select
            id={id}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={`${controlClass(Boolean(error))} appearance-none pr-11 invalid:text-navy-300`}
            {...select}
          >
            <option value="" disabled>
              {placeholder}
            </option>
            {options.map((option) => (
              <option key={option} value={option} className="text-navy-900">
                {option}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-navy-400"
            aria-hidden="true"
          />
        </div>
      )}
    </Field>
  );
}

export function FormAlert({ tone = 'error', children }: { tone?: 'error' | 'info'; children: ReactNode }) {
  return (
    <div
      role="alert"
      className={`flex gap-3 rounded-xl border p-4 text-sm leading-relaxed ${
        tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-gold-200 bg-gold-50 text-navy-800'
      }`}
    >
      <CircleAlert
        className={`mt-0.5 size-4 shrink-0 ${tone === 'error' ? 'text-red-500' : 'text-gold-600'}`}
        aria-hidden="true"
      />
      <div>{children}</div>
    </div>
  );
}
