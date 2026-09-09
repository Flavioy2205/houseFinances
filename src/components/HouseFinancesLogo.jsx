import React from 'react';

export const HouseFinancesLogo = ({ size = 28, color = '#10b981', arrowColor = '#38bdf8', showText = false, textStyle = {} }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 200 200" 
        style={{ display: 'block', overflow: 'visible' }}
      >
        <g fill="none" stroke={color} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round">
          {/* House Outline */}
          <path d="M 40 92 L 100 42 L 160 92 V 158 C 160 164 154 170 148 170 H 52 C 46 170 40 164 40 158 Z" />
          {/* Growth Arrow Line */}
          <path d="M 42 142 C 68 142 78 118 102 118 C 128 118 140 85 172 45" stroke={arrowColor} />
          {/* Arrowhead */}
          <path d="M 144 45 H 172 V 73" stroke={arrowColor} />
        </g>
        {/* Family Silhouette (Parent + Child) */}
        <circle cx="140" cy="126" r="6" fill="#f8fafc" />
        <path d="M 140 134 C 135 134 133 138 133 145 V 168 H 147 V 145 C 147 138 145 134 140 134 Z" fill="#f8fafc" />
        <circle cx="122" cy="138" r="4.5" fill="#f8fafc" />
        <path d="M 122 144 C 118 144 117 147 117 152 V 168 H 127 V 152 C 127 147 126 144 122 144 Z" fill="#f8fafc" />
      </svg>
      {showText && (
        <span style={{ 
          fontSize: '1.25rem', 
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: '#f9fafb',
          letterSpacing: '-0.02em',
          ...textStyle 
        }}>
          <strong style={{ fontWeight: 800 }}>house</strong>
          <span style={{ fontWeight: 400 }}>Finances</span>
        </span>
      )}
    </div>
  );
};
