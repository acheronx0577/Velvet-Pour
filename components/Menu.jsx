"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { useLenis } from "lenis/react";

import { allCocktails } from "@/constants";

gsap.registerPlugin(ScrollTrigger);

const SCROLL_DURATION = 0.9;
const SCROLL_EASING = (t) => Math.min(1, 1.001 - 2 ** (-10 * t));
const SCROLL_STEP_VH = 70;

const RecipeContent = ({ cocktail, titleId }) => (
  <>
    <div className="info">
      <p>Recipe for:</p>
      <p className="cocktail-name" id={titleId}>
        {cocktail.name}
      </p>
    </div>

    <div className="details">
      <h2>{cocktail.title}</h2>
      <p>{cocktail.description}</p>
    </div>
  </>
);

const Menu = () => {
  const sectionRef = useRef(null);
  const tabsRef = useRef(null);
  const menuScrollRef = useRef(null);
  const trackRef = useRef(null);
  const recipeTrackRef = useRef(null);
  const displayIndexRef = useRef(0);

  const [displayIndex, setDisplayIndex] = useState(0);
  const lenis = useLenis();

  const totalCocktails = allCocktails.length;
  const slideOffset = (progress) => -(progress * 100) / totalCocktails;

  const updateSlideVisuals = (progress) => {
    const track = trackRef.current;
    const recipeTrack = recipeTrackRef.current;

    if (!track || !recipeTrack) return;

    const clampedProgress = gsap.utils.clamp(
      0,
      totalCocktails - 1,
      progress
    );
    const offset = slideOffset(clampedProgress);

    gsap.set(track, { xPercent: offset });
    gsap.set(recipeTrack, { xPercent: offset });

    const rounded = Math.round(clampedProgress);
    if (rounded !== displayIndexRef.current) {
      displayIndexRef.current = rounded;
      setDisplayIndex(rounded);
    }
  };

  useGSAP(
    () => {
      updateSlideVisuals(0);
    },
    { scope: sectionRef }
  );

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section || totalCocktails <= 1) return;

      const mm = gsap.matchMedia();

      const createMenuScroll = (start) => {
        const tabs = tabsRef.current;

        if (tabs) {
          gsap.fromTo(
            tabs,
            { y: -36 },
            {
              y: 0,
              ease: "power1.out",
              scrollTrigger: {
                trigger: section,
                start,
                end: "+=14%",
                scrub: 0.5,
                invalidateOnRefresh: true,
              },
            }
          );
        }

        const st = ScrollTrigger.create({
          id: "menu-slider",
          trigger: section,
          start,
          end: `+=${(totalCocktails - 1) * SCROLL_STEP_VH}%`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          snap: {
            snapTo: 1 / (totalCocktails - 1),
            duration: { min: 0.35, max: 0.75 },
            delay: 0.08,
            ease: "power1.inOut",
          },
          onUpdate: (self) => {
            updateSlideVisuals(self.progress * (totalCocktails - 1));
          },
        });

        menuScrollRef.current = st;
        updateSlideVisuals(st.progress * (totalCocktails - 1));
      };

      mm.add(
        {
          desktop:
            "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
        },
        () => {
          createMenuScroll("top top");
        }
      );

      mm.add("(max-width: 1023px)", () => {
        updateSlideVisuals(displayIndexRef.current);
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        updateSlideVisuals(displayIndexRef.current);
      });

      return () => {
        menuScrollRef.current = null;
        mm.revert();
      };
    },
    { scope: sectionRef }
  );

  const scrollToIndex = (index) => {
    const newIndex = (index + totalCocktails) % totalCocktails;
    const st = menuScrollRef.current;

    if (!st) {
      displayIndexRef.current = newIndex;
      setDisplayIndex(newIndex);
      updateSlideVisuals(newIndex);
      return;
    }

    const progress =
      totalCocktails > 1 ? newIndex / (totalCocktails - 1) : 0;
    const y = st.start + progress * (st.end - st.start);

    if (lenis) {
      lenis.scrollTo(y, { duration: SCROLL_DURATION, easing: SCROLL_EASING });
    } else {
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const goToSlide = (index) => {
    scrollToIndex(index);
  };

  const getCocktailAt = (indexOffset) => {
    return allCocktails[
      (displayIndex + indexOffset + totalCocktails) % totalCocktails
    ];
  };

  const prevCocktail = getCocktailAt(-1);
  const nextCocktail = getCocktailAt(1);

  return (
    <section ref={sectionRef} id="menu" aria-labelledby="menu-heading">
      <img src="/images/slider-left-leaf.png" alt="left-leaf" id="m-left-leaf" />
      <img
        src="/images/slider-right-leaf.png"
        alt="right-leaf"
        id="m-right-leaf"
      />

      <h2 id="menu-heading" className="sr-only">
        Cocktail Menu
      </h2>

      <nav
        ref={tabsRef}
        className="cocktail-tabs"
        aria-label="Cocktail Navigation"
      >
        {allCocktails.map((cocktail, index) => {
          const isActive = index === displayIndex;

          return (
            <button
              key={cocktail.id}
              className={`${
                isActive
                  ? "text-white border-white"
                  : "text-white/50 border-white/50"
              }`}
              onClick={() => goToSlide(index)}
            >
              {cocktail.name}
            </button>
          );
        })}
      </nav>

      <div className="content">
        <div className="menu-overline">
          <span>{String(displayIndex + 1).padStart(2, "0")}</span>
          <span>of</span>
          <span>{String(totalCocktails).padStart(2, "0")}</span>
        </div>

        <div className="cocktail">
          <div className="arrows">
            <button
              type="button"
              className="arrow-prev"
              aria-label={`Previous cocktail: ${prevCocktail.name}`}
              onClick={() => goToSlide(displayIndex - 1)}
            >
              <span>{prevCocktail.name}</span>
              <img
                src="/images/right-arrow.png"
                alt="right-arrow"
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              className="arrow-next"
              aria-label={`Next cocktail: ${nextCocktail.name}`}
              onClick={() => goToSlide(displayIndex + 1)}
            >
              <span>{nextCocktail.name}</span>
              <img
                src="/images/left-arrow.png"
                alt="left-arrow"
                aria-hidden="true"
              />
            </button>
          </div>

          <div
            className="cocktail-stage"
            style={{ "--menu-slide-count": totalCocktails }}
          >
            <div ref={trackRef} className="cocktail-track">
              {allCocktails.map((cocktail) => (
                <img
                  key={cocktail.id}
                  src={cocktail.image}
                  className="cocktail-slide object-contain"
                  alt=""
                />
              ))}
            </div>
          </div>
        </div>

        <div
          className="recipe"
          style={{ "--menu-slide-count": totalCocktails }}
        >
          <div className="recipe-stage">
            <div ref={recipeTrackRef} className="recipe-track">
              {allCocktails.map((cocktail, index) => (
                <div key={cocktail.id} className="recipe-panel">
                  <RecipeContent
                    cocktail={cocktail}
                    titleId={index === displayIndex ? "title" : undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Menu;
