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
        className={`${className} flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-500 dark:text-slate-400`}
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