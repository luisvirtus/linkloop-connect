export function BrandLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <img src="/favicon.svg" alt="" aria-hidden="true" className={className} />
  );
}
