import { useState, useEffect } from "react";

/**
 * Custom Hook toggle Dark Mode
 * Đọc preference đã lưu trong localStorage hoặc tự động phát hiện theo hệ điều hành (OS)
 */
export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("darkMode", JSON.stringify(dark));
  }, [dark]);

  const toggleDarkMode = () => setDark((prev) => !prev);

  return [dark, toggleDarkMode];
}
