import Image from "next/image";

type Props = {
  variant?: "full" | "compact" | "badge";
};

export default function BrandLogos({ variant = "full" }: Props) {
  if (variant === "badge") {
    return (
      <Image
        className="brand-badge-protect"
        src="/brand/historia-que-protege-selo.png"
        alt="História que Protege"
        width={200}
        height={80}
        priority
      />
    );
  }

  if (variant === "compact") {
    return (
      <Image
        className="brand-logo-series"
        src="/brand/os-baribudos-logo.png"
        alt="Os Baribudos"
        width={220}
        height={90}
        priority
      />
    );
  }

  return (
    <Image
      className="brand-logo-studio"
      src="/brand/baribudos-studio-logo.png"
      alt="Baribudos Studio"
      width={240}
      height={100}
      priority
    />
  );
                                    }
