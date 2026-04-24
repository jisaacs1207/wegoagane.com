import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  title?: string;
};

export function IdentityPortrait({ src, alt, className, title }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className={`identity-portrait identity-portrait--fallback ${className ?? ""}`}
        title={title ?? alt}
        aria-hidden
      />
    );
  }
  return (
    <img
      className={`identity-portrait ${className ?? ""}`}
      src={src}
      alt={alt}
      title={title ?? alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
