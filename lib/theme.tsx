"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Theme = "dark" | "light"

const ThemeContext = createContext<{
  theme: Theme
  toggle: () => void
}>({ theme: "dark", toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    const resolved = stored ?? "dark"
    setTheme(resolved)
    document.documentElement.classList.toggle("light", resolved === "light")
  }, [])

  function toggle() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark"
      localStorage.setItem("theme", next)
      document.documentElement.classList.toggle("light", next === "light")
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
