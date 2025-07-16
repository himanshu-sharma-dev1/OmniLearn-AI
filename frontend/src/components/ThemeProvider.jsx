// src/components/ThemeProvider.jsx
import React, { createContext, useEffect, useState } from "react"

export const ThemeProviderContext = createContext({
  theme: "system",
  setTheme: () => null,
})

export function ThemeProvider({ children, defaultTheme = "system", storageKey = "vite-ui-theme", ...props }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(storageKey) || defaultTheme)

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    root.classList.add(theme === "system" ? systemTheme : theme)
  }, [theme])

  const value = { theme, setTheme: (theme) => { localStorage.setItem(storageKey, theme); setTheme(theme) } }

  return <ThemeProviderContext.Provider {...props} value={value}>{children}</ThemeProviderContext.Provider>
}