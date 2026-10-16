import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // The Supabase library is large and rarely changes, so browsers can cache it separately.
          if (id.includes("node_modules/@supabase")) return "supabase";
        },
      },
    },
  },
});