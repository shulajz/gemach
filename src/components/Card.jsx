const Card = ({ children, className = '', hover = false, ...rest }) => (
  <div
    className={`rounded-2xl border-2 border-gray-200/80 bg-white p-4 shadow-lg sm:p-6 md:p-8 ${
      hover ? 'transition-shadow duration-200 hover:shadow-xl' : ''
    } ${className}`}
    {...rest}
  >
    {children}
  </div>
);

export default Card;
