import Image from "next/image";
import { cn } from "@/lib/utils";

interface SupabaseImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
}

export default function SupabaseImage({
  src,
  alt,
  className,
  sizes,
  priority,
}: SupabaseImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}