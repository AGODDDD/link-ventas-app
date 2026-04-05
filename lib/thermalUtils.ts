import html2canvas from 'html2canvas'

/**
 * Limpia el DOM de funciones de color modernas (oklch, lab, etc.) 
 * que html2canvas no soporta actualmente.
 */
export const cleanCssForCanvas = (element: HTMLElement) => {
    const allElements = element.querySelectorAll('*');
    allElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        // Si detectamos colores modernos, forzamos a una alternativa segura (negro/blanco)
        if (style.color.includes('oklch') || style.color.includes('lab')) {
            (el as HTMLElement).style.color = '#000000';
        }
        if (style.backgroundColor.includes('oklch') || style.backgroundColor.includes('lab')) {
            (el as HTMLElement).style.backgroundColor = 'transparent';
        }
    });
}

/**
 * Captura un elemento y lo descarga como imagen optimizada para térmicas (BYN)
 */
export const downloadThermalTicket = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Pre-limpieza
    cleanCssForCanvas(element);

    const canvas = await html2canvas(element, {
        scale: 2, // Mejor resolución para texto pequeño
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
    });

    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}
