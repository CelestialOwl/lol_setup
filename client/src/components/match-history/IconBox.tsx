"use client";

import React, { useState } from "react";

interface IconBoxProps {
  alt: string;
  className: string;
  fallback?: number | string;
  src: string | null;
  title?: string;
}

export default function IconBox({
  alt,
  className,
  fallback,
  src,
  title,
}: IconBoxProps) {
  const [failed, setFailed] = useState(!src);

  if (failed || !src) {
    return (
      <div
        className={`${className} flex items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-[10px] font-semibold text-slate-500`}
        title={title}
      >
        {fallback ?? ""}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      title={title}
      onError={() => setFailed(true)}
    />
  );
}