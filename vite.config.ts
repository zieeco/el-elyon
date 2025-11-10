import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@/db': path.resolve(__dirname, './src/db'),
			'@/server': path.resolve(__dirname, './src/server'),
		},
	},
});
