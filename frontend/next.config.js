/** @type {import('next').NextConfig} */
const fs = require("fs");
const path = require("path");

// Vercel Services injects NEXT_PUBLIC_BACKEND_URL (e.g. /_/backend).
const vercelBackendUrl = String(process.env.NEXT_PUBLIC_BACKEND_URL || "")
  .trim()
  .replace(/\/$/, "");

// Optional override for static export on other hosts (Cloudflare Pages, etc.).
const fromEnv = String(process.env.NEXT_PUBLIC_API_URL || "")
  .trim()
  .replace(/\/$/, "");
const effectiveApiUrl = fromEnv || "http://localhost:8000";

const usePagesApiProxy =
  !vercelBackendUrl &&
  process.env.NEXT_PUBLIC_API_USE_PROXY !== "0" &&
  /^https:\/\//.test(effectiveApiUrl) &&
  !/localhost|127\.0\.0\.1/i.test(effectiveApiUrl);

const browserApiBase = vercelBackendUrl || (usePagesApiProxy ? "" : effectiveApiUrl);

const redirectsPath = path.join(__dirname, "public", "_redirects");
const vercelPath = path.join(__dirname, "vercel.json");
try {
  if (usePagesApiProxy) {
    const proxyRules = [
      { source: "/api/:path*", destination: `${effectiveApiUrl}/api/:path*` },
      { source: "/images/:path*", destination: `${effectiveApiUrl}/images/:path*` },
      {
        source: "/marketplace-assets/:path*",
        destination: `${effectiveApiUrl}/marketplace-assets/:path*`,
      },
    ];
    const lines = [
      `/api/* ${effectiveApiUrl}/api/:splat 200`,
      `/images/* ${effectiveApiUrl}/images/:splat 200`,
      `/marketplace-assets/* ${effectiveApiUrl}/marketplace-assets/:splat 200`,
      "",
    ].join("\n");
    fs.mkdirSync(path.dirname(redirectsPath), { recursive: true });
    fs.writeFileSync(redirectsPath, lines, "utf8");
    fs.writeFileSync(
      vercelPath,
      JSON.stringify({ rewrites: proxyRules }, null, 2) + "\n",
      "utf8"
    );
  } else {
    if (fs.existsSync(redirectsPath)) {
      fs.unlinkSync(redirectsPath);
    }
    if (fs.existsSync(vercelPath)) {
      fs.unlinkSync(vercelPath);
    }
  }
} catch (e) {
  console.warn("[next.config] Could not write proxy config:", e);
}

const nextConfig = {
  // Vercel Services runs native Next.js; static export is for other hosts only.
  ...(vercelBackendUrl ? {} : { output: "export" }),
  env: {
    NEXT_PUBLIC_BROWSER_API_BASE: browserApiBase,
  },
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "react-force-graph-2d": false,
        "force-graph": false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
