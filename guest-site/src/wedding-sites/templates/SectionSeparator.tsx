import type { CSSProperties } from 'react';
import type { SeparatorStyle } from '../types';

interface SeparatorProps {
  style: SeparatorStyle;
  color: string;
}

export function SectionSeparator({ style, color }: SeparatorProps) {
  if (style === 'none') return null;

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '2rem 0',
    gap: '0.5rem',
  };

  const lineStyle: CSSProperties = {
    flex: 1,
    height: 1,
    background: `linear-gradient(90deg, transparent, ${color}66, transparent)`,
    maxWidth: 200,
  };

  switch (style) {
    case 'thin-line':
      return (
        <div style={{ ...containerStyle, margin: '1.5rem 0' }}>
          <div style={{ ...lineStyle, maxWidth: 400 }} />
        </div>
      );

    case 'diamond':
      return (
        <div style={containerStyle}>
          <div style={lineStyle} />
          <span style={{ color, fontSize: '0.9rem', flexShrink: 0 }}>◆</span>
          <div style={lineStyle} />
        </div>
      );

    case 'floral':
      return (
        <div style={containerStyle}>
          <div style={lineStyle} />
          <svg width="96" height="28" viewBox="0 0 96 28" style={{ flexShrink: 0 }}>
            {/* Central flower */}
            <circle cx="48" cy="14" r="4" fill={color} opacity="0.75"/>
            <circle cx="48" cy="7" r="2.5" fill={color} opacity="0.55"/>
            <circle cx="48" cy="21" r="2.5" fill={color} opacity="0.55"/>
            <circle cx="41" cy="14" r="2.5" fill={color} opacity="0.55"/>
            <circle cx="55" cy="14" r="2.5" fill={color} opacity="0.55"/>
            {/* Left cluster */}
            <circle cx="22" cy="14" r="2.5" fill={color} opacity="0.5"/>
            <circle cx="22" cy="9" r="1.8" fill={color} opacity="0.38"/>
            <circle cx="22" cy="19" r="1.8" fill={color} opacity="0.38"/>
            {/* Right cluster */}
            <circle cx="74" cy="14" r="2.5" fill={color} opacity="0.5"/>
            <circle cx="74" cy="9" r="1.8" fill={color} opacity="0.38"/>
            <circle cx="74" cy="19" r="1.8" fill={color} opacity="0.38"/>
            {/* Connector stems */}
            <line x1="5" y1="14" x2="18" y2="14" stroke={color} strokeWidth="0.6" opacity="0.35"/>
            <line x1="26" y1="14" x2="38" y2="14" stroke={color} strokeWidth="0.6" opacity="0.35"/>
            <line x1="58" y1="14" x2="70" y2="14" stroke={color} strokeWidth="0.6" opacity="0.35"/>
            <line x1="78" y1="14" x2="91" y2="14" stroke={color} strokeWidth="0.6" opacity="0.35"/>
          </svg>
          <div style={lineStyle} />
        </div>
      );

    case 'stars':
      return (
        <div style={containerStyle}>
          <div style={lineStyle} />
          <svg width="80" height="20" viewBox="0 0 80 20" style={{ flexShrink: 0 }}>
            {/* Three 6-pointed stars */}
            <polygon points="40,3 41.8,8.5 47.5,8.5 43,12 44.8,17.5 40,14.2 35.2,17.5 37,12 32.5,8.5 38.2,8.5" fill={color} opacity="0.75"/>
            <polygon points="14,4 15.3,8 19.5,8 16.2,10.5 17.5,14.5 14,12.2 10.5,14.5 11.8,10.5 8.5,8 12.7,8" fill={color} opacity="0.5"/>
            <polygon points="66,4 67.3,8 71.5,8 68.2,10.5 69.5,14.5 66,12.2 62.5,14.5 63.8,10.5 60.5,8 64.7,8" fill={color} opacity="0.5"/>
          </svg>
          <div style={lineStyle} />
        </div>
      );

    case 'arabesque':
      return (
        <div style={{ ...containerStyle, flexDirection: 'column', gap: '0.3rem' }}>
          <div style={{ ...lineStyle, maxWidth: 280, flex: 'none', width: '100%' }} />
          <svg width="60" height="28" viewBox="0 0 60 28" style={{ flexShrink: 0 }}>
            {/* Central arabesque ornament */}
            <path d="M30,4 C36,10 40,16 30,20 C20,16 24,10 30,4 Z" fill="none" stroke={color} strokeWidth="1" opacity="0.7"/>
            <path d="M30,8 C34,13 36,18 30,21 C24,18 26,13 30,8 Z" fill={color} opacity="0.3"/>
            <path d="M10,14 Q20,8 28,14 Q20,20 10,14 Z" fill={color} opacity="0.35"/>
            <path d="M50,14 Q40,8 32,14 Q40,20 50,14 Z" fill={color} opacity="0.35"/>
            <circle cx="30" cy="14" r="2" fill={color} opacity="0.7"/>
          </svg>
          <div style={{ ...lineStyle, maxWidth: 280, flex: 'none', width: '100%' }} />
        </div>
      );

    case 'wave':
      return (
        <div style={{ ...containerStyle, margin: '1.5rem 0' }}>
          <svg width="200" height="16" viewBox="0 0 200 16" style={{ color }}>
            <path
              d="M0,8 C25,0 50,16 75,8 C100,0 125,16 150,8 C175,0 200,16 200,8"
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              opacity="0.5"
            />
          </svg>
        </div>
      );

    case 'double-line':
      return (
        <div style={{ ...containerStyle, flexDirection: 'column', gap: '3px' }}>
          <div style={{ ...lineStyle, maxWidth: 300, flex: 'none', width: '100%', background: color, opacity: 0.4 }} />
          <div style={{ ...lineStyle, maxWidth: 200, flex: 'none', width: '100%', background: color, opacity: 0.2 }} />
        </div>
      );

    case 'dots-line':
      return (
        <div style={{ ...containerStyle, margin: '1.5rem 0' }}>
          <svg width="200" height="12" viewBox="0 0 200 12">
            {Array.from({ length: 11 }).map((_, i) => {
              const isCenter = i === 5;
              const cx = 10 + i * 18;
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy="6"
                  r={isCenter ? 3.5 : 2}
                  fill={color}
                  opacity={isCenter ? 0.8 : 0.4}
                />
              );
            })}
          </svg>
        </div>
      );

    case 'art-deco-sep':
      return (
        <div style={{ ...containerStyle, margin: '1.5rem 0' }}>
          <svg width="220" height="20" viewBox="0 0 220 20">
            <line x1="0" y1="10" x2="70" y2="10" stroke={color} strokeWidth="0.8" opacity="0.45"/>
            <polygon points="80,3 87,10 80,17 73,10" fill="none" stroke={color} strokeWidth="0.9" opacity="0.7"/>
            <rect x="93" y="6" width="8" height="8" fill={color} opacity="0.65" transform="rotate(45 97 10)"/>
            <rect x="105" y="7" width="6" height="6" fill="none" stroke={color} strokeWidth="0.8" opacity="0.5" transform="rotate(45 108 10)"/>
            <rect x="115" y="6" width="8" height="8" fill={color} opacity="0.65" transform="rotate(45 119 10)"/>
            <polygon points="140,3 147,10 140,17 133,10" fill="none" stroke={color} strokeWidth="0.9" opacity="0.7"/>
            <line x1="150" y1="10" x2="220" y2="10" stroke={color} strokeWidth="0.8" opacity="0.45"/>
          </svg>
        </div>
      );

    case 'geometric':
      return (
        <div style={containerStyle}>
          <div style={lineStyle} />
          <svg width="48" height="24" viewBox="0 0 48 24" style={{ flexShrink: 0 }}>
            <polygon points="24,2 46,12 24,22 2,12" fill="none" stroke={color} strokeWidth="1" opacity="0.7"/>
            <circle cx="24" cy="12" r="3.5" fill={color} opacity="0.6"/>
            <circle cx="24" cy="12" r="6.5" fill="none" stroke={color} strokeWidth="0.6" opacity="0.4"/>
          </svg>
          <div style={lineStyle} />
        </div>
      );

    case 'ornate':
      return (
        <div style={{ ...containerStyle, flexDirection: 'column', gap: '2px', margin: '1.5rem 0' }}>
          <svg width="280" height="22" viewBox="0 0 280 22">
            <path
              d="M10,11 C30,3 50,19 70,11 C90,3 100,19 110,11 C120,3 130,11 140,11 C150,11 160,3 170,11 C180,19 190,3 210,11 C230,19 250,3 270,11"
              fill="none"
              stroke={color}
              strokeWidth="1.1"
              opacity="0.45"
            />
            <circle cx="140" cy="11" r="4" fill={color} opacity="0.7"/>
            <circle cx="140" cy="11" r="8" fill="none" stroke={color} strokeWidth="0.7" opacity="0.35"/>
            <circle cx="60" cy="11" r="2.5" fill={color} opacity="0.45"/>
            <circle cx="220" cy="11" r="2.5" fill={color} opacity="0.45"/>
          </svg>
        </div>
      );

    default:
      return null;
  }
}
