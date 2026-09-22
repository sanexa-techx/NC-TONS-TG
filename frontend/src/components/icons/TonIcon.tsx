export interface TokenIconProps {
  className?: string;
  size?: number;
}

export function TonIcon({ className = 'w-5 h-5', size }: TokenIconProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 align-middle ${className}`}
      style={style}
    >
      <circle cx="28" cy="28" r="28" fill="#0098EA" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M37.56 16H18.44C16.2 16 14.86 18.5 16.08 20.37L26.64 36.62C27.28 37.6 28.72 37.6 29.36 36.62L39.92 20.37C41.14 18.5 39.8 16 37.56 16ZM26.25 19H18.44C17.68 19 17.23 19.85 17.65 20.48L26.25 33.7V19ZM29.75 19V33.7L38.35 20.48C38.77 19.85 38.32 19 37.56 19H29.75Z"
        fill="white"
      />
    </svg>
  );
}

export default TonIcon;
