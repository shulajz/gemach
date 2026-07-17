const Input = ({
  label,
  id,
  error,
  type = 'text',
  value,
  onChange,
  required,
  placeholder,
  className = '',
  ariaLabel,
  ...rest
}) => (
  <div className="w-full">
    {label && (
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
    )}
    <input
      id={id}
      type={type}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      aria-label={ariaLabel || label}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
      className={`w-full rounded-xl border-2 bg-white px-4 py-3 text-base text-gray-900 transition-colors placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-0 ${
        error ? 'border-red-400' : 'border-gray-300 hover:border-teal-300'
      } ${className}`}
      {...rest}
    />
    {error && (
      <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-red-500" role="alert">
        {error}
      </p>
    )}
  </div>
);

export default Input;
