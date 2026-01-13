import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // 1. GitHub Pages 배포를 위한 경로 설정 (추가됨)
      base: '/DA/', 

      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [],
      define: {
        // 기존 설정을 유지하되, Vite 관례에 따라 주입
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
