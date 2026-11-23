/** Styles des pages « demande » — charte Oheve (ivoire, sauge, olive, anthracite, Fraunces). */
export const DEMANDES_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600;700&display=swap');
.dm-root { min-height: 100vh; background: #F6F2EA; color: #343630; font-family: 'Inter', system-ui, sans-serif;
  display: flex; flex-direction: column; align-items: center; padding: 20px 16px 48px; box-sizing: border-box; }
.dm-root *, .dm-root *::before, .dm-root *::after { box-sizing: border-box; }
.dm-logo { font-family: 'Fraunces', Georgia, serif; font-size: 28px; letter-spacing: .08em; color: #747E68; margin: 6px 0 18px; text-decoration: none; }
.dm-wrap { width: 100%; max-width: 620px; display: flex; flex-direction: column; gap: 14px; }
.dm-card { background: #fff; border: 1px solid #E4DED2; border-radius: 18px; padding: 22px; }
.dm-h1 { font-family: 'Fraunces', Georgia, serif; font-weight: 600; font-size: 24px; line-height: 1.25; margin: 0 0 6px; overflow-wrap: anywhere; }
.dm-sub { color: #6F7168; font-size: 14px; margin: 0; }
.dm-stat { background: #EEF0E8; color: #4E5545; border-radius: 12px; padding: 12px 14px; font-size: 14px; }
.dm-stat strong { color: #343630; }
.dm-label { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #8A8C82; margin: 0 0 6px; }
.dm-row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid #F0ECE3; font-size: 15px; }
.dm-row:last-child { border-bottom: 0; }
.dm-row span:first-child { color: #6F7168; flex-shrink: 0; }
.dm-row span:last-child, .dm-row a { text-align: right; overflow-wrap: anywhere; min-width: 0; }
.dm-row a { color: #747E68; }
.dm-masked { letter-spacing: 2px; color: #B9BBB2; user-select: none; }
.dm-quote { background: #F6F2EA; border-left: 4px solid #929B83; border-radius: 10px; padding: 14px 16px;
  font-family: 'Fraunces', Georgia, serif; font-size: 16px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.dm-blur { filter: blur(6px); user-select: none; pointer-events: none; color: #6F7168; margin-top: 6px; }
.dm-lockline { display: flex; align-items: center; gap: 8px; color: #6F7168; font-size: 14px; margin-top: 12px; }
.dm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 15px 18px;
  border-radius: 12px; border: 0; font: 600 16px 'Inter', sans-serif; cursor: pointer; text-decoration: none; }
.dm-btn:disabled { opacity: .55; cursor: default; }
.dm-btn-primary { background: #747E68; color: #fff; }
.dm-btn-ghost { background: #fff; color: #4E5545; border: 1.5px solid #929B83; }
.dm-btns { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.dm-btn-dark { background: #343630; color: #fff; text-decoration: none; }
.dm-app { text-align: center; background: #F6F2EA; }
.dm-app-title { font-size: 17px; font-weight: 700; color: #343630; margin: 0 0 6px; }
.dm-app-open { color: #747E68; font-size: 14px; font-weight: 600; text-decoration: underline; padding: 6px; }
.dm-thread { display: flex; flex-direction: column; gap: 10px; }
.dm-msg { max-width: 85%; padding: 11px 14px; border-radius: 14px; font-size: 15px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
.dm-msg small { display: block; margin-top: 5px; font-size: 11px; opacity: .7; }
.dm-msg-them { align-self: flex-start; background: #F6F2EA; border-bottom-left-radius: 4px; }
.dm-msg-me { align-self: flex-end; background: #747E68; color: #fff; border-bottom-right-radius: 4px; }
.dm-textarea { width: 100%; min-height: 110px; resize: vertical; border: 1.5px solid #DCD6C9; border-radius: 12px; padding: 12px;
  font: 15px/1.5 'Inter', sans-serif; color: #343630; background: #fff; }
.dm-textarea:focus { outline: none; border-color: #929B83; }
.dm-counter { text-align: right; font-size: 12px; color: #8A8C82; margin: 4px 0 10px; }
.dm-alert { border-radius: 12px; padding: 12px 14px; font-size: 14px; }
.dm-alert-ok { background: #EEF0E8; color: #3F4637; }
.dm-alert-err { background: #FBEDEA; color: #8A2E1F; }
.dm-alert-info { background: #FFF8E6; color: #6B5414; }
.dm-sim { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
.dm-sim a { display: block; background: #F6F2EA; border-radius: 12px; overflow: hidden; text-decoration: none; color: #343630; }
.dm-sim img { width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block; background: #E4DED2; }
.dm-sim .dm-sim-ph { width: 100%; height: 8px; background: #929B83; }
.dm-sim div.dm-sim-txt { padding: 8px 10px; font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
.dm-sim span { display: block; font-weight: 400; font-size: 12px; color: #6F7168; margin-top: 2px; }
.dm-badge { display: inline-block; font-size: 11px; font-weight: 600; background: #EEF0E8; color: #4E5545; border-radius: 99px; padding: 2px 8px; margin-top: 4px; }
.dm-foot { color: #8A8C82; font-size: 12px; text-align: center; margin-top: 18px; }
.dm-foot a { color: #747E68; }
@media (max-width: 420px) { .dm-card { padding: 18px 16px; } .dm-h1 { font-size: 21px; } .dm-sim { grid-template-columns: 1fr; } }
`;
