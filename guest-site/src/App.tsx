import { Navigate, Route, Routes } from 'react-router-dom';

import GuestSiteView from '@guest/GuestSiteView';
import Home from '@guest/Home';
import { WeddingPublicPage } from '@guest/wedding-sites/components/WeddingPublicPage';
import { WeddingSiteBuilder } from '@guest/wedding-sites/components/WeddingSiteBuilder';
import { WeddingRSVPPage } from '@guest/rsvp/WeddingRSVPPage';
import { CookieBanner } from '@guest/components/CookieBanner';
import { ErrorBoundary } from '@guest/components/ErrorBoundary';
import { PrivacyPage, CguPage, SupportPage } from '@guest/legal/LegalPages';

export default function App() {
  return (
    <ErrorBoundary fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', background: '#F6F2EA' }}>
        <div>
          <p style={{ fontSize: '1.1rem', color: '#991b1b', marginBottom: '1rem' }}>Une erreur est survenue.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '0.6rem 1.2rem', borderRadius: 10, border: 'none', background: '#8F947F', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            Recharger la page
          </button>
        </div>
      </div>
    }>
      <CookieBanner />
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Pages légales — URLs publiques exigées par l'App Store (avant le catch-all /:slug) */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/cgu" element={<CguPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/wedding" element={<Navigate to="/wedding/build" replace />} />
        <Route path="/wedding/build" element={<WeddingSiteBuilder />} />
        {/* RSVP public — toutes les invitations ou via token */}
        <Route path="/wedding/:slug/rsvp" element={<WeddingRSVPPage />} />
        {/* Lien d'invitation segmenté par événement */}
        <Route path="/wedding/:slug/invite/:token" element={<WeddingRSVPPage />} />
        {/* Builder depuis l'app mobile — charge le site existant, prénoms verrouillés */}
        <Route path="/wedding/:slug/build" element={<WeddingSiteBuilder />} />
        {/* Page publique riche — templates + thème (localStorage démo puis API si étendus) */}
        <Route path="/wedding/:slug" element={<WeddingPublicPage />} />
        {/* Legacy : slug racine depuis l'ancienne route API invité */}
        <Route path="/:slug" element={<GuestSiteView />} />
      </Routes>
    </ErrorBoundary>
  );
}
