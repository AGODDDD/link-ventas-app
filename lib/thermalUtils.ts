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

/**
 * Imprime un elemento HTML de forma nativa utilizando un iframe oculto.
 * Copia todos los estilos globales de la página (Tailwind CSS, etc.)
 * y aplica reglas de página específicas para impresoras térmicas de 80mm/58mm.
 */
export const printThermalTicket = (element: HTMLElement) => {
    // 1. Crear iframe oculto para la impresión
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.id = 'thermal-print-iframe';

    // Eliminar iframe previo si existe
    const existing = document.getElementById('thermal-print-iframe');
    if (existing) {
        existing.remove();
    }

    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
        console.error('No se pudo acceder al documento del iframe de impresión');
        return;
    }

    // 2. Copiar todas las hojas de estilo del documento principal (para Tailwind CSS)
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((styleEl) => {
        doc.head.appendChild(styleEl.cloneNode(true));
    });

    // 3. Inyectar estilos específicos para impresión térmica
    const styleOverride = doc.createElement('style');
    styleOverride.innerHTML = `
        @media print {
            @page {
                size: auto;
                margin: 0mm;
            }
            body {
                margin: 0;
                padding: 0;
                background-color: #ffffff !important;
                color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
        body {
            font-family: "Courier New", Courier, monospace;
            background-color: #ffffff;
            color: #000000;
            padding: 0;
            margin: 0;
        }
        /* Ajustar al ancho del rollo de ticket estándar */
        .thermal-print-wrap {
            width: 100% !important;
            max-width: 380px !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            padding: 10px 5px !important;
        }
    `;
    doc.head.appendChild(styleOverride);

    // 4. Clonar el elemento e inyectarlo en el body del iframe con clase de envoltura
    const clone = element.cloneNode(true) as HTMLElement;
    clone.classList.add('thermal-print-wrap');
    
    // Asegurar que no tenga fondos oscuros o sombras que interfieran con la impresión física
    clone.style.width = '100%';
    clone.style.maxWidth = '380px';
    clone.style.boxShadow = 'none';
    
    doc.body.appendChild(clone);

    // 5. Ejecutar la impresión nativa después de que los estilos se apliquen
    setTimeout(() => {
        try {
            if (iframe.contentWindow) {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            }
        } catch (err) {
            console.error('Error al imprimir ticket:', err);
        }
    }, 300); // 300ms de retraso es suficiente y se siente rápido
}
