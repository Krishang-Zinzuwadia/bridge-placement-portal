import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],server:{proxy:{'/api':'http://127.0.0.1:8787'}},build:{rollupOptions:{output:{manualChunks(id){if(id.includes('/node_modules/@clerk/'))return 'auth-vendor';if(id.includes('/node_modules/@phosphor-icons/'))return 'icons';if(id.includes('/node_modules/react'))return 'react-vendor';}}}}});
