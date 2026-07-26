import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Icon, ic, Btn } from "./UI";
import { NAV_MAIN, NAV_MORE } from "../data";
import { COLORS } from "../config";

export default function Navbar({ dark, setDark }) {
  const [open, setOpen] = useState(false);
  const [drop, setDrop] = useState(false);

  const navBg  = dark ? "rgba(8,7,15,0.92)"    : "rgba(255,255,255,0.92)";
  const border = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const textCol = dark ? "#9090A8" : "#444";

  const close = () => { setOpen(false); setDrop(false); };

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 backdrop-blur"
      style={{ background: navBg, borderBottom: `1px solid ${border}` }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" onClick={close} className="flex items-center gap-2">
          <img src="/assets/logo.png" alt="Vylapp" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-sora font-extrabold text-xl tracking-tight">
            <span style={{ color: COLORS.violet }}>Vyl</span>app
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-0.5">
          {NAV_MAIN.map(l => (
            <NavLink
              key={l.path}
              to={l.path}
              className="px-3.5 py-2 rounded-md text-sm font-dm font-medium transition-colors"
              style={({ isActive }) => ({ color: isActive ? COLORS.violet : textCol })}
            >
              {l.label}
            </NavLink>
          ))}

          {/* More dropdown */}
          <div className="relative">
            <button
              onClick={() => setDrop(v => !v)}
              className="flex items-center gap-1 px-3.5 py-2 rounded-md text-sm font-dm font-medium"
              style={{ color: textCol }}
            >
              More
              <Icon d={ic.chevD} s={13} className={drop ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>
            {drop && (
              <div
                className="absolute top-full right-0 mt-1.5 w-44 rounded-xl shadow-2xl py-1.5 z-50"
                style={{ background: dark ? "#0F0E1A" : "#fff", border: `1px solid ${border}` }}
              >
                {NAV_MORE.map(l => (
                  <NavLink
                    key={l.path}
                    to={l.path}
                    onClick={close}
                    className="block px-4 py-2.5 text-sm font-dm transition-colors hover:opacity-70"
                    style={{ color: dark ? "#C0BFD8" : "#333" }}
                  >
                    {l.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDark(d => !d)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ color: dark ? "#9090A8" : "#666" }}
          >
            <Icon d={dark ? ic.sun : ic.moon} s={17} />
          </button>
          <Btn variant="ghost">Log in</Btn>
          <Btn variant="primary">Join free</Btn>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden"
            onClick={() => setOpen(v => !v)}
            style={{ color: dark ? "#C0BFD8" : "#333" }}
          >
            <Icon d={open ? ic.close : ic.menu} s={22} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="lg:hidden px-6 py-3 flex flex-col gap-0.5"
          style={{ background: dark ? "#08070F" : "#fff", borderTop: `1px solid ${border}` }}
        >
          {[...NAV_MAIN, ...NAV_MORE].map(l => (
            <NavLink
              key={l.path}
              to={l.path}
              onClick={close}
              className="text-left px-3 py-2.5 rounded-lg text-sm font-dm font-medium"
              style={({ isActive }) => ({ color: isActive ? COLORS.violet : dark ? "#C0BFD8" : "#333" })}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
