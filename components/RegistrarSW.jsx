"use client";
import { useEffect } from "react";

// Registra o Service Worker (PWA) SOMENTE em produção.
//
// Em desenvolvimento ele atrapalha: o sw.js usa cache-first para /_next/,
// que é onde mora o JavaScript do app. Resultado — o navegador continua
// rodando o código antigo e as alterações não aparecem na tela.
// Por isso, em localhost, além de não registrar, desfazemos uma instalação
// anterior e limpamos o cache que ela deixou.
export default function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const ehLocal = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(location.hostname);

    if (ehLocal) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      if (window.caches) {
        caches
          .keys()
          .then((chaves) => chaves.forEach((k) => caches.delete(k)))
          .catch(() => {});
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silencioso: se falhar, o app funciona normalmente, só sem offline.
    });
  }, []);

  return null;
}
