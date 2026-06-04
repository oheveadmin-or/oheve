import { Navigate, Route, Routes } from 'react-router-dom';

import GuestSiteView from '@guest/GuestSiteView';
import Home from '@guest/Home';
import { WeddingPublicPage } from '@guest/wedding-sites/components/WeddingPublicPage';
import { WeddingSiteBuilder } from '@guest/wedding-sites/components/WeddingSiteBuilder';
import { WeddingRSVPPage } from '@guest/rsvp/WeddingRSVPPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/wedding" element={<Navigate to="/wedding/build" replace />} />
      <Route path="/wedding/build" element={<WeddingSiteBuilder />} />
      {/* RSVP public — toutes les invitations ou via token */}
      <Route path="/wedding/:slug/rsvp" element={<WeddingRSVPPage />} />
      {/* Lien d'invitation segmenté par événement */}
      <Route path="/wedding/:slug/invite/:token" element={<WeddingRSVPPage />} />
      {/* Page publique riche — templates + thème (localStorage démo puis API si étendus) */}
      <Route path="/wedding/:slug" element={<WeddingPublicPage />} />
      {/* Legacy : slug racine depuis l’ancienne route API invité */}
      <Route path="/:slug" element={<GuestSiteView />} />
    </Routes>
  );
}
