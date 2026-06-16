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
          <span style={{ color, fontSize: '1rem', flexShrink: 0, letterSpacing: '0.3em' }}>✿ ✦ ✿</span>
          <div style={lineStyle} />
        </div>
      );

    case 'stars':
      return (
        <div style={containerStyle}>
          <div style={lineStyle} />
          <span style={{ color, fontSize: '0.7rem', flexShrink: 0, letterSpacing: '0.5em' }}>✦ ✦ ✦</span>
          <div style={lineStyle} />
        </div>
      );

    case 'arabesque':
      return (
        <div style={{ ...containerStyle, flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ ...lineStyle, maxWidth: 300, flex: 'none', width: '100%' }} />
          <span style={{ color, fontSize: '1.2rem' }}>❧</span>
          <div style={{ ...lineStyle, maxWidth: 300, flex: 'none', width: '100%' }} />
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

    default:
      return null;
  }
}
