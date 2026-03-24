"use client";

import Image from "next/image";

export default function Header() {
  return (
    <header className="flex flex-col items-center mb-16 relative">
      <div className="mb-8">
        <Image
          src="/logo.svg"
          alt="HyperLearn Logo"
          width={60}
          height={96}
          className="text-black"
          priority
        />
      </div>
      
      <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 text-center leading-[0.9]">
        HYPER<span className="text-transparent bg-clip-text bg-gradient-to-b from-gray-500 to-black">LEARN</span>
      </h1>
      
      <p className="text-xl md:text-2xl font-medium text-gray-500 max-w-2xl text-center leading-tight">
        Watch a browser agent browse live documentation and generate interconnected skill files in real time.
      </p>

      <div className="mt-6 text-sm font-bold uppercase tracking-widest text-gray-400">
        Built with <a href="https://hyperbrowser.ai" target="_blank" className="text-black underline decoration-2 underline-offset-4 hover:bg-black hover:text-white transition-all px-1">Hyperbrowser</a>
      </div>
    </header>
  );
}
