import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { visualizer } from "rollup-plugin-visualizer";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: false, // Disable sourcemaps for faster builds
    chunkSizeWarningLimit: 1500,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        // Optimize chunk naming for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(path) {
          // Split Ant Design Vue into smaller chunks
          if (path.includes("node_modules/ant-design-vue/es/table")) {
            return "ant-table";
          }
          if (path.includes("node_modules/ant-design-vue/es/form")) {
            return "ant-form";
          }
          if (path.includes("node_modules/ant-design-vue/es/modal")) {
            return "ant-modal";
          }
          if (path.includes("node_modules/ant-design-vue/es")) {
            return "ant-components";
          }
          if (path.includes("node_modules/ant-design-vue")) {
            return "ant-core";
          }

          // Split ECharts into separate chunks
          if (path.includes("node_modules/zrender")) {
            return "zrender";
          }
          if (path.includes("node_modules/echarts/lib/chart")) {
            return "echarts-charts";
          }
          if (path.includes("node_modules/echarts")) {
            return "echarts-core";
          }

          // Other large libraries
          if (path.includes("node_modules/lodash")) {
            return "lodash";
          }
          if (path.includes("node_modules/vue") || path.includes("node_modules/@vue")) {
            return "vue";
          }
          if (path.includes("node_modules/@xterm")) {
            return "xterm";
          }
          if (path.includes("node_modules/@codemirror")) {
            return "codemirror";
          }
          if (path.includes("node_modules/monaco")) {
            return "monaco";
          }
          if (path.includes("node_modules/htmlparser2")) {
            return "htmlparser2";
          }

          // Split other vendor code
          if (path.includes("node_modules/")) {
            return "vendor";
          }

          // Split app code by feature
          if (path.includes("/src/widgets/stats/")) {
            return "app-stats";
          }
          if (path.includes("/src/widgets/setupApp/")) {
            return "app-setup";
          }
          if (path.includes("/src/widgets/instance/")) {
            return "app-instance";
          }
          if (path.includes("/src/widgets/")) {
            return "app-widgets";
          }
        }
      }
    }
  },
  server: {
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:23333",
        changeOrigin: true,
        ws: true
      },
      "/upload_files": {
        target: "http://localhost:23333",
        changeOrigin: true
      },
      "/socket.io": {
        target: "ws://localhost:23333",
        ws: true
      }
    }
  },

  plugins: [
    vue(),
    vueJsx(),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false // css in js
        })
      ]
    }),
    visualizer({ emitFile: true, filename: "stats.html" })
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@languages": fileURLToPath(new URL("../languages", import.meta.url))
    }
  },
  base: "./"
});
