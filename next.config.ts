import type { NextConfig } from "next";

// Nearly every page is per-user, so pages render on each request (no Cache Components).
const nextConfig: NextConfig = {};

export default nextConfig;
