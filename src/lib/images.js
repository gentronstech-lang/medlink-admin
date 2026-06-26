const BASE_URL =
  import.meta.env.VITE_IMAGES_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "";

export function resolveImageUrl(path) {
  if (!path) return path;

  if (
    typeof path === "string" &&
    (path.startsWith("http://") ||
      path.startsWith("https://") ||
      path.startsWith("data:"))
  ) {
    return path;
  }

  const base = typeof BASE_URL === "string" ? BASE_URL : "";
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedPath = String(path).replace(/^\/+/, "");

  return `${normalizedBase}/${normalizedPath}`;
}

