import Image from "next/image";

type Props = {
  variant?: "studio-primary" | "ip-secondary" | "badge";
  priority?: boolean;
};

export default function BrandLogos({
  variant = "studio-primary",
  priority = false,
}: Props) {
  if (variant === "badge") {
    return (
      <Image
        className="brand-badge-protect"
        src="/brand/historia-que-protege-selo.png"
        alt="História que Protege"
        width={180}
        height={72}
        priority={priority}
      />
    );
  }

  if (variant === "ip-secondary") {
    return (
      <Image
        className="brand-logo-series"
        src="/brand/os-baribudos-logo.png"
        alt="Os Baribudos"
        width={200}
        height={82}
        priority={priority}
      />
    );
  }

  return (
    <Image
      className="brand-logo-studio"
      src="/brand/baribudos-studio-logo.png"
      alt="Baribudos Studio"
      width={280}
      height={110}
      priority={priority}
    />
  );
      }
