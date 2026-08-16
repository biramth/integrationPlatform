const express = require('express');
const dut1Controller = require('../controllers/dut1Controller');
const roomController = require('../controllers/roomController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.post('/', requireRole('registrar', 'admin'), dut1Controller.createRecord);
router.get('/without-luggage', requireRole('logistics', 'admin'), dut1Controller.listWithoutLuggage);
router.get('/without-complementary', requireRole('registrar', 'admin'), dut1Controller.listWithoutComplementary);
router.get('/', dut1Controller.listRecords);
router.get('/export', requireRole('admin'), dut1Controller.exportRecordsCsv);
router.get('/:id', dut1Controller.getRecord);
router.put('/:id', requireRole('admin'), dut1Controller.updateRecord);
router.delete('/:id', requireRole('admin'), dut1Controller.deleteRecord);
router.put('/:id/complementary', requireRole('registrar', 'admin'), dut1Controller.completeComplementary);
router.put('/:id/allergies', requireRole('registrar', 'sante', 'admin'), dut1Controller.setAllergies);
router.put('/:id/room', requireRole('admin'), roomController.reassignDut1Room);

module.exports = router;
