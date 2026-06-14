"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { ReactLenis, useLenis } from "lenis/react";
import { useEffect, useSyncExternalStore } from "react";

gsap.registerPlugin(ScrollTrigger);

function subscribeToReducedMotion(onStoreChange) {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", onStoreChange);

  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function LenisScrollTriggerSync() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);

    const raf = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off("scroll", onScroll);
      gsap.ticker.remove(raf);
    };
  }, [lenis]);

  return null;
}

export default function SmoothScroll({ children }) {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  if (prefersReducedMotion) {
    return children;
  }

  return (
    <ReactLenis
      root
      options={{
        autoRaf: false,
        lerp: 0.1,
        smoothWheel: true,
        anchors: true,
      }}
    >
      <LenisScrollTriggerSync />
      {children}
    </ReactLenis>
  );
}
