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
            "tertiary-dim": "#d7d4f0",
            "on-error": "#490013",
            "outline-variant": "#48474f",
            "tertiary-container": "#e5e2ff",
            "background": "#0e0e15",
            "on-tertiary-container": "#525168",
            "surface-variant": "#25252f",
            "on-error-container": "#ffb2b9",
            "surface-container-lowest": "#000000",
            "inverse-primary": "#585a92",
            "surface": "#0e0e15",
            "on-secondary-fixed": "#1e15a3",
            "error-dim": "#d73357",
            "surface-bright": "#2b2b36",
            "surface-container": "#191921",
            "on-primary": "#37396f",
            "primary-fixed-dim": "#afb1f0",
            "on-tertiary-fixed-variant": "#5c5b72",
            "secondary": "#9193ff",
            "on-background": "#e7e4ee",
            "inverse-surface": "#fcf8ff",
            "on-surface": "#e7e4ee",
            "inverse-on-surface": "#55545d",
            "tertiary": "#f5f2ff",
            "on-tertiary": "#5a5a71",
            "on-surface-variant": "#acaab4",
            "secondary-fixed": "#cecdff",
            "tertiary-fixed": "#e5e2ff",
            "primary": "#bdbefe",
            "tertiary-fixed-dim": "#d7d4f0",
            "primary-dim": "#afb1f0",
            "primary-fixed": "#bdbefe",
            "secondary-container": "#3431b5",
            "primary-container": "#9a9bd9",
            "surface-container-highest": "#25252f",
            "on-tertiary-fixed": "#3f3f55",
            "on-secondary-fixed-variant": "#3e3dbf",
            "surface-container-low": "#13131a",
            "on-primary-fixed": "#222459",
            "surface-container-high": "#1f1f28",
            "on-secondary-container": "#cdccff",
            "outline": "#76747e",
            "on-secondary": "#0c0078",
            "error-container": "#a70138",
            "on-primary-container": "#1b1c52",
            "surface-dim": "#0e0e15",
            "secondary-fixed-dim": "#bebeff",
            "surface-tint": "#bdbefe",
            "secondary-dim": "#9193ff",
            "on-primary-fixed-variant": "#404279",
            "error": "#ff6e84",
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