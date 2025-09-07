"use client";

import { ThemeProvider } from "next-themes";
import React from "react";

export default function AppThemeProvider({ children }: { children: React.ReactNode }) {
  // we use attribute = "class" so next-themes toggles 'dark' class on html
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}
