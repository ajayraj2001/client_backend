'use strict';
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { PujaTransaction, ProductTransaction, Puja, Product, Cart, Address, User } = require('../../models');
const { getCurrentIST } = require('../utils/timeUtils');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Generate unique order ID
const generateOrderId = () => {
  const timestamp = new Date().getTime();
  const randomNum = Math.floor(Math.random() * 10000);
  return `ORD_${timestamp}_${randomNum}`;
};

const paymentController = {
  /**
   * Create a new puja payment order
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  createPujaOrder: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { pujaId, selectedProducts, pujaDate, customerDetails, notes } = req.body;
      const userId = req.user._id;

      // Validate puja exists
      const puja = await Puja.findById(pujaId);
      if (!puja) {
        return res.status(404).json({ success: false, message: 'Puja not found' });
      }

      // Check if puja is active
      if (puja.status !== 'Active') {
        return res.status(400).json({ success: false, message: 'This puja is currently unavailable' });
      }

      // Calculate total amount
      let totalAmount = puja.actualPrice;
      const productDetails = [];

      // Process selected products
      if (selectedProducts && selectedProducts.length > 0) {
        // Get all product IDs
        const productIds = selectedProducts.map(item => item.productId);

        // Fetch all products in one query
        const products = await Product.find({
          _id: { $in: productIds },
          status: 'Active'
        });

        // Create a map for quick lookups
        const productMap = products.reduce((map, product) => {
          map[product._id.toString()] = product;
          return map;
        }, {});

        // Calculate product amounts and validate
        for (const item of selectedProducts) {
          const product = productMap[item.productId];

          if (!product) {
            return res.status(404).json({
              success: false,
              message: `Product with ID ${item.productId} not found or is inactive`
            });
          }

          const itemTotal = product.actualPrice * item.quantity;
          totalAmount += itemTotal;

          productDetails.push({
            productId: product._id,
            quantity: item.quantity,
            price: product.actualPrice,
            isCompulsory: puja.compulsoryProducts.includes(product._id)
          });
        }
      }

      // Validate compulsory products are included
      if (puja.compulsoryProducts && puja.compulsoryProducts.length > 0) {
        const selectedProductIds = productDetails.map(p => p.productId.toString());

        const missingCompulsoryProducts = puja.compulsoryProducts.filter(
          id => !selectedProductIds.includes(id.toString())
        );

        if (missingCompulsoryProducts.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'All compulsory products must be included',
            missingProducts: missingCompulsoryProducts
          });
        }
      }

      // Create Razorpay order
      const orderId = generateOrderId();
      const razorpayOrder = await razorpay.orders.create({
        amount: totalAmount * 100, // Convert to paisa
        currency: 'INR',
        receipt: orderId,
        notes: {
          userId: userId.toString(),
          pujaId: pujaId,
          type: 'PUJA_TRANSACTION'
        }
      });

      // Create transaction record but don't save it to history yet
      // It will be filtered out of normal queries due to isPaymentAttempted: false
      const transaction = new PujaTransaction({
        userId,
        pujaId,
        pujaDate: new Date(pujaDate),
        amount: totalAmount,
        displayedAmount: puja.displayedPrice,
        orderId,
        paymentId: '',
        status: 'INITIATED',
        selectedProducts: productDetails,
        customerDetails,
        notes,
        paymentDetails: {
          razorpayOrderId: razorpayOrder.id
        },
        initiatedAt: getCurrentIST(),
        isPaymentAttempted: false // Only change this when payment is attempted
      });

      await transaction.save({ session });
      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        order: razorpayOrder,
        transactionId: transaction._id,
        key: process.env.RAZORPAY_KEY_ID
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Error creating puja order:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creating order',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  },

  /**
   * Create a new product payment order
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  createProductOrder: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { products, addressId, deliveryInstructions, fromCart = false } = req.body;
      const userId = req.user._id;

      // Validate address
      const address = await Address.findOne({ _id: addressId, userId });
      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Shipping address not found'
        });
      }

      let productItems = [];
      let subtotal = 0;
      let gstAmount = 0;
      let savedAmount = 0;

      if (fromCart) {
        // Get products from user's cart
        const cart = await Cart.findOne({ userId }).populate({
          path: 'items.productId',
          select: 'name img displayedPrice actualPrice status'
        });

        if (!cart || !cart.items.length) {
          return res.status(400).json({
            success: false,
            message: 'Your cart is empty'
          });
        }

        // Filter out unavailable products
        const validItems = cart.items.filter(item =>
          item.productId && item.productId.status === 'Active'
        );

        if (validItems.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No active products in your cart'
          });
        }

        // Format product items
        for (const item of validItems) {
          const product = item.productId;
          const quantity = item.quantity;
          const basePrice = product.actualPrice * quantity;
          const itemGst = basePrice * 0.18;
          const itemSaved = (product.displayedPrice - product.actualPrice) * quantity;

          subtotal += basePrice;
          gstAmount += itemGst;
          savedAmount += itemSaved > 0 ? itemSaved : 0;

          productItems.push({
            productId: product._id,
            name: product.name,
            quantity: quantity,
            unitPrice: product.actualPrice,
            basePrice: basePrice,
            gstAmount: itemGst,
            totalPrice: basePrice + itemGst,
            img: product.img && product.img.length > 0 ? product.img[0] : ''
          });
        }
      } else {
        // Use products specified in request
        if (!products || !products.length) {
          return res.status(400).json({
            success: false,
            message: 'No products specified'
          });
        }

        // Get all product IDs
        const productIds = products.map(item => item.productId);

        // Fetch all products in one query
        const productList = await Product.find({
          _id: { $in: productIds },
          status: 'Active'
        });

        // Create a map for quick lookups
        const productMap = productList.reduce((map, product) => {
          map[product._id.toString()] = product;
          return map;
        }, {});

        // Calculate amounts and validate products
        for (const item of products) {
          const product = productMap[item.productId];

          if (!product) {
            return res.status(404).json({
              success: false,
              message: `Product with ID ${item.productId} not found or is inactive`
            });
          }

          const basePrice = product.actualPrice * item.quantity;
          const itemGst = basePrice * 0.18;
          const itemSaved = (product.displayedPrice - product.actualPrice) * item.quantity;

          subtotal += basePrice;
          gstAmount += itemGst;
          savedAmount += itemSaved > 0 ? itemSaved : 0;

          productItems.push({
            productId: product._id,
            name: product.name,
            quantity: item.quantity,
            unitPrice: product.actualPrice,
            basePrice: basePrice,
            gstAmount: itemGst,
            totalPrice: basePrice + itemGst,
            img: product.img && product.img.length > 0 ? product.img[0] : ''
          });
        }
      }

      // Calculate total amount (including GST)
      const totalAmount = subtotal + gstAmount;

      // Calculate shipping charges (if any)
      const shippingCharges = subtotal < 500 ? 40 : 0; // Free shipping over ₹500

      // Create Razorpay order
      const orderId = generateOrderId();
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round((totalAmount + shippingCharges) * 100), // Convert to paisa
        currency: 'INR',
        receipt: orderId,
        notes: {
          userId: userId.toString(),
          type: 'PRODUCT_TRANSACTION'
        }
      });

      // Format shipping details from address model
      const shippingDetails = {
        name: address.name,
        phoneNumber: address.mobileNumber,
        email: req.user.email || '',
        address: {
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          city: address.city,
          state: address.state,
          country: address.country,
          pincode: address.pincode
        }
      };

      // Create transaction record
      const transaction = new ProductTransaction({
        userId,
        amount: totalAmount + shippingCharges,
        displayedAmount: totalAmount + shippingCharges + savedAmount,
        orderId,
        paymentId: '',
        status: 'INITIATED',
        products: productItems,
        shippingDetails,
        deliveryInstructions: deliveryInstructions || '',
        orderSummary: {
          subtotal,
          gstAmount,
          shippingCharges,
          discount: 0, // Can be filled if coupon applied
          savedAmount
        },
        paymentDetails: {
          razorpayOrderId: razorpayOrder.id
        },
        initiatedAt: getCurrentIST(),
        isPaymentAttempted: false
      });

      await transaction.save({ session });

      // If order is from cart and payment is successful, clear cart later
      if (fromCart) {
        // We'll clear cart after payment verification to prevent data loss if payment fails
        transaction.paymentDetails.clearCart = true;
      }

      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        order: razorpayOrder,
        transactionId: transaction._id,
        key: process.env.RAZORPAY_KEY_ID,
        orderSummary: {
          subtotal,
          gstAmount,
          shippingCharges,
          total: totalAmount + shippingCharges,
          savedAmount
        }
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Error creating product order:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creating order',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  },

  /**
   * Mark a transaction as payment attempted
   * This ensures abandoned carts are not included in transaction history
   */
  markPaymentAttempted: async (req, res) => {
    try {
      const { transactionId, type } = req.body;

      if (!transactionId || !type) {
        return res.status(400).json({
          success: false,
          message: 'Transaction ID and type are required'
        });
      }

      let transaction;

      if (type === 'PUJA') {
        transaction = await PujaTransaction.findById(transactionId);
      } else if (type === 'PRODUCT') {
        transaction = await ProductTransaction.findById(transactionId);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid transaction type. Must be PUJA or PRODUCT'
        });
      }

      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      // Mark as payment attempted so it won't be auto-deleted and will appear in history
      transaction.isPaymentAttempted = true;
      await transaction.save();

      return res.status(200).json({ success: true });

    } catch (error) {
      console.error('Error marking payment attempted:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating transaction',
        error: error.message
      });
    }
  },

  /**
   * Verify and capture Razorpay payment
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  verifyPayment: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        transactionId,
        type,
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature
      } = req.body;

      // Generate signature for verification
      const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
      shasum.update(`${razorpayOrderId}|${razorpayPaymentId}`);
      const generatedSignature = shasum.digest('hex');

      // Verify signature
      if (generatedSignature !== razorpaySignature) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature' });
      }

      let transaction;

      // Find the transaction based on type
      if (type === 'PUJA') {
        transaction = await PujaTransaction.findById(transactionId).session(session);
      } else if (type === 'PRODUCT') {
        transaction = await ProductTransaction.findById(transactionId).session(session);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid transaction type. Must be PUJA or PRODUCT'
        });
      }

      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      // Verify Razorpay order ID
      if (transaction.paymentDetails.razorpayOrderId !== razorpayOrderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID mismatch'
        });
      }

      // Update transaction
      transaction.status = 'COMPLETED';
      transaction.paymentId = razorpayPaymentId;
      transaction.completedAt = getCurrentIST();
      transaction.isPaymentAttempted = true;
      transaction.paymentDetails = {
        ...transaction.paymentDetails,
        razorpayPaymentId,
        razorpaySignature,
        verifiedAt: getCurrentIST()
      };

      // Update user if it's a puja transaction with referral
      if (type === 'PUJA' && transaction.userId) {
        const user = await User.findById(transaction.userId).session(session);

        if (user && user.refer_user_id) {
          // Add referral bonus to referring user's wallet (if needed)
          // Implement your referral bonus logic here
        }
      }

      // Clear cart if order was from cart
      if (type === 'PRODUCT' && transaction.paymentDetails.clearCart) {
        await Cart.updateOne(
          { userId: transaction.userId },
          { $set: { items: [] } },
          { session }
        );
      }

      await transaction.save({ session });
      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        transaction: {
          id: transaction._id,
          status: transaction.status,
          amount: transaction.amount,
          orderId: transaction.orderId
        }
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Error verifying payment:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verifying payment',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  },

  /**
   * Get transaction history for a user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getTransactionHistory: async (req, res) => {
    try {
      const userId = req.user._id;
      const { type = 'PUJA', page = 1, limit = 10, status } = req.query;

      const skip = (page - 1) * limit;
      const query = {
        userId,
        isPaymentAttempted: true // Only show transactions where payment was attempted
      };

      // Add status filter if provided
      if (status) {
        query.status = status;
      }

      let transactions = [];
      let total = 0;

      if (type === 'PUJA') {
        // Get puja transactions with populated puja details
        [transactions, total] = await Promise.all([
          PujaTransaction.find(query)
            .populate('pujaId', 'title pujaImage')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
          PujaTransaction.countDocuments(query)
        ]);
      } else if (type === 'PRODUCT') {
        // Get product transactions
        [transactions, total] = await Promise.all([
          ProductTransaction.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
          ProductTransaction.countDocuments(query)
        ]);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid transaction type. Must be PUJA or PRODUCT'
        });
      }

      return res.status(200).json({
        success: true,
        transactions,
        pagination: {
          totalItems: total,
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching transaction history',
        error: error.message
      });
    }
  },

  /**
   * Get transaction details
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getTransactionDetails: async (req, res) => {
    try {
      const { id, type } = req.params;
      const userId = req.user._id;

      let transaction;

      if (type === 'PUJA') {
        transaction = await PujaTransaction.findOne({
          _id: id,
          userId,
          isPaymentAttempted: true
        })
          .populate('pujaId', 'title pujaImage aboutPuja shortDescription')
          .populate('selectedProducts.productId', 'name img');
      } else if (type === 'PRODUCT') {
        transaction = await ProductTransaction.findOne({
          _id: id,
          userId,
          isPaymentAttempted: true
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid transaction type. Must be PUJA or PRODUCT'
        });
      }

      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      return res.status(200).json({
        success: true,
        transaction
      });

    } catch (error) {
      console.error('Error fetching transaction details:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching transaction details',
        error: error.message
      });
    }
  },

  /**
   * Cancel a transaction
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  cancelTransaction: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id, type } = req.params;
      const userId = req.user._id;

      let transaction;

      if (type === 'PUJA') {
        transaction = await PujaTransaction.findOne({
          _id: id,
          userId,
          status: { $in: ['INITIATED', 'PENDING'] }
        }).session(session);
      } else if (type === 'PRODUCT') {
        transaction = await ProductTransaction.findOne({
          _id: id,
          userId,
          status: { $in: ['INITIATED', 'PENDING'] }
        }).session(session);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid transaction type. Must be PUJA or PRODUCT'
        });
      }

      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found or cannot be cancelled' });
      }

      // Update transaction
      transaction.status = 'CANCELLED';
      await transaction.save({ session });

      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: 'Transaction cancelled successfully'
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Error cancelling transaction:', error);
      return res.status(500).json({
        success: false,
        message: 'Error cancelling transaction',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  }
};

module.exports = paymentController;