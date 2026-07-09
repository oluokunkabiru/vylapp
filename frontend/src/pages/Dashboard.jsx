import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Avatar, Ic, ic, Spinner, VerifiedBadge, numFmt } from "../components/ui/index.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [earnings, setEarnings] = useState(null);
  const [autopilot, setAutopilot] = useState(null);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [earningsData, autopilotData, notifData] = await Promise.all([
          api.get("/creator/me/earnings").catch(() => null),
          api.get("/autopilot/config").catch(() => null),
          api.get("/notifications?pageSize=3").catch(() => null),
        ]);

        if (earningsData) setEarnings(earningsData);
        if (autopilotData) setAutopilot(autopilotData.config);
        if (notifData) setRecentNotifs(notifData.notifications || []);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  if (!user) return null;

  const usd = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

  const pendingBalance = earnings?.profile?.pending_balance_usd || 0;
  const totalEarned = earnings?.profile?.total_earned_usd || 0;
  const isCreatorProfile = !!earnings?.profile;

  return (
    <div style={{ padding: "24px 20px 60px", animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", margin: 0 }}>Dashboard</h1>
          <p style={{ color: "var(--text2)", fontSize: 14, marginTop: 4 }}>Workspace and analytics command center</p>
        </div>
        <Link to="/profile">
          <Avatar user={user} size={42} ring />
        </Link>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <Spinner size={36} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Welcome User Card */}
          <div style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(56,189,248,0.06) 100%)",
            border: "1px solid var(--violet-border)",
            borderRadius: 20,
            padding: 24,
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", right: -20, top: -20, width: 120, height: 120,
              background: "radial-gradient(var(--violet-lt) 0%, transparent 70%)",
              opacity: 0.25, pointerEvents: "none"
            }} />
            
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar user={user} size={54} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>{user.displayName}</span>
                  {user.verified && <VerifiedBadge size={14} />}
                </div>
                <span style={{ color: "var(--text2)", fontSize: 13, fontFamily: "var(--mono)" }}>@{user.handle}</span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: "flex", gap: 24, marginTop: 24, borderTop: "1px solid var(--border2)", paddingTop: 18 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", letterSpacing: 0.5 }}>CONNECTIONS</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginTop: 4 }}>{numFmt(user.connectionsCount)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", letterSpacing: 0.5 }}>FOLLOWING</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginTop: 4 }}>{numFmt(user.followingCount)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", letterSpacing: 0.5 }}>TOTAL VIBES</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginTop: 4 }}>{numFmt(user.vibesCount)}</div>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--text3)", letterSpacing: 0.8, marginBottom: 12 }}>QUICK ACTIONS</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => navigate("/explore")} style={{
                background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 16,
                padding: "16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                transition: "transform 0.15s, border-color 0.15s", textAlign: "left"
              }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--violet-lt)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                 onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.transform = "none"; }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(56,189,248,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic d={ic.search} s={18} c="var(--sky)" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Search</div>
                  <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>Find topics & vibers</div>
                </div>
              </button>

              <button onClick={() => navigate("/spaces")} style={{
                background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 16,
                padding: "16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                transition: "transform 0.15s, border-color 0.15s", textAlign: "left"
              }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--violet-lt)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                 onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.transform = "none"; }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,107,107,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic d={ic.spaces} s={18} c="var(--coral)" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Live Spaces</div>
                  <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>Join audio discussions</div>
                </div>
              </button>
            </div>
          </div>

          {/* Creator Earnings Section */}
          <div style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: 20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(16,245,160,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic d={ic.dollar} s={16} c="var(--green)" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 800 }}>Creator Wallet</span>
              </div>
              <Link to="/creator" style={{ fontSize: 12.5, color: "var(--violet-lt)", fontWeight: 700 }}>
                Manage Account →
              </Link>
            </div>

            {isCreatorProfile ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text2)" }}>Pending Balance</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "var(--green)", fontFamily: "var(--mono)", marginTop: 4 }}>
                    {usd(pendingBalance)}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 4 }}>
                    {usd(totalEarned)} total earned
                  </div>
                </div>
                
                {pendingBalance >= 10 ? (
                  <button onClick={() => navigate("/creator")} style={{
                    background: "var(--green)", color: "#08070F", fontWeight: 800, fontSize: 13,
                    padding: "8px 14px", borderRadius: 10, cursor: "pointer", boxShadow: "0 4px 12px rgba(16,245,160,0.2)"
                  }}>
                    Payout
                  </button>
                ) : (
                  <div style={{ fontSize: 11.5, color: "var(--text3)", textAlign: "right" }}>
                    Min. payout $10
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "12px 8px" }}>
                <p style={{ color: "var(--text2)", fontSize: 13.5, marginBottom: 12, lineHeight: 1.5 }}>
                  Monetize your account. Earn from Super Vibes, subscription tiers, and paid Spaces.
                </p>
                <button onClick={() => navigate("/creator")} style={{
                  background: "var(--violet-dim)", border: "1px solid var(--violet-border)",
                  color: "var(--violet-lt)", fontWeight: 700, fontSize: 13,
                  padding: "8px 16px", borderRadius: 10, cursor: "pointer"
                }}>
                  Become a Creator
                </button>
              </div>
            )}
          </div>

          {/* Autopilot Agent Status */}
          <div style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: 20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic d={ic.zap} s={16} c="var(--violet-lt)" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 800 }}>Autopilot AI Agent</span>
              </div>
              <Link to="/autopilot" style={{ fontSize: 12.5, color: "var(--violet-lt)", fontWeight: 700 }}>
                Configure →
              </Link>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: autopilot?.enabled ? "var(--green)" : "var(--text3)"
                  }} />
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: autopilot?.enabled ? "var(--green)" : "var(--text2)" }}>
                    {autopilot?.enabled ? "Agent Active" : "Agent Standby"}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 6 }}>
                  {autopilot?.enabled ? "Automatically creating & scheduling posts" : "Manual operations only"}
                </div>
              </div>

              {!autopilot?.enabled && (
                <button onClick={() => navigate("/autopilot")} style={{
                  background: "rgba(139,92,246,0.12)", border: "1px solid var(--violet-border)",
                  color: "var(--violet-lt)", fontWeight: 700, fontSize: 12.5,
                  padding: "6px 12px", borderRadius: 8, cursor: "pointer"
                }}>
                  Enable
                </button>
              )}
            </div>
          </div>

          {/* Recent Activity / Notifications */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--text3)", letterSpacing: 0.8 }}>RECENT ACTIVITY</h3>
              <Link to="/notifications" style={{ fontSize: 12, color: "var(--violet-lt)", fontWeight: 700 }}>
                View all
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentNotifs.length === 0 ? (
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 16, padding: "20px 16px", textAlign: "center", color: "var(--text3)", fontSize: 13.5 }}>
                  No recent activity
                </div>
              ) : (
                recentNotifs.map((n) => (
                  <div key={n.id} style={{
                    background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 16,
                    padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start"
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: "rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>
                      <span style={{ fontSize: 14 }}>🔔</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>
                        {n.body}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                        {new Date(n.created_at || Date.now()).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
