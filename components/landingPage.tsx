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
  { id: "mclaren-1", title: "765LT SPIDER", color: "#ffffff", poster: "/images/mclaren-1.jpg", video: "/videos/mclaren-1.mp4" },
  { id: "mclaren-2", title: "ARTURA", color: "#92ff00", poster: "/images/mclaren-2.jpg", video: "/videos/mclaren-2.mp4" },
  { id: "mclaren-3", title: "750S", color: "#ff0015", poster: "/images/mclaren-3.jpeg", video: "/videos/mclaren-3.mp4" },
  { id: "mclaren-4", title: "765LT", color: "#ff2e00", poster: "/images/mclaren-4.jpeg", video: "/videos/mclaren-4.mp4" },
  { id: "mclaren-5", title: "750S SPIDER", color: "#bbc0dd", poster: "/images/mclaren-5.jpeg", video: "/videos/mclaren-5.mp4" },
];

export default function LandingPage(): JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === activeIndex) {
        if (isPlaying) v.play().catch(() => {});
      } else {
        try {
          v.pause();
          v.currentTime = 0;
        } catch {}
      }
    });
  }, [activeIndex, isPlaying]);

  const togglePlay = () => setIsPlaying((s) => !s);
  const toggleMenu = () => setMenuOpen((s) => !s);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 md:px-16 py-6">
        <div className="flex items-center gap-4">
          <span className="text-sm md:text-base tracking-wider font-semibold">2018 - 2023</span>
          <a href="/">
            <Image src="/images/logoS.png" alt="logo" width={140} height={40} />
          </a>
        </div>
      </header>

      <div className="absolute inset-0 -z-10">
        {MODELS.map((m, i) => (
          <video
            key={m.id}
            ref={(el) => {
              videoRefs.current[i] = el;
            }}
            src={m.video}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              i === activeIndex ? "opacity-100" : "opacity-0"
            }`}
            autoPlay
            muted
            loop
            playsInline
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
      </div>

      <main className="relative z-20 px-6 md:px-16 lg:px-24 py-16 min-h-screen flex items-start md:items-center">
        <div className="max-w-3xl md:mt-12">
          <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-6xl md:text-8xl" style={{ fontFamily: "Racing Sans One, cursive" }}>
            McLAREN
          </motion.h2>

          <h3 className="text-2xl md:text-3xl font-semibold tracking-wider mt-6" style={{ color: MODELS[activeIndex].color }}>
            {MODELS[activeIndex].title}
          </h3>

          <p className="mt-4 text-sm md:text-base text-neutral-200 max-w-lg">
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
          </p>

          <div className="mt-8 flex gap-4">
            <Button className="bg-black/60 border border-cyan-400 px-6 py-3">Enquire</Button>

            <button onClick={togglePlay} className="px-4 py-3 bg-white/10 rounded border border-white/10">
              {isPlaying ? "Pause" : "Play"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}