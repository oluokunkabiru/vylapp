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

// Curated sample for the scrolling greeting ticker and the hero's rotating
// translation demo below — a small, hand-picked set of real languages/copy
// for the marketing page, not pulled from the platform's live translation
// engine (65 languages, see frontend/src/lib/languages.js). Hardcoding a
// short showcase here is a deliberate landing-page choice: nobody actually
// wants a ticker cycling through 65 languages, and this copy needs to read
// as natural, hand-checked sentences rather than machine output.
const MARQUEE_GREETINGS = ["Welcome","Kaabọ","Karibu","Bienvenido","Bem-vindo","欢迎","مرحبًا","स्वागत है","Bienvenue","Sannu da zuwa","Nnọọ","እንኳን መጡ","Chào mừng","Selamat datang"];

const DEMO_VIBES = [
  { lang: "English",   code: "EN", dir: "ltr", text: "Just dropped my new Afrofusion course — 340 signups in 6 hours." },
  { lang: "Yorùbá",    code: "YO", dir: "ltr", text: "Mo ṣẹ̀ṣẹ̀ tú ẹ̀kọ́ Afrofusion tuntun mi jáde — 340 ti forúkọ sílẹ̀ ní wákàtí mẹ́fà." },
  { lang: "Kiswahili", code: "SW", dir: "ltr", text: "Nimetoa kozi yangu mpya ya Afrofusion — watu 340 wamejiandikisha kwa saa 6." },
  { lang: "Español",   code: "ES", dir: "ltr", text: "Acabo de lanzar mi nuevo curso de Afrofusion — 340 inscritos en 6 horas." },
  { lang: "العربية",   code: "AR", dir: "rtl", text: "لقد أطلقت للتو دورتي الجديدة في الأفروفيوجن - 340 مسجلاً خلال 6 ساعات." },
  { lang: "中文",       code: "ZH", dir: "ltr", text: "我刚发布了我的新Afrofusion课程——6小时内已有340人报名。" },
];

const TESTIMONIALS = [
  { name:"Adaeze O.", role:"Educator · Lagos", text:"Vylapp gave me a platform to teach my community without needing a third-party tool. It brought me students I'd never have reached on my own.", avatar:"AO", color:"#7C3AED" },
  { name:"Kofi M.", role:"Creator · Accra", text:"Autopilot alone changed my workflow. I spend more time creating and less time managing — and my earnings tripled in 2 months.", avatar:"KM", color:"#059669" },
  { name:"Amara D.", role:"Student · London", text:"As part of the diaspora, Vylapp connects me back to my roots. The courses and community feel like home, no matter where I am.", avatar:"AD", color:"#DC2626" },
  { name:"Mei L.", role:"Educator · Singapore", text:"I thought this was a niche African app when I joined. Turns out the community spans six continents — my course reached students I never expected.", avatar:"ML", color:"#0EA5E9" },
];

// ─── Phone-frame mini app screens ("See it in action" section) ───────────────
// Uses the app's real logo (/assets/logo.png, same as the nav/footer) rather
// than a separate drawn mark, so the brand stays consistent across the page.
function PhoneFrame({ children }) {
  return (
    <div className="lp-phone">
      <div className="lp-phone__notch" />
      <div className="lp-phone__screen">{children}</div>
    </div>
  );
}

function ScreenHeader({ title, accent }) {
  return (
    <div className="lp-phone__head">
      <div className="lp-phone__brand">
        <img src="/assets/logo.png" alt="" />
        <span>{title}</span>
      </div>
      <div className="lp-phone__avatar" style={{background:accent}}>YO</div>
    </div>
  );
}

