import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class", //hubo cambio
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // 👈 ¡ESTA LÍNEA ES LA CLAVE!
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
            "primary": "#FF3B30",
            "primary-container": "#FF3B30",
            "on-primary-container": "#FFFFFF",
            "on-primary": "#FFFFFF",
            "secondary": "#FFFFFF",
            "on-secondary": "#000000",
            "tertiary": "#FF3B30",
            "background": "#000000",
            "on-background": "#FFFFFF",
            "surface": "#000000",
            "on-surface": "#FFFFFF",
            "surface-variant": "#1A1A1A",
            "on-surface-variant": "#CCCCCC",
            "surface-container-lowest": "#000000",
            "surface-container-low": "#141414",
            "surface-container": "#1A1A1A",
            "surface-container-high": "#222222",
            "surface-container-highest": "#2E2E2E",
            "outline": "#333333",
            "outline-variant": "#222222",
            "error": "#FF3B30",
            "on-error": "#FFFFFF",
            "primary-fixed-dim": "#FF3B30",
            // Keep existing colors
  			background_shadcn: 'hsl(var(--background))',
  			foreground_shadcn: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
		fontFamily: {
			headline: ["var(--font-space-grotesk)"],
			body: ["var(--font-inter)"],
			label: ["var(--font-inter)"],
		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;