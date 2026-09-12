import Image from "next/image";
import { cn } from "@/lib/utils";

interface SupabaseImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
  quality?: number;
}

export default function SupabaseImage({
  src,
  alt,
  className,
  sizes,
  priority,
  quality = 85,
}: SupabaseImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={quality}
      className={cn("object-cover", className)}
    />
  );
}