import { Icon, ic, Label, Btn, Wrap, Sec, sectionBorder, textSub } from "../components/UI";
import { COLORS, PRICING, COMPANY } from "../config";

const FREE_FEATURES  = ["Full access to all 5 communities","Unlimited Vibes","Join any public Space","DMs and group chats","Translation in 1 language","Basic creator profile"];
const PRO_FEATURES   = ["Everything in Free","Translation in up to 5 languages","Advanced creator analytics","AI Vibe Assistant","Autopilot scheduled posting","Ad-free experience","Priority discovery","Unlimited Spaces hosting","Raven badge + founding rate"];

export default function PricingPage({ dark }) {
  const border = sectionBorder(dark);
  const sub    = textSub(dark);
  const card   = dark
    ? { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }
    : { border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.01)" };

  return (
    <div className="pt-16">
      <Sec style={{ borderBottom: `1px solid ${border}` }}>
        <Wrap>
          <div className="text-center max-w-2xl mx-auto">
            <Label color={COLORS.violet}>Pricing</Label>
            <h1 className="font-sora font-extrabold text-5xl mt-6">Simple. Fair. Creator-first.</h1>
            <p className="mt-4 font-dm text-lg" style={{ color: sub }}>Start free. Upgrade when Vylapp earns it.</p>
          </div>
        </Wrap>
      </Sec>

      <Sec>
        <Wrap>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">

            {/* Free */}
            <div className="p-8 rounded-2xl" style={card}>
              <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: dark ? "#4A4962" : "#A0A0B0" }}>Free</p>
              <p className="font-sora font-extrabold text-4xl mt-2">${PRICING.free}</p>
              <p className="font-dm text-sm mt-1" style={{ color: sub }}>Forever free. No card required.</p>
              <div style={{ borderTop: `1px solid ${border}` }} className="mt-6 pt-6 space-y-3">
                {FREE_FEATURES.map(f => (
                  <div key={f} className="flex gap-3 text-sm font-dm" style={{ color: sub }}>
                    <Icon d={ic.check} s={13} style={{ color: COLORS.teal, marginTop: 2, flexShrink: 0 }} />{f}
                  </div>
                ))}
              </div>
              <Btn full variant="white" onClick={() => {}} className="mt-8">Create free account</Btn>
            </div>

            {/* Pro */}
            <div className="p-8 rounded-2xl relative" style={{ border: `2px solid ${COLORS.violet}`, background: dark ? "rgba(124,58,237,0.06)" : "rgba(124,58,237,0.03)" }}>
              <div className="absolute -top-3.5 left-6">
                <Label color={COLORS.violet}>Founding rate — locked</Label>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest mt-2" style={{ color: COLORS.violet }}>Vylapp Pro</p>
              <div className="flex items-end gap-1.5 mt-2">
                <p className="font-sora font-extrabold text-4xl">${PRICING.pro}</p>
                <p className="font-dm pb-1" style={{ color: sub }}>/month</p>
              </div>
              <p className="font-dm text-sm mt-1" style={{ color: sub }}>Locked for founding members.</p>
              <div style={{ borderTop: `1px solid ${border}` }} className="mt-6 pt-6 space-y-3">
                {PRO_FEATURES.map(f => (
                  <div key={f} className="flex gap-3 text-sm font-dm" style={{ color: sub }}>
                    <Icon d={ic.check} s={13} style={{ color: COLORS.violet, marginTop: 2, flexShrink: 0 }} />{f}
                  </div>
                ))}
              </div>
              <Btn full variant="primary" onClick={() => {}} className="mt-8">Join as founding member</Btn>
            </div>
          </div>

          {/* Org tier */}
          <div className="mt-8 p-6 rounded-xl flex flex-wrap items-center justify-between gap-4 max-w-3xl mx-auto" style={card}>
            <div>
              <p className="font-sora font-bold">Vylapp for Organizations</p>
              <p className="font-dm text-sm mt-1" style={{ color: sub }}>
                Universities, DAOs, nonprofits. Custom branding, SSO, private Spaces. From ${PRICING.orgFrom}/month.
              </p>
            </div>
            <a href={`mailto:${COMPANY.email}?subject=Organization inquiry`}>
              <Btn variant="outline">Contact us</Btn>
            </a>
          </div>
        </Wrap>
      </Sec>
    </div>
  );
}
