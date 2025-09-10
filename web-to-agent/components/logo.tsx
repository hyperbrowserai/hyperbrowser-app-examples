import React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
}

export function Logo({ className = "h-8 w-8" }: LogoProps) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <Image
        src="/logo.svg"
        alt="Web-to-Agent Tool Generator Logo"
        width={32}
        height={32}
        className="w-full h-full"
      />
    </div>
  );
}
