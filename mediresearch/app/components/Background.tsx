'use client';

export default function Background() {
  return (
    <div
      className="fixed inset-0 w-full h-screen overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {/* Background Image */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: 'url(/bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
    </div>
  );
}
