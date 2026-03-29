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
            "tertiary": "#ffb4aa",
            "tertiary-fixed": "#ffdad5",
            "on-error": "#690005",
            "surface-variant": "#353535",
            "on-secondary-fixed-variant": "#454747",
            "on-error-container": "#ffdad6",
            "surface-container-low": "#1b1b1b",
            "on-background": "#e2e2e2",
            "on-tertiary": "#690003",
            "on-secondary-fixed": "#1a1c1c",
            "secondary": "#c6c6c7",
            "on-tertiary-fixed": "#410001",
            "tertiary-fixed-dim": "#ffb4aa",
            "surface-dim": "#131313",
            "surface-tint": "#ffb4aa",
            "inverse-on-surface": "#303030",
            "surface-container-lowest": "#0e0e0e",
            "on-tertiary-fixed-variant": "#930005",
            "on-secondary": "#2f3131",
            "secondary-container": "#454747",
            "primary-container": "#ff5545",
            "primary": "#ffb4aa",
            "surface-container-highest": "#353535",
            "outline": "#ad8883",
            "on-surface": "#e2e2e2",
            "secondary-fixed": "#e2e2e2",
            "outline-variant": "#5d3f3b",
            "primary-fixed-dim": "#ffb4aa",
            "on-secondary-container": "#b4b5b5",
            "secondary-fixed-dim": "#c6c6c7",
            "on-tertiary-container": "#5c0002",
            "on-primary": "#690003",
            "inverse-primary": "#c0000a",
            "error-container": "#93000a",
            "inverse-surface": "#e2e2e2",
            "primary-fixed": "#ffdad5",
            "on-primary-container": "#5c0002",
            "surface-bright": "#393939",
            "error": "#ffb4ab",
            "surface-container": "#1f1f1f",
            "on-surface-variant": "#e7bdb7",
            "surface-container-high": "#2a2a2a",
            "background": "#131313",
            "surface": "#131313",
            "tertiary-container": "#ff5545",
            "on-primary-fixed": "#410001",
            "on-primary-fixed-variant": "#930005",
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