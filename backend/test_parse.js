
const { parseContactsCsvBuffer } = require('./services/xlsxImportService');
const fs = require('fs');
const data = fs.readFileSync('C:/Users/Birame/Downloads/Vos coordonnées.csv/Vos coordonnées.csv');
parseContactsCsvBuffer(data).then(result => {
  console.log('Rows:', result.rows.length);
  console.log('First row:', JSON.stringify(result.rows[0]));
}).catch(e => {
  console.error('Error:', e.message);
  console.error('Stack:', e.stack);
});
