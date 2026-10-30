const ExcelJS = require('exceljs');
const fs = require('fs');

const data = fs.readFileSync('C:/Users/Birame/Downloads/Vos coordonnées.csv/Vos coordonnées.csv');
const workbook = new ExcelJS.Workbook();

// Try loading as buffer
workbook.csv.load(data).then(() => {
  console.log('CSV load with buffer succeeded, sheets:', workbook.worksheets.length);
  workbook.eachSheet((ws) => {
    console.log('Sheet:', ws.name, 'rows:', ws.rowCount);
    ws.eachRow((row, i) => {
      if (i <= 3) console.log('Row', i, row.values);
    });
  });
}).catch((e) => {
  console.error('CSV load with buffer failed:', e.message);
  
  // Try with string
  const str = data.toString('utf-8');
  const wb2 = new ExcelJS.Workbook();
  wb2.csv.load(str).then(() => {
    console.log('CSV load with string succeeded, sheets:', wb2.worksheets.length);
  }).catch((e2) => {
    console.error('CSV load with string also failed:', e2.message);
  });
});
