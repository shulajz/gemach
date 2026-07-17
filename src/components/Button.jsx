const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  className = '',
  ariaLabel,
  ...rest
}) => {
  const base =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none active:scale-[0.98]';
  const variants = {
    primary:
      'bg-teal-600 text-white shadow-lg hover:bg-teal-700 hover:shadow-xl focus-visible:ring-teal-500',
    secondary:
      'bg-white text-gray-800 border-2 border-gray-300 hover:border-teal-400 hover:bg-teal-50 focus-visible:ring-teal-400',
    danger:
      'bg-red-500 text-white shadow-md hover:bg-red-600 hover:shadow-lg focus-visible:ring-red-400',
    success:
      'bg-emerald-500 text-white shadow-md hover:bg-emerald-600 hover:shadow-lg focus-visible:ring-emerald-400',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.primary} ${className}`}
      aria-label={ariaLabel}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;
