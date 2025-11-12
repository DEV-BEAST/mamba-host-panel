import type { Config } from 'tailwindcss';
import uiConfig from '@mambaPanel/ui/tailwind.config';

const config: Config = {
  ...uiConfig,
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
};

export default config;
