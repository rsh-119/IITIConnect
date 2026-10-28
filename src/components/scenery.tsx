// Drawn backdrop: soft hills and a winding road that fade into the page.
export function Scenery({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 520"
      preserveAspectRatio="xMidYMax slice"
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hill-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6d7da" />
          <stop offset="1" stopColor="#f3e3dc" />
        </linearGradient>
        <linearGradient id="hill-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d5ecd9" />
          <stop offset="1" stopColor="#f3f6f0" />
        </linearGradient>
        <linearGradient id="hill-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c3e5cc" />
          <stop offset="1" stopColor="#fbf7f4" />
        </linearGradient>
      </defs>
      <path
        d="M0 330c180-70 340-90 520-52s320 40 470-14 300-60 450-10v266H0Z"
        fill="url(#hill-far)"
      />
      <path
        d="M0 386c220-54 420-40 600 6s360 34 540-20 220-28 300-8v156H0Z"
        fill="url(#hill-mid)"
      />
      <path
        d="M560 520c40-60 160-74 300-96s260-58 330-108"
        fill="none"
        stroke="#fff7f1"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path
        d="M560 520c40-60 160-74 300-96s260-58 330-108"
        fill="none"
        stroke="#f2c7b5"
        strokeWidth="2"
        strokeDasharray="10 14"
        strokeLinecap="round"
      />
      <path
        d="M0 450c240-40 460-20 680 14s440 20 760-28v84H0Z"
        fill="url(#hill-near)"
      />
    </svg>
  );
}
