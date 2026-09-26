/** Violet tile: the three rivers meeting at the Point, with an eye above them. */
export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="vp-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#vp-logo)" />
      <path d="M5 21c4-1 7-3 11-3s7 2 11 3" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M6 11.5c3.2 3.1 6.4 4.6 10 4.6s6.8-1.5 10-4.6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="12.3" r="2.6" fill="#fff" />
    </svg>
  );
}
