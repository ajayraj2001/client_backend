const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");
const {
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin,
  getSubAdmins,
  updateSubAdminStatus,
} = require("../../controllers/admin/roleController");

router.post('/', authenticateAdmin, createSubAdmin);
router.put('/:id', authenticateAdmin, updateSubAdmin);
router.delete('/:id', authenticateAdmin, deleteSubAdmin);
router.get('/', authenticateAdmin, getSubAdmins);
router.put('/status/:id', authenticateAdmin, updateSubAdminStatus);

module.exports = router;