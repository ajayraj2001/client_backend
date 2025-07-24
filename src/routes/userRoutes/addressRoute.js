const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const {addressController, getStates, getCities} = require("../../controllers/user/addressController");

// Get all addresses
router.get('/', authenticateUser, addressController.getAddresses);

// Add a new address
router.post('/',authenticateUser,  addressController.addAddress);

// Update an address
router.put('/:addressId', authenticateUser, addressController.updateAddress);

// Delete an address
router.delete('/:addressId',authenticateUser,  addressController.deleteAddress);

// Set an address as default
router.patch('/:addressId/set-default',authenticateUser,  addressController.setDefaultAddress);

router.get("/states", getStates);
router.get("/cities", getCities);


module.exports = router;