function FeedMiniScreen() {
  return (
    <>
      <ScreenHeader title="Vylapp" accent="#7C3AED" />
      <div className="lp-phone__tabs">
        {["For you","Tech","Learn","Global"].map((t,i)=>(
          <span key={t} className={`lp-phone__tab${i===0 ? " active" : ""}`}>{t}</span>
        ))}
      </div>
      <div className="lp-phone__card">
        <div className="lp-phone__cardHead">
          <div className="lp-phone__cardAv" style={{background:"#059669"}}>RK</div>
          <div><strong>Remi Kowalski</strong><span>Global Connect · 4h</span></div>
          <span className="lp-phone__langTag">EN</span>
        </div>
        <p>We just reached 10,000 farmers on our crop advisory platform.</p>
        <div className="lp-phone__cardFoot">
          <span>2.1K likes</span><span>1.4K reposts</span>
          <span className="lp-phone__translated">translated</span>
        </div>
      </div>
      <div className="lp-phone__card">
        <div className="lp-phone__cardHead">
          <div className="lp-phone__cardAv" style={{background:"#F59E0B"}}>JN</div>
          <div><strong>Jade Nakamura</strong><span>Creative Learn · 6h</span></div>
        </div>
        <p>Dropping a 12-piece generative art collection tonight.</p>
      </div>
    </>
  );
}

function SpaceMiniScreen() {
  return (
    <>
      <ScreenHeader title="Space" accent="#DC2626" />
      <div className="lp-phone__liveBadge">LIVE · 1,840 LISTENING</div>
      <div className="lp-phone__spaceTitle">African AgriTech: Scale &amp; Impact</div>
      <div className="lp-phone__speakers">
        {[["AK","#059669",true],["MO","#7C3AED",false],["LC","#DC2626",false]].map(([init,color,talking],i)=>(
          <div key={i} className="lp-phone__speakerAv" style={{background:color, borderColor: talking ? "#34d399" : "transparent"}}>{init}</div>
        ))}
      </div>
      <div className="lp-phone__captions">
        <div className="lp-phone__captionsLabel">LIVE CAPTIONS · SW → EN</div>
        <p>"Teknolojia inabadilisha kilimo…"</p>
        <p className="lp-phone__captionTranslated">"Technology is transforming farming…"</p>
      </div>
    </>
  );
}

function LearnMiniScreen() {
  return (
    <>
      <ScreenHeader title="Learn" accent="#059669" />
      <div className="lp-phone__course">
        <div className="lp-phone__courseLabel">TAUGHT IN PORTUGUÊS · SUBTITLED IN 8 LANGUAGES</div>
        <div className="lp-phone__courseTitle">Construindo sua primeira startup</div>
        <div className="lp-phone__progress"><div className="lp-phone__progressBar" style={{width:"68%"}} /></div>
        <span className="lp-phone__progressLabel">Lesson 17 of 25 · 68% complete</span>
      </div>
      <div className="lp-phone__cert">Certificate on completion — verified &amp; shareable</div>
    </>
  );
}

function ChatMiniScreen() {
  return (
    <>
      <ScreenHeader title="Connects" accent="#7C3AED" />
      <div className="lp-phone__bubble lp-phone__bubble--in">
        <p>¡Tu colección de arte es increíble!</p>
        <span className="lp-phone__bubbleTranslated">"Your art collection is incredible!"</span>
      </div>
      <div className="lp-phone__bubble lp-phone__bubble--out">
        <p>Absolutely! I've been hoping you'd ask.</p>
        <span className="lp-phone__bubbleTranslated">"¡Claro! Esperaba que lo preguntaras."</span>
      </div>
      <div className="lp-phone__composer">Write in any language…</div>
    </>
  );
}

