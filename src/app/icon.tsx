import { ImageResponse } from "next/og";
import { Mark } from "@/components/IconMark";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<Mark scale={1} />, size);
}

