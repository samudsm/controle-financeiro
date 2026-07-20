"use client";
import { useEffect } from "react";

// Registra o Service Worker (PWA) apenas em produção/HTTPS.
export default function RegistrarSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silencioso: em dev pode falhar, tudo bem.
      });
    }
  }, []);
  return null;
}
