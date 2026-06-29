// Monochrome brand lockups, drawn in currentColor so they render solid black.
// z.ai mark is the company's own logo (chat.z.ai static asset); the
// Hyperbrowser mark is the bolt from the sibling hyperskill app's logo.svg.

export function HyperbrowserLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 104 167"
        className="h-11 w-auto"
        fill="none"
        aria-hidden
      >
        <path
          d="M76.4409 0.958618L0.27832 83.6963H41.5624C47.8498 83.6963 53.3845 79.5487 55.1561 73.5091L76.4409 0.958618Z"
          fill="currentColor"
        />
        <path
          d="M48.9596 93.881L27.6748 166.434L103.837 83.6959H62.5532C56.2659 83.6959 50.7312 87.8436 48.9596 93.8831V93.881Z"
          fill="currentColor"
        />
      </svg>
      <span className="font-extrabold tracking-tight text-3xl lowercase">
        hyperbrowser
      </span>
    </span>
  );
}

export function ZaiLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* z.ai's own logo mark */}
      <svg viewBox="0 0 32 24" className="h-9 w-auto" fill="none" aria-hidden>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M26.8751 23.9999H1.71661e-05L9.65802 8.15484H0.6521L5.61255 5.34058e-05H32L22.0561 16.3096H31.4308L26.8751 23.9999ZM14.0486 16.258H19.7223L28.376 2.06456H6.72044L4.27161 6.09034H20.1943L19.1541 7.78053L14.0486 16.258Z"
          fill="currentColor"
        />
      </svg>
      <span className="font-extrabold tracking-tight text-3xl lowercase">
        z.ai
      </span>
    </span>
  );
}