export default function Landing() {
  const nav = useNavigate();
  const heroRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [vibeIdx, setVibeIdx] = useState(0);
  const [vibeFading, setVibeFading] = useState(false);
  const [greetIdx, setGreetIdx] = useState(0);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Rotates the hero's headline greeting and the mockup's live-translation
  // demo card through MARQUEE_GREETINGS / DEMO_VIBES.
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    if (reduceMotionRef.current) return;
    const g = setInterval(() => setGreetIdx(i => (i + 1) % MARQUEE_GREETINGS.length), 2000);
    const t = setInterval(() => {
      setVibeFading(true);
      setTimeout(() => { setVibeIdx(i => (i + 1) % DEMO_VIBES.length); setVibeFading(false); }, 300);
    }, 3200);
    return () => { clearInterval(g); clearInterval(t); };
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
            <span className="lp-hero__word lp-hero__word--grad" aria-live="polite">{MARQUEE_GREETINGS[greetIdx]}.</span>
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
              <div className="lp-vibe-card">
                <div className="lp-vibe-card__av" style={{background:"#7C3AED"}}>AD</div>
                <div className="lp-vibe-card__body">
                  <div className="lp-vibe-card__meta">
                    <strong>Adaeze</strong><span>Creator</span>
                    <span className="lp-vibe-card__lang">{DEMO_VIBES[vibeIdx].code}</span>
                  </div>
                  <div
                    className="lp-vibe-card__text"
                    dir={DEMO_VIBES[vibeIdx].dir}
                    style={{ opacity: vibeFading ? 0 : 1, textAlign: DEMO_VIBES[vibeIdx].dir === "rtl" ? "right" : "left" }}
                  >
                    {DEMO_VIBES[vibeIdx].text}
                  </div>
                  <div className="lp-vibe-card__actions">
                    <span>284 Likes</span><span>Reply</span><span className="lp-vibe-card__translated">translated instantly</span>
                  </div>
                </div>
              </div>
              {[
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

      {/* ── LANGUAGE MARQUEE ── */}
      <div className="lp-marquee" aria-hidden="true">
        <div className="lp-marquee__track">
          {[...MARQUEE_GREETINGS, ...MARQUEE_GREETINGS].map((g, i) => (
            <span key={i} className="lp-marquee__word">{g}</span>
          ))}
        </div>
      </div>

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

      {/* ── SEE IT IN ACTION (phone mockups) ── */}
      <section className="lp-section lp-section--tinted">
        <div className="lp-section__inner">
          <div className="lp-section__label reveal">See It In Action</div>
          <h2 className="lp-section__h2 reveal">One app. Every pillar. Your language.</h2>
          <p className="lp-section__sub reveal">
            From your feed to your classroom to your DMs — every screen in Vylapp reads back
            in the language you chose.
          </p>
          <div className="lp-phones reveal">
            <PhoneFrame><FeedMiniScreen /></PhoneFrame>
            <PhoneFrame><SpaceMiniScreen /></PhoneFrame>
            <PhoneFrame><LearnMiniScreen /></PhoneFrame>
            <PhoneFrame><ChatMiniScreen /></PhoneFrame>
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

      {/* ── LIVE TRANSLATION DEMO ── */}
      <section className="lp-section lp-section--dark">
        <div className="lp-section__inner">
          <div className="lp-section__label reveal" style={{color:"#c4b5fd"}}>See It Work</div>
          <h2 className="lp-section__h2 reveal" style={{color:"#fff"}}>Live Spaces, captioned across languages.</h2>
          <p className="lp-section__sub reveal" style={{color:"#94a3b8"}}>
            Host or join a live audio Space and watch the conversation caption itself in real time —
            everyone reads along in their own language, no interpreter required.
          </p>
          <div className="lp-caption-panel reveal">
            <div className="lp-caption-panel__badge">LIVE · 1,840 LISTENING</div>
            <div className="lp-caption-panel__title">African AgriTech: Scale &amp; Impact</div>
            <div className="lp-caption-panel__lines">
              <div className="lp-caption-line lp-caption-line--source">
                <span className="lp-caption-line__lang">SW</span>
                "Teknolojia inabadilisha kilimo Afrika Mashariki…"
              </div>
              <div className="lp-caption-line">
                <span className="lp-caption-line__lang">EN</span>
                "Technology is transforming farming in East Africa…"
              </div>
              <div className="lp-caption-line">
                <span className="lp-caption-line__lang">ES</span>
                "La tecnología está transformando la agricultura…"
              </div>
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
