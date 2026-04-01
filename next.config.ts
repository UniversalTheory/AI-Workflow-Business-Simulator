import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Output: 'standalone' could be used for Docker deployments later.
   * For now, standard local dev mode.
   */

  /**
   * serverExternalPackages: Tell the bundler not to bundle the 'fs' module
   * (used by profileStorage.ts). This resolves the Turbopack NFT warning about
   * filesystem operations being detected in the server bundle trace.
   *
   * profileStorage.ts only runs server-side (API routes + Server Components),
   * so excluding 'fs' from the bundle is correct and expected.
   */
  serverExternalPackages: ['fs'],
};

export default nextConfig;
