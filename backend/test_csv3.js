const ExcelJS = require('exceljs');
const fs = require('fs');

const workbook = new ExcelJS.Workbook();
const data = fs.readFileSync('C:/Users/Birame/Downloads/Vos coordonnées.csv/Vos coordonnées.csv');

// Try using read method
const stream = require('stream');
const readable = new stream.Readable();
readable.push(data);
readable.push(null);

workbook.csv.read(readable).then(() => {
  console.log('CSV read succeeded, sheets:', workbook.worksheets.length);
  workbook.eachSheet((ws) => {
    console.log('Sheet:', ws.name, 'rows:', ws.rowCount);
    ws.eachRow((row, i) => {
      if (i <= 3) console.log('Row', i, row.values);
    });
  });
}).catch((e) => {
  console.error('CSV read failed:', e.message);
  console.error('Stack:', e.stack);
});
