const ExcelJS = require('exceljs');
const workbook = new ExcelJS.Workbook();
console.log('workbook.csv:', Object.keys(workbook.csv || {}));
console.log('workbook.csv.load:', typeof workbook.csv.load);
console.log('workbook.csv.read:', typeof workbook.csv.read);
console.log('workbook.csv.parse:', typeof workbook.csv.parse);
console.log('workbook.xlsx.load:', typeof workbook.xlsx.load);
// Check if there's a csv module
const csv = require('exceljs/lib/csv');
console.log('csv module:', Object.keys(csv));
