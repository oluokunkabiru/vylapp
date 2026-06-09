import { useState, useEffect } from "react";

export default function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("vy-theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.body.classList.toggle("light", !dark);
    localStorage.setItem("vy-theme", dark ? "dark" : "light");
  }, [dark]);

  return [dark, setDark];
}
