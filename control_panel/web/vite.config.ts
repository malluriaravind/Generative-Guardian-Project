import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import packageJson from './package.json';
import legacy from "@vitejs/plugin-legacy";

const legacyPluginOptions = {
  modernTargets: "since 2023-01-01, not dead",
  modernPolyfills: true,
  renderLegacyChunks: false,
} as const;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [legacy(legacyPluginOptions), react()],
  define: {
    "import.meta.env.WEB_VERSION": JSON.stringify(packageJson.version),
  }
});
