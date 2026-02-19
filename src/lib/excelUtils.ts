import ExcelJS from 'exceljs';

/**
 * Read an Excel file and return rows as a 2D array (similar to XLSX.utils.sheet_to_json with header:1)
 */
export async function readExcelFile(data: ArrayBuffer): Promise<any[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const rows: any[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row, _rowNumber) => {
    const values: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      // Pad with undefined for missing columns
      while (values.length < colNumber - 1) values.push(undefined);
      // Get the actual value (handle formulas)
      let val = cell.value;
      if (val && typeof val === 'object' && 'result' in val) {
        val = (val as ExcelJS.CellFormulaValue).result;
      }
      if (val && typeof val === 'object' && 'richText' in val) {
        val = (val as ExcelJS.CellRichTextValue).richText.map(rt => rt.text).join('');
      }
      values.push(val);
    });
    rows.push(values);
  });

  return rows;
}

/**
 * Read an Excel file from CSV text and return rows as a 2D array
 */
export async function readCsvAsExcel(text: string): Promise<any[][]> {
  const workbook = new ExcelJS.Workbook();
  // Parse CSV by creating a worksheet manually
  const rows = text.split('\n').map(line => {
    // Simple CSV parsing
    const cells: any[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === ';') && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  }).filter(row => row.some(cell => cell !== ''));
  
  return rows;
}

interface ExcelExportColumn {
  width?: number;
}

interface ExcelExportMerge {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

interface ExcelExportOptions {
  sheetName?: string;
  columns?: ExcelExportColumn[];
  merges?: ExcelExportMerge[];
}

/**
 * Create an Excel workbook from a 2D array of data and trigger download
 */
export async function writeExcelFile(
  data: Record<string, any>[],
  fileName: string,
  options: ExcelExportOptions = {}
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(options.sheetName || 'Sheet1');

  // Add data rows
  data.forEach(row => {
    const values = Object.values(row);
    worksheet.addRow(values);
  });

  // Set column widths
  if (options.columns) {
    options.columns.forEach((col, index) => {
      if (col.width) {
        worksheet.getColumn(index + 1).width = col.width;
      }
    });
  }

  // Apply merges
  if (options.merges) {
    options.merges.forEach(merge => {
      worksheet.mergeCells(
        merge.s.r + 1, merge.s.c + 1,
        merge.e.r + 1, merge.e.c + 1
      );
    });
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Simple Excel export from array-of-arrays with header rows, column widths, and merges
 */
export async function writeExcelFromArrays(
  allRows: any[][],
  fileName: string,
  options: {
    sheetName?: string;
    columnWidths?: number[];
    merges?: ExcelExportMerge[];
  } = {}
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(options.sheetName || 'Sheet1');

  // Add rows
  allRows.forEach(row => {
    worksheet.addRow(row);
  });

  // Set column widths
  if (options.columnWidths) {
    options.columnWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });
  }

  // Apply merges
  if (options.merges) {
    options.merges.forEach(merge => {
      worksheet.mergeCells(
        merge.s.r + 1, merge.s.c + 1,
        merge.e.r + 1, merge.e.c + 1
      );
    });
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
