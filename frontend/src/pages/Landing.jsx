import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";

const NAV_LINKS = ["Features","Vision","Learn","Community","Creator"];

const FEATURES = [
  { title:"Vibes Feed", desc:"Share thoughts, stories and creativity with your community. What matters most to you rises to the top." },
  { title:"Guided Learning", desc:"Take structured courses from verified educators. Smart recommendations surface the right content at the right time." },
  { title:"Spaces", desc:"Join topic-driven communities across culture, tech, agriculture, arts and more — built for people everywhere." },
  { title:"Real-time Messaging", desc:"Connect and collaborate instantly. Secure, fast, end-to-end conversations with the people you follow." },
  { title:"Autopilot", desc:"Automated content scheduling, audience growth and engagement — so you can spend more time creating." },
  { title:"Creator Economy", desc:"Monetise your knowledge and creativity. Earn from subscriptions, courses and content directly on the platform." },
];

const STATS = [
  { num:"1K+", label:"Founding Members" },
  { num:"50+", label:"Verified Educators" },
  { num:"20+", label:"Languages Supported" },
  { num:"150+", label:"Countries Reached" },
];

const TESTIMONIALS = [
  { name:"Adaeze O.", role:"Educator · Lagos", text:"Vylapp gave me a platform to teach my community without needing a third-party tool. It brought me students I'd never have reached on my own.", avatar:"AO", color:"#7C3AED" },
  { name:"Kofi M.", role:"Creator · Accra", text:"Autopilot alone changed my workflow. I spend more time creating and less time managing — and my earnings tripled in 2 months.", avatar:"KM", color:"#059669" },
  { name:"Amara D.", role:"Student · London", text:"As part of the diaspora, Vylapp connects me back to my roots. The courses and community feel like home, no matter where I am.", avatar:"AD", color:"#DC2626" },
  { name:"Mei L.", role:"Educator · Singapore", text:"I thought this was a niche African app when I joined. Turns out the community spans six continents — my course reached students I never expected.", avatar:"ML", color:"#0EA5E9" },
];

