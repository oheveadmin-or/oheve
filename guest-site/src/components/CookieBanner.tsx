import { useState, useEffect } from 'react';

const STORAGE_KEY = 'oheve_cookie_consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={banner}>
      <p style={text}>
        Ce site utilise des polices Google Fonts chargées depuis des serveurs Google (transfert hors UE).
        En acceptant, vous consentez à ce chargement conformément au RGPD.{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={link}>
          Politique Google
        </a>
      </p>
      <div style={buttons}>
        <button onClick={decline} style={btnSecondary}>Refuser</button>
        <button onClick={accept} style={btnPrimary}>Accepter</button>
      </div>
    </div>
  );
}

const banner: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  background: '#3C352F',
  color: '#F6F2EA',
  padding: '16px 20px',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 12,
  zIndex: 9999,
  boxShadow: '0 -2px 12px rgba(0,0,0,0.25)',
};

const text: React.CSSProperties = {
  flex: 1,
  margin: 0,
  fontSize: 13,
  lineHeight: 1.5,
  minWidth: 200,
};

const link: React.CSSProperties = {
  color: '#D7C7B5',
  textDecoration: 'underline',
};

const buttons: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexShrink: 0,
};

const btnBase: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: '#8F947F',
  color: '#fff',
};

const btnSecondary: React.CSSProperties = {
  ...btnBase,
  background: 'transparent',
  color: '#D7C7B5',
  border: '1px solid #7B7063',
};
