import { Fragment, lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import GuestSiteView from '@guest/GuestSiteView';
import Home from '@guest/Home';
import { WeddingPublicPage } from '@guest/wedding-sites/components/WeddingPublicPage';
import { WeddingSiteBuilder } from '@guest/wedding-sites/components/WeddingSiteBuilder';
import { WeddingRSVPPage } from '@guest/rsvp/WeddingRSVPPage';
import { CookieBanner } from '@guest/components/CookieBanner';
import { ErrorBoundary } from '@guest/components/ErrorBoundary';
import { PrivacyPage, CguPage, SupportPage } from '@guest/legal/LegalPages';
import PostSharePage from '@guest/share/PostSharePage';
import { EVENT_PATH_PREFIXES } from '@guest/wedding-sites/utils/eventRoutes';

const PresentationPage = lazy(() => import('@guest/presentation/PresentationPage'));

/** Nouvelle page = haut de page (sinon /presentation s'ouvre au niveau où l'on était sur l'accueil) */
function ScrollToTopOnNavigate() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

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
      <ScrollToTopOnNavigate />
      <CookieBanner />
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Pages légales — URLs publiques exigées par l'App Store (avant le catch-all /:slug) */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/cgu" element={<CguPage />} />
        <Route path="/support" element={<SupportPage />} />
        {/* Présentation globale OHEVE (le PDF en version interactive) — lien à partager aux prestataires */}
        <Route path="/presentation" element={<Suspense fallback={<div style={{ minHeight: '100vh', background: '#ece8e0' }} />}><PresentationPage /></Suspense>} />
        {/* Page publique d'un post partagé depuis l'app (avant le catch-all /:slug) */}
        <Route path="/p/:photoId" element={<PostSharePage />} />
        {/* Une route par événement : /wedding (mariage), /bar-mitsva, /bat-mitsva,
            /brit-mila — mêmes pages, le préfixe suit le type du site
            (cf. wedding-sites/utils/eventRoutes.ts). */}
        {EVENT_PATH_PREFIXES.map((prefix) => (
          <Fragment key={prefix}>
            <Route path={`/${prefix}`} element={<Navigate to={`/${prefix}/build`} replace />} />
            <Route path={`/${prefix}/build`} element={<WeddingSiteBuilder />} />
            {/* RSVP public — toutes les invitations ou via token */}
            <Route path={`/${prefix}/:slug/rsvp`} element={<WeddingRSVPPage />} />
            {/* Lien d'invitation segmenté par événement */}
            <Route path={`/${prefix}/:slug/invite/:token`} element={<WeddingRSVPPage />} />
            {/* Builder depuis l'app mobile — charge le site existant, prénoms verrouillés */}
            <Route path={`/${prefix}/:slug/build`} element={<WeddingSiteBuilder />} />
            {/* Page publique riche — templates + thème */}
            <Route path={`/${prefix}/:slug`} element={<WeddingPublicPage />} />
          </Fragment>
        ))}
        {/* Legacy : slug racine depuis l'ancienne route API invité */}
        <Route path="/:slug" element={<GuestSiteView />} />
      </Routes>
    </ErrorBoundary>
  );
}
