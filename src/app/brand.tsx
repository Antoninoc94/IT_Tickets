import { getSettings } from "@/lib/settings";

export function brandInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "IT";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function logoSrc(storageKey: string) {
  // The version query busts the browser cache whenever a new logo is uploaded.
  return `/api/branding/logo?v=${storageKey}`;
}

/** Logo image, or an initials badge if no logo is set. */
export async function BrandBadge({ size = "lg" }: { size?: "sm" | "lg" }) {
  const settings = await getSettings();
  const badgeClass =
    size === "sm" ? "h-7 w-7 rounded-md text-sm" : "h-11 w-11 rounded-lg text-base";
  const imgClass = size === "sm" ? "h-7 max-w-[9rem]" : "h-12 max-w-[14rem]";

  if (settings.logoStorageKey) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={logoSrc(settings.logoStorageKey)} alt={settings.appName} className={`${imgClass} w-auto object-contain`} />
    );
  }

  return (
    <span className={`brand-mark flex items-center justify-center font-bold text-white ${badgeClass}`}>
      {brandInitials(settings.appName)}
    </span>
  );
}

/** Header lockup: badge/logo + app name, side by side. */
export async function BrandInline() {
  const settings = await getSettings();

  if (settings.logoStorageKey) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={logoSrc(settings.logoStorageKey)}
        alt={settings.appName}
        className="h-7 w-auto max-w-[12rem] object-contain"
      />
    );
  }

  return (
    <>
      <span className="brand-mark flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold text-white">
        {brandInitials(settings.appName)}
      </span>
      {settings.appName}
    </>
  );
}
