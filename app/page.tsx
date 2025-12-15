"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type Model = {
  id: string;
  title: string;
  color?: string;
  poster: string;
  video: string;
};

const MODELS: Model[] = [
  {
    id: "mclaren-1",
    title: "765LT SPIDER",
    color: "#ffffff",
    poster: "/images/mclaren-1.jpg",
    video: "/videos/mclaren-1.mp4",
  },
  {
    id: "mclaren-2",
    title: "ARTURA",
    color: "#92ff00",
    poster: "/images/mclaren-2.jpg",
    video: "/videos/mclaren-2.mp4",
  },
  {
    id: "mclaren-3",
    title: "750S",
    color: "#ff0015",
    poster: "/images/mclaren-3.jpeg",
    video: "/videos/mclaren-3.mp4",
  },
  {
    id: "mclaren-4",
    title: "765LT",
    color: "#ff2e00",
    poster: "/images/mclaren-4.jpeg",
    video: "/videos/mclaren-4.mp4",
  },
  {
    id: "mclaren-5",
    title: "750S SPIDER",
    color: "#bbc0dd",
    poster: "/images/mclaren-5.jpeg",
    video: "/videos/mclaren-5.mp4",
  },
];

export default function LandingPage(): JSX.Element {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  useEffect(() => {
    setTimeout(() => {
      videoRefs.current.forEach((v, i) => {
        if (!v) return;
        if (i === activeIndex && isPlaying) {
          v.play().catch(() => {});
        }
      });
    }, 200);
  }, [activeIndex, isPlaying]);

  useEffect(() => {
    // autoplay when component mounts (muted required for autoplay in browsers)
    setTimeout(() => setIsPlaying(true), 200);
  }, []);

  const togglePlay = () => setIsPlaying((s) => !s);
  const toggleMenu = () => setMenuOpen((s) => !s);

  return (
    <div className="min-h-screen text-white relative overflow-hidden bg-black/20">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 md:px-16 py-6">
        <div className="flex items-center gap-4">
          <span className="text-sm md:text-base tracking-wider font-semibold">
            2018 - 2023
          </span>
          <a href="/" aria-label="home" className="block">
            <Image src="/images/logoS.png" alt="logo" width={140} height={40} />
          </a>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <ul className="flex gap-6 uppercase text-sm font-light">
            <li>
              <a className="hover:text-cyan-300 transition" href="#">
                SUPERCARS
              </a>
            </li>
            <li>
              <a className="hover:text-cyan-300 transition" href="#">
                GT
              </a>
            </li>
            <li>
              <a className="hover:text-cyan-300 transition" href="#">
                ULTIMATE
              </a>
            </li>
            <li>
              <a className="hover:text-cyan-300 transition" href="#">
                SOLUS GT
              </a>
            </li>
            <li>
              <a className="hover:text-cyan-300 transition" href="#">
                LEGACY
              </a>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          <button
            aria-label="menu"
            onClick={toggleMenu}
            className={`md:hidden p-2 rounded focus:outline-none focus:ring-2 focus:ring-cyan-400 ${menuOpen ? "text-cyan-300" : ""}`}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d={
                  menuOpen ? "M6 18L18 6M6 6l12 12" : "M3 6h18M3 12h18M3 18h18"
                }
              ></path>
            </svg>
          </button>

          <div className="hidden md:flex items-center gap-3">
            <a href="#" className="text-lg hover:text-cyan-300 transition">
              <i className="bi bi-facebook" />
            </a>
            <a href="#" className="text-lg hover:text-cyan-300 transition">
              <i className="bi bi-instagram" />
            </a>
            <a href="#" className="text-lg hover:text-cyan-300 transition">
              <i className="bi bi-youtube" />
            </a>
          </div>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      <motion.aside
        initial={{ x: "-100%" }}
        animate={{ x: menuOpen ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="fixed top-0 left-0 z-40 w-72 h-full bg-gradient-to-b from-neutral-900/80 to-neutral-900/60 backdrop-blur-lg md:hidden"
      >
        <div className="p-6">
          <ul className="flex flex-col gap-4 uppercase">
            <li>
              <a className="hover:text-cyan-300" href="#">
                SUPERCARS
              </a>
            </li>
            <li>
              <a className="hover:text-cyan-300" href="#">
                GT
              </a>
            </li>
            <li>
              <a className="hover:text-cyan-300" href="#">
                ULTIMATE
              </a>
            </li>
            <li>
              <a className="hover:text-cyan-300" href="#">
                SOLUS GT
              </a>
            </li>
            <li>
              <a className="hover:text-cyan-300" href="#">
                LEGACY
              </a>
            </li>
          </ul>
        </div>
      </motion.aside>

      {/* Background Videos */}
      <div className="absolute inset-0 z-0">
        {MODELS.map((m, i) => (
          <video
            key={m.id}
            ref={(el) => {
              videoRefs.current[i] = el;
              if (el && i === activeIndex) {
                el.muted = true;
                el.play().catch(() => {});
              }
            }}
            src={m.video}
            preload="auto"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              i === activeIndex ? "opacity-100" : "opacity-0"
            }`}
            muted
            playsInline
            loop
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
      </div>

      {/* Hero content */}
      <main className="relative z-20 px-6 md:px-16 lg:px-24 py-16 min-h-screen flex items-start md:items-center">
        <div className="max-w-3xl md:mt-12">
          <motion.h2
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="font-display text-6xl md:text-8xl leading-none tracking-wide"
            style={{ fontFamily: "Racing Sans One, cursive" }}
          >
            McLAREN
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-6"
          >
            <h3
              className="text-2xl md:text-3xl font-semibold tracking-wider"
              style={{ color: MODELS[activeIndex].color || "#00c2de" }}
            >
              {MODELS[activeIndex].title}
            </h3>

            <p className="mt-4 text-sm md:text-base text-neutral-200 max-w-lg">
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic nobis
              accusamus aperiam laborum placeat non dicta nostrum iusto rerum
              deleniti.
            </p>

            <div className="mt-8 flex gap-4">
              <Button
                variant="default"
                className="bg-black/60 border border-cyan-400 px-6 py-3"
              >
                Enquire
              </Button>

              <button
                onClick={togglePlay}
                aria-label="toggle play"
                className="flex items-center gap-2 px-4 py-3 bg-white/6 rounded border border-white/10"
              >
                {isPlaying ? (
                  <span className="text-sm">Pause</span>
                ) : (
                  <span className="text-sm">Play</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Gallery / Thumbnails */}
        <aside className="ml-auto hidden md:flex flex-col items-center gap-8">
          <div className="w-[320px] h-[260px] bg-black/30 rounded-lg shadow-xl p-4 backdrop-blur-md">
            <div className="grid grid-cols-1 gap-2">
              {MODELS.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setActiveIndex(i)}
                  className={`flex items-center gap-3 w-full text-left p-2 rounded ${i === activeIndex ? "bg-white/5 ring-1 ring-cyan-400" : "hover:bg-white/3"}`}
                >
                  <div className="w-20 h-12 relative rounded overflow-hidden">
                    <Image
                      src={m.poster}
                      alt={m.title}
                      fill
                      sizes="(max-width: 768px) 20vw, 80px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4
                      className="text-sm font-medium"
                      style={{ color: m.color }}
                    >
                      {m.title}
                    </h4>
                    <p className="text-xs text-neutral-300">Model</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() =>
                setActiveIndex((s) => (s - 1 + MODELS.length) % MODELS.length)
              }
              className="p-2 bg-white/6 rounded"
            >
              Prev
            </button>
            <button
              onClick={() => setActiveIndex((s) => (s + 1) % MODELS.length)}
              className="p-2 bg-white/6 rounded"
            >
              Next
            </button>
          </div>
        </aside>
      </main>

      {/* Social icons vertical on mobile and desktop */}
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 hidden md:flex flex-col gap-3 z-30">
        <a href="#" className="text-neutral-200 hover:text-cyan-300">
          <i className="bi bi-facebook text-xl"></i>
        </a>
        <a href="#" className="text-neutral-200 hover:text-cyan-300">
          <i className="bi bi-instagram text-xl"></i>
        </a>
        <a href="#" className="text-neutral-200 hover:text-cyan-300">
          <i className="bi bi-youtube text-xl"></i>
        </a>
      </div>

      {/* Mobile thumbnails strip */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 z-30">
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-3 px-2">
            {MODELS.map((m, i) => (
              <button
                key={m.id}
                onClick={() => setActiveIndex(i)}
                className={`shrink-0 rounded overflow-hidden ${i === activeIndex ? "ring-2 ring-cyan-400" : ""}`}
              >
                <div className="relative w-36 h-20">
                  <Image
                    src={m.poster}
                    alt={m.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* small gradient footer overlay */}
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
    </div>
  );
}
