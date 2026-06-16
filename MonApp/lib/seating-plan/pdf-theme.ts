/** Charte Oheve — identique à OheveTheme.ts */
export const T = {
  sauge: '#8F947F',
  saugeDark: '#757B68',
  saugePale: '#E4E7DC',
  beige: '#D7C7B5',
  ivoire: '#F6F2EA',
  taupe: '#C7B7A5',
  moka: '#7B7063',
  textDark: '#3C352F',
  textMid: '#665D54',
  textLight: '#9A9288',
  card: '#F2EDE4',
  error: '#C17E7E',
  errorPale: '#F5E8E8',
} as const;

export const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=DM+Sans:wght@400;500;600;700&display=swap');`;

export function baseStyles(compact = false): string {
  const pad = compact ? '12mm 10mm' : '14mm 12mm';
  return `
  ${FONTS}
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  body{font-family:'DM Sans',-apple-system,sans-serif;background:${T.ivoire};color:${T.textDark};font-size:${compact ? '11px' : '12px'};line-height:1.45;}
  .page{page-break-after:always;position:relative;min-height:100vh;padding:${pad};background:${T.ivoire};}
  .page:last-child{page-break-after:auto;}
  .serif{font-family:'Cormorant Garamond',Georgia,serif;}
  .logo-ring{width:72px;height:72px;border-radius:50%;background:linear-gradient(145deg,${T.sauge} 0%,${T.saugeDark} 100%);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 28px rgba(117,123,104,0.28);}
  .logo-txt{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#fff;font-style:italic;letter-spacing:-1px;}
  .brand{font-size:9px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:${T.sauge};margin-bottom:8px;}
  .divider{height:1px;background:linear-gradient(90deg,transparent,${T.taupe},transparent);margin:14px 0;}
  .divider-accent{height:2px;background:linear-gradient(90deg,${T.sauge},${T.beige},transparent);border-radius:1px;margin:12px 0 16px;}
  .badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:99px;font-size:10px;font-weight:700;letter-spacing:0.3px;}
  .stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
  .stat-box{background:#fff;border:1px solid ${T.saugePale};border-radius:12px;padding:${compact ? '10px 6px' : '14px 8px'};text-align:center;}
  .stat-val{font-family:'Cormorant Garamond',serif;font-size:${compact ? '22px' : '26px'};font-weight:700;color:${T.saugeDark};line-height:1;}
  .stat-lbl{font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${T.textLight};margin-top:4px;}
  .hdr{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid ${T.saugePale};}
  .hdr-brand{font-size:8px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${T.sauge};}
  .hdr-title{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;color:${T.textDark};}
  .hdr-date{font-size:9px;color:${T.textLight};}
  .ftr{position:absolute;bottom:10mm;left:12mm;right:12mm;display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid ${T.saugePale};font-size:8px;color:${T.textLight};letter-spacing:0.4px;}
  .ftr-page{font-weight:600;color:${T.sauge};}
  .sec-title{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${T.textMid};margin-bottom:10px;display:flex;align-items:center;gap:8px;}
  .sec-title::after{content:'';flex:1;height:1px;background:${T.saugePale};}
  .guest-table{width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid ${T.saugePale};}
  .guest-table th{background:${T.saugePale};padding:8px 10px;text-align:left;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${T.saugeDark};}
  .guest-table td{padding:7px 10px;font-size:11px;border-top:1px solid ${T.saugePale};}
  .guest-table tr:nth-child(even) td{background:rgba(255,255,255,0.6);}
  .occ-badge{padding:5px 12px;border-radius:99px;font-size:11px;font-weight:700;}
  @page{margin:0;size:A4;}
  `;
}

export function splitGuestName(full: string): { prenom: string; nom: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return { prenom: '—', nom: parts[0] ?? '—' };
  return { prenom: parts[0], nom: parts.slice(1).join(' ') };
}
