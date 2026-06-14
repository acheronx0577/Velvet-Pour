"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { navLinks } from "@/constants";

gsap.registerPlugin(ScrollTrigger);

const NAV_SCROLL_OFFSET = -72;
const NAV_SCROLL_OPTIONS = {
  offset: NAV_SCROLL_OFFSET,
  duration: 0.85,
  easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
};
const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const Navbar = () => {
  const navRef = useRef(null);
  const sheetRef = useRef(null);
  const sheetDragRef = useRef({ active: false, startY: 0, deltaY: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const mounted = useSyncExternalStore(
    subscribeNoop,
    getClientSnapshot,
    getServerSnapshot,
  );
  const lenis = useLenis();

  useGSAP(
    () => {
      const navEl = navRef.current;
      const barBg = navEl?.querySelector(".nav-bar-bg");
      if (!navEl || !barBg) return;

      gsap.from(".nav-brand, .nav-link-item, .nav-cta", {
        y: -18,
        opacity: 0,
        duration: 1.1,
        stagger: 0.07,
        ease: "power3.out",
        delay: 0.15,
      });

      gsap.timeline({
        scrollTrigger: {
          trigger: navEl,
          start: "bottom top",
        },
      }).fromTo(
        barBg,
        {
          backgroundColor: "transparent",
          borderColor: "rgba(255,255,255,0)",
        },
        {
          backgroundColor: "rgba(0,0,0,0.62)",
          backdropFilter: "blur(14px)",
          borderColor: "rgba(231,211,147,0.18)",
          duration: 0.85,
          ease: "power2.inOut",
        },
      );
    },
    { scope: navRef },
  );

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const isTabletMenuViewport = useCallback(() => {
    return window.matchMedia("(min-width: 768px) and (max-width: 1279px)").matches;
  }, []);

  const resetSheetTransform = useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) {
      return;
    }
    sheet.style.transform = "";
    sheet.style.transition = "";
  }, []);

  const onSheetTouchStart = useCallback(
    (event) => {
      if (!isTabletMenuViewport()) {
        return;
      }
      sheetDragRef.current = {
        active: true,
        startY: event.touches[0].clientY,
        deltaY: 0,
      };
      if (sheetRef.current) {
        sheetRef.current.style.transition = "none";
      }
    },
    [isTabletMenuViewport],
  );

  const onSheetTouchMove = useCallback((event) => {
    if (!sheetDragRef.current.active) {
      return;
    }
    const deltaY = event.touches[0].clientY - sheetDragRef.current.startY;
    if (deltaY < 0) {
      return;
    }
    sheetDragRef.current.deltaY = deltaY;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  }, []);

  const onSheetTouchEnd = useCallback(() => {
    if (!sheetDragRef.current.active) {
      return;
    }
    const { deltaY } = sheetDragRef.current;
    sheetDragRef.current.active = false;

    if (sheetRef.current) {
      sheetRef.current.style.transition = "transform 0.25s ease";
    }

    if (deltaY > 72) {
      closeMenu();
      resetSheetTransform();
      return;
    }

    if (sheetRef.current) {
      sheetRef.current.style.transform = "translateY(0)";
      window.setTimeout(resetSheetTransform, 250);
    }
  }, [closeMenu, resetSheetTransform]);

  const toggleMenu = useCallback(() => {
    setMenuOpen((open) => !open);
  }, []);

  const scrollToSection = useCallback(
    (sectionId) => {
      setMenuOpen(false);
      document.documentElement.classList.remove("nav-menu-open");

      const runScroll = () => {
        const target = document.getElementById(sectionId);
        if (!target) {
          return;
        }

        if (lenis) {
          lenis.start();
          lenis.scrollTo(target, {
            ...NAV_SCROLL_OPTIONS,
            force: true,
            onComplete: () => ScrollTrigger.refresh(),
          });
        } else {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          ScrollTrigger.refresh();
        }
      };

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(runScroll);
      });
    },
    [lenis],
  );

  useEffect(() => {
    if (!menuOpen) {
      resetSheetTransform();
    }
  }, [menuOpen, resetSheetTransform]);

  useEffect(() => {
    document.documentElement.classList.toggle("nav-menu-open", menuOpen);

    if (menuOpen) {
      lenis?.stop();
    } else {
      lenis?.start();
      window.requestAnimationFrame(() => ScrollTrigger.refresh());
    }
  }, [menuOpen, lenis]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    const desktopNav = window.matchMedia("(min-width: 1280px)");
    const onViewportChange = () => {
      if (desktopNav.matches) {
        closeMenu();
      }
    };

    desktopNav.addEventListener("change", onViewportChange);
    return () => desktopNav.removeEventListener("change", onViewportChange);
  }, [closeMenu]);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("nav-menu-open");
      lenis?.start();
    };
  }, [lenis]);

  return (
    <>
      <nav
        ref={navRef}
        className={menuOpen ? "nav-open" : undefined}
        data-lenis-prevent
      >
        <div className="nav-bar-bg" aria-hidden="true" />
        <div className="nav-shell">
          <a
            href="#hero"
            className="nav-brand"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection("hero");
            }}
          >
            <img src="/images/logo.png" alt="" aria-hidden="true" />
            <span className="nav-brand-copy">
              <span className="nav-brand-name">Velvet Pour</span>
              <span className="nav-brand-tag">Est. 2024 · LA</span>
            </span>
          </a>

          <ul className="nav-links" aria-label="Primary">
            {navLinks.map((link, index) => (
              <li key={link.id} className="nav-link-item">
                <a
                  href={`#${link.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSection(link.id);
                  }}
                >
                  <span className="nav-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="nav-label">{link.title}</span>
                </a>
              </li>
            ))}
          </ul>

          <a
            href="#contact"
            className="nav-cta nav-link-item"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection("contact");
            }}
          >
            Want to say hello?
          </a>

          <button
            type="button"
            className="nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="nav-mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            data-lenis-prevent
            onClick={toggleMenu}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {mounted
        ? createPortal(
            <div
              id="nav-mobile-menu"
              className={`nav-mobile-panel${menuOpen ? " is-open" : ""}`}
              aria-hidden={!menuOpen}
              data-lenis-prevent
            >
              <button
                type="button"
                className="nav-mobile-backdrop"
                aria-label="Close menu"
                tabIndex={menuOpen ? 0 : -1}
                onClick={closeMenu}
              />

              <div
                ref={sheetRef}
                className="nav-mobile-sheet"
                onTouchStart={onSheetTouchStart}
                onTouchMove={onSheetTouchMove}
                onTouchEnd={onSheetTouchEnd}
                onTouchCancel={onSheetTouchEnd}
              >
                <div className="nav-mobile-grab" aria-hidden="true" />

                <div className="nav-mobile-stage">
                  <div className="nav-mobile-inner">
                  <div className="nav-mobile-head">
                    <p className="nav-mobile-eyebrow">Menu</p>
                    <div className="nav-mobile-headline">
                      <p className="nav-mobile-title">Velvet District</p>
                      <p className="nav-mobile-hours">Thu – Sat · 6pm – 2am</p>
                    </div>
                  </div>

                  <ul className="nav-mobile-links">
                    {navLinks.map((link, index) => (
                      <li key={link.id}>
                        <a
                          href={`#${link.id}`}
                          onClick={(event) => {
                            event.preventDefault();
                            scrollToSection(link.id);
                          }}
                          tabIndex={menuOpen ? 0 : -1}
                        >
                          <span className="nav-index">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="nav-mobile-link-copy">
                            <span className="nav-label">{link.title}</span>
                            <span className="nav-mobile-link-hint">
                              {link.id === "cocktails" && "Seasonal pours"}
                              {link.id === "about" && "Our story"}
                              {link.id === "art" && "Glass & garnish"}
                              {link.id === "contact" && "Message AcheronX0577"}
                            </span>
                          </span>
                          <span className="nav-mobile-link-arrow" aria-hidden="true">
                            →
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>

                  <div className="nav-mobile-foot">
                    <p className="nav-mobile-meta">Est. 2024 · Downtown Los Angeles</p>
                    <a
                      href="#contact"
                      className="nav-mobile-cta"
                      onClick={(event) => {
                        event.preventDefault();
                        scrollToSection("contact");
                      }}
                      tabIndex={menuOpen ? 0 : -1}
                    >
                      Want to say hello?
                    </a>
                  </div>
                </div>
              </div>
            </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

export default Navbar;
