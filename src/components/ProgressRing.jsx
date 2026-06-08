import { useEffect, useRef } from 'react';

export default function ProgressRing({ value, max, size = 120, strokeWidth = 10, color = '#22c55e', label, sublabel }) {
  const circumference = 2 * Math.PI * ((size - strokeWidth) / 2);
  const percent = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - percent);
  const r = (size - strokeWidth) / 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        {label && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading font-bold text-gray-900" style={{ fontSize: size / 5 }}>{label}</span>
            {sublabel && <span className="text-gray-500 text-xs">{sublabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
