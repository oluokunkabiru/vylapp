import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";

import useTheme            from "./hooks/useTheme";
import Navbar              from "./components/Navbar";
import Footer              from "./components/Footer";

import HomePage            from "./pages/HomePage";
import AboutPage           from "./pages/AboutPage";
import FeaturesPage        from "./pages/FeaturesPage";
import CommunitiesPage     from "./pages/CommunitiesPage";
import PricingPage         from "./pages/PricingPage";
import CreatorsPage        from "./pages/CreatorsPage";
import SpacesPage          from "./pages/SpacesPage";
import { BlogPage }        from "./pages/BlogPage";
import PressPage           from "./pages/PressPage";
import HelpPage            from "./pages/HelpPage";
import LegalPage           from "./pages/LegalPage";
import ContactPage         from "./pages/ContactPage";
import { ManifestoPage, ChangelogPage, InvestorsPage } from "./pages/MiscPages";
import { TERMS, PRIVACY, GUIDELINES } from "./data/legal";

import { DARK, LIGHT } from "./config";

// Scroll to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Layout({ dark, setDark, children }) {
  return (
    <div style={{
      background: dark ? DARK.bg : LIGHT.bg,
      color: dark ? DARK.text : LIGHT.text,
      minHeight: "100vh",
      transition: "background 0.2s, color 0.2s",
    }}>
      <Navbar dark={dark} setDark={setDark} />
      <main>{children}</main>
      <Footer dark={dark} />
    </div>
  );
}

function AppRoutes({ dark, setDark }) {
  const props = { dark };
  return (
    <Layout dark={dark} setDark={setDark}>
      <ScrollToTop />
      <Routes>
        <Route path="/"            element={<HomePage       {...props} />} />
        <Route path="/about"       element={<AboutPage      {...props} />} />
        <Route path="/features"    element={<FeaturesPage   {...props} />} />
        <Route path="/communities" element={<CommunitiesPage {...props} />} />
        <Route path="/pricing"     element={<PricingPage    {...props} />} />
        <Route path="/creators"    element={<CreatorsPage   {...props} />} />
        <Route path="/spaces"      element={<SpacesPage     {...props} />} />
        <Route path="/blog"        element={<BlogPage       {...props} />} />
        <Route path="/press"       element={<PressPage      {...props} />} />
        <Route path="/help"        element={<HelpPage       {...props} />} />
        <Route path="/contact"     element={<ContactPage    {...props} />} />
        <Route path="/manifesto"   element={<ManifestoPage  {...props} />} />
        <Route path="/changelog"   element={<ChangelogPage  {...props} />} />
        <Route path="/investors"   element={<InvestorsPage  {...props} />} />
        <Route path="/terms"       element={<LegalPage {...TERMS}      {...props} />} />
        <Route path="/privacy"     element={<LegalPage {...PRIVACY}    {...props} />} />
        <Route path="/guidelines"  element={<LegalPage {...GUIDELINES} {...props} />} />
        {/* 404 fallback */}
        <Route path="*"            element={<HomePage       {...props} />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  const [dark, setDark] = useTheme();
  return (
    <BrowserRouter>
      <AppRoutes dark={dark} setDark={setDark} />
    </BrowserRouter>
  );
}
