"use client";

import gsap from "gsap";
import { ScrollTrigger, SplitText } from "gsap/all";

import About from "@/components/About";
import Art from "@/components/Art";
import Cocktails from "@/components/Cocktails";
import Contact from "@/components/Contact";
import Hero from "@/components/Hero";
import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import SiteHub from "@/components/SiteHub";

gsap.registerPlugin(ScrollTrigger, SplitText);

export default function LandingPage() {
  return (
    <main>
      <SiteHub />
      <Navbar />
      <Hero />
      <Cocktails />
      <About />
      <Art />
      <Menu />
      <Contact />
    </main>
  );
}
