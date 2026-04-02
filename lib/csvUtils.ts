/**
 * Utilidades para Importación y Exportación de Datos en LinkVentas
 * Basado en estándares RFC 4180
 */

/**
 * Convierte un arreglo de objetos JSON a un string CSV balanceado
 */
export function jsonToCSV(data: any[]): string {
  if (data.length === 0) return "";
  
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => 
    headers.map(header => {
      let val = obj[header] === null || obj[header] === undefined ? "" : String(obj[header]);
      // Escapado para CSV: Envolver en comillas si tiene comas, saltos o comillas
      if (val.includes(",") || val.includes("\n") || val.includes('"')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Convierte un string CSV a un arreglo de objetos
 */
export function csvToJSON(csv: string): any[] {
  const lines = csv.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const result: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    const values: string[] = [];
    let start = 0;
    let inQuotes = false;

    // Parser manual robusto para manejar comas dentro de comillas
    for (let j = 0; j < currentLine.length; j++) {
      if (currentLine[j] === '"') inQuotes = !inQuotes;
      if (currentLine[j] === ',' && !inQuotes) {
        values.push(currentLine.substring(start, j).replace(/^"|"$/g, '').replace(/""/g, '"'));
        start = j + 1;
      }
    }
    values.push(currentLine.substring(start).replace(/^"|"$/g, '').replace(/""/g, '"'));

    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || "";
    });
    result.push(obj);
  }

  return result;
}

/**
 * Gatilla la descarga de un archivo en el navegador
 */
export function downloadFile(content: string, filename: string, contentType: string = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
