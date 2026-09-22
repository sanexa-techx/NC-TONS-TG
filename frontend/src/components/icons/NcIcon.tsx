export interface TokenIconProps {
  className?: string;
  size?: number;
}

export function NcIcon({ className = 'w-5 h-5', size }: TokenIconProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 align-middle ${className}`}
      style={style}
    >
      <defs>
        <linearGradient id="ncGoldEdge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#854D0E" />
        </linearGradient>

        <radialGradient id="ncInnerSurface" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </radialGradient>

        <filter id="ncEngrave" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="0.5" floodColor="#78350F" floodOpacity="0.8" />
        </filter>
      </defs>

      {/* Outer Coin Edge */}
      <circle cx="32" cy="32" r="30" fill="url(#ncGoldEdge)" />

      {/* Inner Rim */}
      <circle cx="32" cy="32" r="27" fill="url(#ncInnerSurface)" stroke="#CA8A04" strokeWidth="1.5" />

      {/* Inner Security Ring */}
      <circle cx="32" cy="32" r="24" stroke="#FEF08A" strokeWidth="1" strokeDasharray="2.5 2.5" strokeOpacity="0.6" />

      {/* Micro Sparks */}
      <path d="M32 9L30.5 13H33.5L32 17" stroke="#FEF08A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <path d="M32 47L30.5 51H33.5L32 55" stroke="#78350F" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />

      {/* Stamped "NC" Typography */}
      <text
        x="32"
        y="38.5"
        textAnchor="middle"
        fontFamily="'Inter', 'Arial Black', sans-serif"
        fontWeight="900"
        fontSize="19"
        letterSpacing="0.5px"
        fill="#1C1917"
        filter="url(#ncEngrave)"
      >
        NC
      </text>

      {/* Light Reflection Curve */}
      <path d="M14 22C18 14 26 10 36 10" stroke="#FEF08A" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

export default NcIcon;
