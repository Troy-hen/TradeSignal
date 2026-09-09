"use client";

import { useEffect } from "react";

export function PublicThemeGuard() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  }, []);

  return null;
}
