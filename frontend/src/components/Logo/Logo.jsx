import React from 'react';

export default function Logo({ className = '', size = 'medium', color = '#1a1a2e' }) {
  const dimensions = {
    small: { height: 44, width: 'auto' },
    medium: { height: 64, width: 'auto' },
    large: { height: 100, width: 'auto' },
  };

  return (
    <div className={`logo-wrap ${className}`} style={{ height: dimensions[size].height }}>
      <svg
        viewBox="0 0 300 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height: '100%', width: 'auto' }}
      >
        <defs>
          {/* Refined Premium Gold Gradient */}
          <linearGradient id="gold-gradient-refined" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#AF8E3B" />
            <stop offset="50%" stopColor="#C5A059" />
            <stop offset="100%" stopColor="#8C6F2D" />
          </linearGradient>
        </defs>

        {/* Script 'A' */}
        <path
          d="M75 100 C 70 90, 85 40, 110 30 C 120 25, 130 35, 125 55 C 120 75, 100 95, 80 90"
          stroke="url(#gold-gradient-refined)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* Script 'S' */}
        <path
          d="M135 60 C 150 40, 180 40, 180 65 C 180 85, 140 85, 140 105 C 140 125, 185 125, 195 100"
          stroke="url(#gold-gradient-refined)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Needle through 'S' */}
        <path
          d="M165 25 L 155 120"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        <circle cx="165" cy="27" r="1.5" stroke={color} strokeWidth="1" fill="none" opacity="0.6" />

        {/* Text: AUTO STITCH - High Contrast Indigo */}
        <text
          x="150"
          y="150"
          textAnchor="middle"
          fill={color}
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '28px',
            fontWeight: '700',
            letterSpacing: '0.15em',
            textTransform: 'uppercase'
          }}
        >
          AUTO STITCH
        </text>
      </svg>
    </div>
  );
}