export default function Landing() {
  const nav = useNavigate();
  const heroRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Intersection observer for scroll-reveal
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });
  };

  return (
    <div className="lp">

      {/* ── NAV ── */}
      <nav className={`lp-nav ${scrolled ? "lp-nav--solid" : ""}`}>
        <div className="lp-nav__inner">
          <div className="lp-nav__brand" onClick={() => window.scrollTo({top:0,behavior:"smooth"})} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
            <img src="/assets/logo.png" alt="Vylapp" style={{height:28,width:28,borderRadius:6,objectFit:"contain"}} />
            Vylapp
          </div>

          <div className={`lp-nav__links ${menuOpen ? "open" : ""}`}>
            {NAV_LINKS.map(l => (
              <button key={l} className="lp-nav__link" onClick={() => scrollTo(l.toLowerCase())}>{l}</button>
            ))}
          </div>

          <div className="lp-nav__cta">
            <button className="lp-btn lp-btn--ghost" onClick={() => nav("/login")}>Sign in</button>
            <button className="lp-btn lp-btn--primary" onClick={() => nav("/register")}>Join Free</button>
          </div>

          <button className="lp-nav__burger" onClick={() => setMenuOpen(m => !m)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero" ref={heroRef}>
        <div className="lp-hero__bg">
          <div className="lp-hero__orb lp-hero__orb--1" />
          <div className="lp-hero__orb lp-hero__orb--2" />
          <div className="lp-hero__orb lp-hero__orb--3" />
          <div className="lp-hero__grid" />
        </div>
        <div className="lp-hero__content">
          <div className="lp-badge">Built for creators, learners &amp; communities everywhere</div>
          <h1 className="lp-hero__h1">
            <span className="lp-hero__word">Vibe.</span>
            <span className="lp-hero__word lp-hero__word--grad">Learn.</span>
            <span className="lp-hero__word">Connect.</span>
          </h1>
          <p className="lp-hero__sub">
            Vylapp is the social platform where creators, learners and communities from every corner
            of the world come together — built on culture, driven by real people, made for you.
          </p>
          <div className="lp-hero__actions">
            <button className="lp-btn lp-btn--primary lp-btn--lg" onClick={() => nav("/register")}>
              Start for Free →
            </button>
            <button className="lp-btn lp-btn--outline lp-btn--lg" onClick={() => scrollTo("features")}>
              See how it works
            </button>
          </div>
          <div className="lp-hero__stats">
            {STATS.map(s => (
              <div key={s.label} className="lp-hero__stat">
                <strong>{s.num}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* floating card preview */}
        <div className="lp-hero__mockup">
          <div className="lp-mockup">
            <div className="lp-mockup__header">
              <div className="lp-mockup__dot" /><div className="lp-mockup__dot" /><div className="lp-mockup__dot" />
            </div>
            <div className="lp-mockup__body">
              {[
                { av:"AD", name:"Adaeze", tag:"Creator", text:"Just dropped my new Afrofusion course", color:"#7C3AED", likes:284 },
                { av:"PS", name:"Priya S.", tag:"Educator", text:"My cohort found me from three different continents this week", color:"#059669", likes:162 },
                { av:"DR", name:"Diego R.", tag:"Viber", text:"Spaces connected me with creators across 12 countries", color:"#DC2626", likes:491 },
              ].map((v, i) => (
                <div key={i} className="lp-vibe-card">
                  <div className="lp-vibe-card__av" style={{background:v.color}}>{v.av}</div>
                  <div className="lp-vibe-card__body">
                    <div className="lp-vibe-card__meta"><strong>{v.name}</strong><span>{v.tag}</span></div>
                    <div className="lp-vibe-card__text">{v.text}</div>
                    <div className="lp-vibe-card__actions">
                      <span>{v.likes} Likes</span><span>Reply</span><span>Revibe</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="lp-section">
        <div className="lp-section__inner">
          <div className="lp-section__label reveal">Everything you need</div>
          <h2 className="lp-section__h2 reveal">One platform. Infinite possibilities.</h2>
          <p className="lp-section__sub reveal">
            From social vibes to structured learning, creator monetisation to real community building —
            Vylapp brings it all together.
          </p>
          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="lp-feature-card reveal" style={{ animationDelay: `${i * 0.08}s` }}>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VISION ── */}
      <section id="vision" className="lp-section lp-section--dark">
        <div className="lp-section__inner lp-vision">
          <div className="lp-vision__text">
            <div className="lp-section__label reveal" style={{color:"#c4b5fd"}}>Our Mission &amp; Vision</div>
            <h2 className="lp-section__h2 reveal" style={{color:"#fff"}}>
              You'll never have to translate yourself to belong here.
            </h2>
            <p className="lp-section__sub reveal" style={{color:"#94a3b8"}}>
              Vylapp is the multilingual social platform where multicultural communities vibe, learn and
              connect — in their own languages. We exist to tear down the language barrier at the heart
              of the social internet, so no community has to translate itself to belong.
            </p>
            <div className="lp-vision__cards reveal">
              {[
                { title:"Mission", text:"Vylapp exists to tear down the language barrier at the heart of the social internet — building one platform where multicultural and multilingual communities create, learn, and belong in their own languages, on their own terms." },
                { title:"Vision", text:"A world where no one is a second-class citizen of the internet because of the language they speak — where an entrepreneur in Lagos, a student in São Paulo, a teacher in Manila, and a creator in Mexico City share one digital home, and culture travels as freely as content." },
              ].map((c, i) => (
                <div key={i} className="lp-vision__card">
                  <div>
                    <strong>{c.title}</strong>
                    <p>{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-vision__visual reveal">
            <div className="lp-globe">
              <div className="lp-globe__ring lp-globe__ring--1" />
              <div className="lp-globe__ring lp-globe__ring--2" />
              <div className="lp-globe__ring lp-globe__ring--3" />
              <div className="lp-globe__core" />
              {["Lagos","Cairo","Mumbai","London","São Paulo","New York","Sydney"].map((c, i, arr) => (
                <div key={c} className="lp-globe__city" style={{ "--i": i, "--ang": `${(360 / arr.length) * i}deg` }}>
                  <div className="lp-globe__city-dot" /><span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── LEARN ── */}
      <section id="learn" className="lp-section">
        <div className="lp-section__inner">
          <div className="lp-section__label reveal">Learn Pillar</div>
          <h2 className="lp-section__h2 reveal">Knowledge that moves with you.</h2>
          <p className="lp-section__sub reveal">
            Verified educators create structured courses, matched to what you need.
            You learn, grow and earn — all in one place.
          </p>
          <div className="lp-learn-steps reveal">
            {[
              { n:"01", title:"Discover", desc:"Courses tailored to your interests, language and goals, surfaced the moment you need them." },
              { n:"02", title:"Learn", desc:"Bite-sized lessons from verified educators across every field, from every corner of the world." },
              { n:"03", title:"Earn & Teach", desc:"Become a verified educator. Monetise your expertise with subscriptions and one-time courses." },
            ].map((s, i) => (
              <div key={i} className="lp-learn-step">
                <div className="lp-learn-step__num">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMUNITY / TESTIMONIALS ── */}
      <section id="community" className="lp-section lp-section--tinted">
        <div className="lp-section__inner">
          <div className="lp-section__label reveal">Community</div>
          <h2 className="lp-section__h2 reveal">Real people. Real impact.</h2>
          <div className="lp-testimonials reveal">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="lp-testimonial">
                <div className="lp-testimonial__quote">"</div>
                <p className="lp-testimonial__text">{t.text}</p>
                <div className="lp-testimonial__author">
                  <div className="lp-testimonial__av" style={{background:t.color}}>{t.avatar}</div>
                  <div>
                    <strong>{t.name}</strong>
                    <span>{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CREATOR ── */}
      <section id="creator" className="lp-section">
        <div className="lp-section__inner lp-creator">
          <div className="lp-creator__text reveal">
            <div className="lp-section__label">Creator Economy</div>
            <h2 className="lp-section__h2">Your creativity. Your earnings.</h2>
            <p className="lp-section__sub">
              Vylapp's creator economy puts you in control. Set your price, grow your audience
              and earn — with Autopilot doing the heavy lifting behind the scenes.
            </p>
            <ul className="lp-creator__list">
              {["Subscription-based creator plans","Course sales & one-time enrollments","Autopilot for content scheduling","Real-time earnings dashboard","Founding Member perks — forever"].map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <button className="lp-btn lp-btn--primary" onClick={() => nav("/register")}>
              Become a Creator →
            </button>
          </div>
          <div className="lp-creator__card reveal">
            <div className="lp-earn-card">
              <div className="lp-earn-card__header">Creator Dashboard</div>
              <div className="lp-earn-card__stat">
                <span>This Month</span>
                <strong style={{color:"#10b981"}}>₦ 284,000</strong>
              </div>
              <div className="lp-earn-card__bars">
                {[60,80,45,90,70,100,55].map((h, i) => (
                  <div key={i} className="lp-earn-card__bar" style={{"--h": h + "%"}} />
                ))}
              </div>
              <div className="lp-earn-card__row"><span>Students</span><strong>1,240</strong></div>
              <div className="lp-earn-card__row"><span>Rating</span><strong>4.9 / 5</strong></div>
              <div className="lp-earn-card__row"><span>Autopilot</span><strong style={{color:"#10b981"}}>Active</strong></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta">
        <div className="lp-cta__orb" />
        <div className="lp-cta__inner">
          <div className="lp-badge lp-badge--light reveal">Limited Founding Member spots remain</div>
          <h2 className="lp-cta__h2 reveal">Join the movement. Shape the future.</h2>
          <p className="lp-cta__sub reveal">
            Be among the first 1,000 Vylapp members and earn your Founding Member badge — permanently.
            No credit card. No catch.
          </p>
          <div className="lp-cta__actions reveal">
            <button className="lp-btn lp-btn--white lp-btn--lg" onClick={() => nav("/register")}>
              Create Free Account →
            </button>
            <button className="lp-btn lp-btn--outline-light lp-btn--lg" onClick={() => nav("/login")}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <div className="lp-footer__brand">
            <div className="lp-footer__logo" style={{display:"flex",alignItems:"center",gap:8}}>
              <img src="/assets/logo.png" alt="Vylapp" style={{height:24,width:24,borderRadius:4,objectFit:"contain"}} />
              Vylapp
            </div>
            <p>Vibe. Learn. Connect.<br />Built for creators and communities, everywhere.</p>
          </div>
          <div className="lp-footer__links">
            {[["Product","Features","Learn","Creator","Spaces","Autopilot"],["Company","About","Mission","Blog","Careers"],["Legal","Privacy","Terms","Cookie Policy"]].map(([title, ...links]) => (
              <div key={title} className="lp-footer__col">
                <strong>{title}</strong>
                {links.map(l => <a key={l} href="#">{l}</a>)}
              </div>
            ))}
          </div>
        </div>
        <div className="lp-footer__bottom">
          <span>© {new Date().getFullYear()} Vylapp. All rights reserved.</span>
          <span className="lp-world-pill">BUILT FOR EVERY VOICE, EVERYWHERE</span>
          <span>As the world moves, we move with it</span>
        </div>
      </footer>

    </div>
  );
}
