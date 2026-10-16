"use client";

import { useState } from "react";
import { resolveTech } from "./techIcons";

/**
 * Renders a tech's icon when the dataset has a real devicon (type: "icon"),
 * or a small colored badge using the dataset's label + color when it
 * doesn't (type: "text", or no dataset match at all).
 */
export function TechBadge({ name, size = 13 }: { name: string; size?: number }) {
  const { iconUrl, label, color } = resolveTech(name);
  const [iconFailed, setIconFailed] = useState(false);
  const showIcon = iconUrl && !iconFailed;

  if (showIcon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt=""
        width={size}
        height={size}
        className="flex-shrink-0"
        onError={() => setIconFailed(true)}
      />
    );
  }

  return (
    <span
      className="flex-shrink-0 rounded-[3px] flex items-center justify-center font-bold text-black/80 leading-none"
      style={{
        backgroundColor: color,
        width: size,
        height: size,
        fontSize: Math.max(6, size * 0.55),
      }}
    >
      {label}
    </span>
  );
}
