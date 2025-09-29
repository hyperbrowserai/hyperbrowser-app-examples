import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  return (
    <nav className="nav flex items-center justify-between px-8">
      <Link href="/" className="flex items-center space-x-3">
        <Image 
          src="/Logo.svg" 
          alt="HB" 
          width={16} 
          height={16}
        />
        <h1 className="text-lg font-semibold">HyperLeads</h1>
      </Link>
      <div className="flex items-center space-x-8">
        <a 
          href="https://hyperbrowser.ai" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="font-semibold text-sm"
        >
          Get API Keys
        </a>
        <a 
          href="https://github.com/hyperbrowserai/hyperbrowser-app-examples" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="hidden md:block"
        >
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
        </a>
        <button className="md:hidden">
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>
    </nav>
  );
} 