import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // tools 사이트의 하위 폴더(/tools/banner-editor/)에서 열리도록 상대경로로 빌드
  base: './',
  build: {
    // 빌드 결과물을 tools/banner-editor/ 에 바로 생성 (GitHub Pages가 이 폴더를 제공)
    outDir: '../../banner-editor',
    emptyOutDir: true,
  },
})
