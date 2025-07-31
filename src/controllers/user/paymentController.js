'use strict';
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { PujaTransaction, ProductTransaction, Puja, Product, Cart, Address, ChadawaTransaction, Chadawa } = require('../../models');
const { getCurrentIST } = require('../../utils/timeUtils');


const TRANSACTION_TYPES = {
  PUJA: 'PUJA',
  PRODUCT: 'PRODUCT'
};

const applyGST = (price, rate = 18) => {
  return price + Math.round(price * (rate / 100));
};

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Generate unique receipt ID
const generateReceiptId = () => {
  const timestamp = new Date().getTime();
  const randomNum = Math.floor(Math.random() * 10000);
  return `RCPT_${timestamp}_${randomNum}`;
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
      const { pujaId, packageId, selectedOfferings = [], customerDetails = [] } = req.body;
      const userId = req.user._id;

      const puja = await Puja.findById(pujaId);
      if (!puja) {
        return res.status(404).json({ success: false, message: 'Puja not found' });
      }

      console.log('puja', puja)
      if (puja.status !== 'Active') {
        return res.status(400).json({ success: false, message: 'This puja is currently unavailable' });
      }

      // 1. Find selected package by ID
      const selectedPackage = puja.packages.find(p => p._id.toString() === packageId);
      if (!selectedPackage) {
        return res.status(400).json({ success: false, message: 'Invalid package selected' });
      }

      let orderAmount = selectedPackage.price;

      // 2. Process offerings by IDs
      const offeringMap = puja.offerings.reduce((map, offering) => {
        map[offering._id.toString()] = offering;
        return map;
      }, {});

      const selectedOfferingDetails = [];
      for (const offeringId of selectedOfferings) {
        const offering = offeringMap[offeringId];
        if (!offering) {
          return res.status(400).json({ success: false, message: `Offering with ID "${offeringId}" not found` });
        }

        selectedOfferingDetails.push({
          id: offering._id,
          header: offering.header,
          price: Number(offering.price) || 0,
        });

        orderAmount += Number(offering.price) || 0;
      }

      // 3. GST and total
      // const gstAmount = Math.round(orderAmount * 0.18);
      const totalAmount = orderAmount;
      const receiptId = generateReceiptId();

      const razorpayOrder = await razorpay.orders.create({
        amount: totalAmount * 100,
        currency: 'INR',
        receipt: receiptId,
        notes: {
          userId: userId.toString(),
          pujaId,
          type: 'PUJA_TRANSACTION'
        }
      });

      // 4. Save transaction
      const transaction = new PujaTransaction({
        userId,
        totalAmount,
        orderAmount: selectedPackage.price,
        // gstAmount,
        receiptId,
        pujaName: puja.title,
        orderId: razorpayOrder.id,
        paymentId: '',
        status: 'INITIATED',
        discountAmount: 0,
        couponCode: '',
        pujaId,
        pujaDate: puja.pujaDate,
        location: puja.location,
        customerDetails,
        initiatedAt: getCurrentIST(),
        isPaymentAttempted: false,
        package: {
          id: selectedPackage._id,
          type: selectedPackage.type,
          price: selectedPackage.price,
          members: selectedPackage.members
        },
        selectedOfferings: selectedOfferingDetails
      });

      await transaction.save({ session });
      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        order: razorpayOrder.id,
        transactionId: transaction._id,
        key: process.env.RAZORPAY_KEY_ID,
        orderSummary: {
          orderAmount: selectedPackage.price,
          totalAmount
        }
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
      const { products, addressId, fromCart = false } = req.body;
      const userId = req.user._id;

      // Validate address
      const address = await Address.findById(addressId);
      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Shipping address not found'
        });
      }

      let productItems = [];
      let orderAmount = 0; // Base price without GST
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
          const itemGst = Math.round(basePrice * 0.18);
          const itemSaved = (product.displayedPrice - product.actualPrice) * quantity;
          const discountPrice = (product.displayedPrice - product.actualPrice) * quantity;
          // console.log('product', product)
          orderAmount += basePrice;
          savedAmount += itemSaved > 0 ? itemSaved : 0;

          productItems.push({
            productId: product._id,
            name: product.name,
            quantity: quantity,
            unitPrice: product.actualPrice,
            displayedPrice: product.displayedPrice,
            basePrice: basePrice,
            gstAmount: itemGst,
            totalPrice: basePrice + itemGst,
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
          const itemGst = Math.round(basePrice * 0.18);
          const itemSaved = (product.displayedPrice - product.actualPrice) * item.quantity;

          orderAmount += basePrice;
          savedAmount += itemSaved > 0 ? itemSaved : 0;

          productItems.push({
            productId: product._id,
            name: product.name,
            quantity: item.quantity,
            unitPrice: product.actualPrice,
            displayedPrice: product.displayedPrice,
            basePrice: basePrice,
            gstAmount: itemGst,
            totalPrice: basePrice + itemGst,
          });
        }
      }

      // Calculate GST (18% of base amount)
      const gstAmount = Math.round(orderAmount * 0.18);

      // Calculate shipping charges (if any)
      const shippingCharges = orderAmount < 500 ? 40 : 0; // Free shipping over ₹500

      // Calculate total amount (base + GST + shipping)
      const totalAmount = orderAmount + gstAmount + shippingCharges;

      // Create Razorpay order
      const receiptId = generateReceiptId();
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100), // Convert to paisa
        currency: 'INR',
        receipt: receiptId,
        notes: {
          userId: userId.toString(),
          type: 'PRODUCT_TRANSACTION'
        }
      });

      // Format shipping details from address model
      const shippingDetails = {
        name: address.name,
        mobileNumber: address.mobileNumber,
        alternateNumber: address.alternateNumber || '',
        address: {
          address: address.address,
          landmark: address.landmark || '',
          city: address.city,
          state: address.state,
          country: address.country || 'India',
          pincode: address.pincode
        }
      };

      // Create transaction record
      const transaction = new ProductTransaction({
        userId,
        totalAmount,
        orderAmount,
        gstAmount,
        shippingCharges,
        receiptId,
        orderId: razorpayOrder.id,
        paymentId: '',
        status: 'INITIATED',
        discountAmount: 0,
        couponCode: '',
        products: productItems,
        shippingDetails,
        initiatedAt: getCurrentIST(),
        isPaymentAttempted: false
      });

      // Store cart reference for clearing after successful payment
      if (fromCart) {
        transaction._fromCart = true; // Temporary property, not saved to DB
      }

      await transaction.save({ session });
      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: "Order Created Successfully",
        order: razorpayOrder,
        transactionId: transaction._id,
        key: process.env.RAZORPAY_KEY_ID,
        orderSummary: {
          orderAmount,
          gstAmount,
          shippingCharges,
          totalAmount,
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
      if (transaction.orderId !== razorpayOrderId) {
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

      // Clear cart if order was from cart for product transactions
      if (type === 'PRODUCT' && transaction._fromCart) {
        await Cart.updateOne(
          { userId: transaction.userId },
          { $set: { items: [] } }
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
          totalAmount: transaction.totalAmount,
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

   handlePujaWebhook: async (req, res) => {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers['x-razorpay-signature'];
      const payload = req.body;

      // 1. Verify the signature
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error('❌ Invalid webhook signature');
        return res.status(400).json({ success: false, message: 'Invalid signature' });
      }

      // 2. Extract event and order/payment info
      const event = payload.event;
      const paymentEntity = payload.payload?.payment?.entity;
      const paymentId = paymentEntity?.id;
      const orderId = paymentEntity?.order_id;

      if (!orderId) {
        return res.status(400).json({ success: false, message: 'Order ID missing from webhook payload' });
      }

      // 3. Find Puja transaction
      const transaction = await PujaTransaction.findOne({ orderId });
      if (!transaction) {
        console.error(`❌ PujaTransaction not found for orderId: ${orderId}`);
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      // 4. Process based on event type
      switch (event) {
        case 'payment.authorized':
          transaction.status = 'PENDING';
          transaction.paymentId = paymentId;
          transaction.isPaymentAttempted = true;
          break;

        case 'payment.captured':
          transaction.status = 'COMPLETED';
          transaction.paymentId = paymentId;
          transaction.completedAt = getCurrentIST();
          transaction.isPaymentAttempted = true;
          break;

        case 'payment.failed':
          transaction.status = 'FAILED';
          transaction.paymentId = paymentId;
          transaction.isPaymentAttempted = true;
          break;

        case 'refund.created':
          transaction.status = 'REFUNDED';
          break;

        default:
          console.log(`Unhandled event type: ${event}`);
          break;
      }

      // 5. Save updated transaction
      await transaction.save();

      return res.status(200).json({ success: true });

    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).json({ success: false, message: 'Webhook processing failed', error: error.message });
    }
  },

  /**
  * Get transaction details
  * @param {Object} req - Request object
  * @param {Object} res - Response object
  */
  getPujaTransactionHistory: async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10, search = '', status } = req.query;

      const skip = (page - 1) * limit;

      const query = {
            userId,
            isPaymentAttempted: true, // Only show transactions where payment was attempted
            status: { $ne: 'INITIATED' } // Don't show transactions that were just initiated
          };

      if (search) {
        query.pujaName = { $regex: search, $options: 'i' };
      }

      if (status) {
        query.status = status;
      }

      const [transactions, total] = await Promise.all([
        PujaTransaction.find(query)
          .select('pujaName pujaId pujaStatus pujaDate status rating created_at')
          .populate('pujaId', 'title pujaImage')
          .sort({ created_at: -1 })
          .skip(parseInt(skip))
          .limit(parseInt(limit))
          .lean(),

        PujaTransaction.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        transactions,
        pagination: {
          totalItems: total,
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      });
    } catch (error) {
      console.error('Error fetching puja transaction history:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching transaction history',
        error: error.message,
      });
    }
  },

  getPujaTransactionDetails: async (req, res) => {
    try {
      const { transactionId } = req.params;
      const userId = req.user._id;

      const transaction = await PujaTransaction.findOne({ _id: transactionId, userId })
        .populate('pujaId', 'title pujaImage slug')
        .lean();

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found',
        });
      }

      return res.status(200).json({
        success: true,
        transaction,
      });
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching transaction details',
        error: error.message,
      });
    }
  },


  /**
  * Get transaction details
  * @param {Object} req - Request object
  * @param {Object} res - Response object
  */
  getProductDetailsFromOrder: async (req, res) => {
    try {
      const userId = req.user._id;
      const { transactionId, productInstanceId } = req.params;

      // Find the transaction by ID and user
      const transaction = await ProductTransaction.findById(transactionId)
        .populate('products.productId', 'img title');

      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const targetItem = transaction.products.find(p => p._id.toString() === productInstanceId);
      console.log('targetItem', targetItem)

      if (!targetItem) {
        return res.status(404).json({ success: false, message: 'Product not found in this order' });
      }

      const mainProduct = {
        _id: targetItem._id,
        productId: targetItem.productId._id,
        name: targetItem.name,
        img: targetItem.productId?.img[0] || '',
        unitPrice: targetItem.unitPrice,
        displayedPrice: targetItem.displayedPrice,
        // gstAmount: targetItem.gstAmount,
        gstAmount: targetItem.gstAmount / targetItem.quantity,
        totalPrice: applyGST(targetItem.unitPrice),
        quantity: 1,
        estimatedDelivery: targetItem.estimatedDelivery,
        deliveryDate: targetItem.deliveryDate,
        deliveryStatus: targetItem.deliveryStatus,
      };

      const otherItemsInOrder = [];

      // Add remaining copies of same product (split per quantity)
      for (let i = 1; i < targetItem.quantity; i++) {
        otherItemsInOrder.push({
          // _id: `${targetItem._id}_copy_${i}`, // virtual ID
          _id: targetItem._id,
          productId: targetItem.productId._id,
          name: targetItem.name,
          img: targetItem.productId?.img[0] || '',
          estimatedDelivery: targetItem.estimatedDelivery,
          deliveryDate: targetItem.deliveryDate,
          deliveryStatus: targetItem.deliveryStatus,
          // unitPrice: targetItem.unitPrice,
          // displayedPrice: targetItem.displayedPrice,
          // gstAmount: targetItem.gstAmount,
          // totalPrice: applyGST(targetItem.unitPrice),
          // quantity: 1
        });
      }

      // Add other products from this order
      for (const item of transaction.products) {
        if (item._id.toString() === productInstanceId) continue;

        for (let i = 0; i < item.quantity; i++) {
          otherItemsInOrder.push({
            _id: targetItem._id,
            productId: item.productId._id,
            name: item.name,
            img: item.productId?.img[0] || '',
            estimatedDelivery: targetItem.estimatedDelivery,
            deliveryDate: targetItem.deliveryDate,
            deliveryStatus: targetItem.deliveryStatus,
            // unitPrice: item.unitPrice,
            // displayedPrice: targetItem.displayedPrice,
            // gstAmount: targetItem.gstAmount,
            // totalPrice: applyGST(item.unitPrice),
            // quantity: 1
          });
        }
      }

      return res.status(200).json({
        success: true,
        mainProduct,
        otherItemsInOrder,
        orderInfo: {
          transactionId: transaction._id,
          orderId: transaction.orderId,
          orderDate: transaction.created_at,
          status: transaction.status,
          shippingDetails: transaction.shippingDetails,
          shippingCharges: transaction.shippingCharges,
        }
      });

    } catch (error) {
      console.error('Error in getProductDetailsFromOrder:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  getPujaDetailsFromOrder: async (req, res) => {
    try {
      const { pujaID } = req.params;
      const userId = req.user._id;


      const transaction = await PujaTransaction.findById(pujaID)
        .populate('pujaId', 'title pujaImage aboutPuja shortDescription customerDetails')

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

      // If this is a Razorpay order and payment was attempted, try to cancel it in Razorpay
      if (transaction.orderId && transaction.isPaymentAttempted) {
        try {
          await razorpay.orders.edit(transaction.orderId, {
            notes: {
              cancelReason: 'Cancelled by user',
              cancelledAt: getCurrentIST()
            }
          });
        } catch (error) {
          console.error('Error updating Razorpay order:', error);
          // Continue even if Razorpay update fails
        }
      }

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
  },

  /**
  * Refund a transaction
  * @param {Object} req - Request object
  * @param {Object} res - Response object
  */
  refundTransaction: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id, type } = req.params;
      const { reason } = req.body;
      const userId = req.user._id;

      // Admin validation (assuming admin middleware is applied to this route)
      if (!req.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can process refunds'
        });
      }

      let transaction;

      if (type === 'PUJA') {
        transaction = await PujaTransaction.findOne({
          _id: id,
          status: 'COMPLETED' // Only completed transactions can be refunded
        }).session(session);
      } else if (type === 'PRODUCT') {
        transaction = await ProductTransaction.findOne({
          _id: id,
          status: 'COMPLETED' // Only completed transactions can be refunded
        }).session(session);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid transaction type. Must be PUJA or PRODUCT'
        });
      }

      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found or cannot be refunded' });
      }

      if (!transaction.paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot refund transaction without payment ID'
        });
      }

      // Create refund in Razorpay
      const refund = await razorpay.payments.refund(transaction.paymentId, {
        notes: {
          reason: reason || 'Refunded by admin',
          transactionId: transaction._id.toString()
        }
      });

      // Update transaction
      transaction.status = 'REFUNDED';
      transaction.refundId = refund.id;
      transaction.refundedAt = getCurrentIST();
      transaction.refundReason = reason || 'Refunded by admin';

      await transaction.save({ session });
      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: 'Transaction refunded successfully',
        refundId: refund.id
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Error refunding transaction:', error);
      return res.status(500).json({
        success: false,
        message: 'Error refunding transaction',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  },

  /**
  * Check payment status
  * @param {Object} req - Request object
  * @param {Object} res - Response object
  */
  checkPaymentStatus: async (req, res) => {
    try {
      const { transactionId, type } = req.params;
      const userId = req.user._id;

      let transaction;

      if (type === 'PUJA') {
        transaction = await PujaTransaction.findOne({
          _id: transactionId,
          userId
        });
      } else if (type === 'PRODUCT') {
        transaction = await ProductTransaction.findOne({
          _id: transactionId,
          userId
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

      // If the transaction has a Razorpay order ID, fetch the latest status
      if (transaction.orderId && transaction.status !== 'COMPLETED') {
        try {
          const razorpayOrder = await razorpay.orders.fetch(transaction.orderId);

          // If order is paid but our transaction isn't marked as completed
          if (razorpayOrder.status === 'paid' && transaction.status !== 'COMPLETED') {
            // Fetch payment details to get the payment ID
            const payments = await razorpay.orders.fetchPayments(transaction.orderId);
            if (payments.items && payments.items.length > 0) {
              const payment = payments.items[0]; // Get the first payment

              // Update transaction
              transaction.status = 'COMPLETED';
              transaction.paymentId = payment.id;
              transaction.completedAt = getCurrentIST();
              transaction.isPaymentAttempted = true;
              await transaction.save();
            }
          }
        } catch (error) {
          console.error('Error fetching Razorpay order:', error);
          // Continue even if Razorpay fetch fails
        }
      }

      return res.status(200).json({
        success: true,
        transaction: {
          id: transaction._id,
          status: transaction.status,
          totalAmount: transaction.totalAmount,
          orderId: transaction.orderId,
          paymentId: transaction.paymentId,
          createdAt: transaction.created_at,
          updatedAt: transaction.updated_at
        }
      });

    } catch (error) {
      console.error('Error checking payment status:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking payment status',
        error: error.message
      });
    }
  },

  /**
  * Handle payment failures
  * @param {Object} req - Request object
  * @param {Object} res - Response object
  */
  handlePaymentFailure: async (req, res) => {
    try {
      const { transactionId, type, error } = req.body;
      const userId = req.user._id;

      let transaction;

      if (type === 'PUJA') {
        transaction = await PujaTransaction.findOne({
          _id: transactionId,
          userId
        });
      } else if (type === 'PRODUCT') {
        transaction = await ProductTransaction.findOne({
          _id: transactionId,
          userId
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

      // Mark transaction as failed
      if (transaction.status !== 'COMPLETED') {
        transaction.status = 'FAILED';
        transaction.isPaymentAttempted = true; // It was attempted but failed
        transaction.failureReason = error?.description || 'Payment failed';
        transaction.failureCode = error?.code || 'UNKNOWN';
        transaction.failureSource = error?.source || 'user';
        transaction.failedAt = getCurrentIST();

        await transaction.save();
      }

      return res.status(200).json({
        success: true,
        message: 'Payment failure recorded',
        transaction: {
          id: transaction._id,
          status: transaction.status
        }
      });

    } catch (error) {
      console.error('Error handling payment failure:', error);
      return res.status(500).json({
        success: false,
        message: 'Error handling payment failure',
        error: error.message
      });
    }
  },

  /**
  * Get payment stats for admin dashboard
  * @param {Object} req - Request object
  * @param {Object} res - Response object
  */
  getPaymentStats: async (req, res) => {
    try {
      // Admin validation
      if (!req.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }

      const { startDate, endDate } = req.query;

      // Default to last 30 days if no dates provided
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Set time to start and end of day
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      // Query for completed transactions within date range
      const query = {
        status: 'COMPLETED',
        completedAt: { $gte: start, $lte: end }
      };

      // Get stats for both transaction types
      const [pujaStats, productStats] = await Promise.all([
        PujaTransaction.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' },
              orderAmount: { $sum: '$orderAmount' },
              gstAmount: { $sum: '$gstAmount' }
            }
          }
        ]),
        ProductTransaction.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' },
              orderAmount: { $sum: '$orderAmount' },
              gstAmount: { $sum: '$gstAmount' },
              shippingCharges: { $sum: '$shippingCharges' }
            }
          }
        ])
      ]);

      // Calculate statistics
      const pujaTotal = pujaStats.length > 0 ? pujaStats[0] : { count: 0, totalAmount: 0, orderAmount: 0, gstAmount: 0 };
      const productTotal = productStats.length > 0 ? productStats[0] : { count: 0, totalAmount: 0, orderAmount: 0, gstAmount: 0, shippingCharges: 0 };

      // Get daily statistics for chart
      const dailyStats = await Promise.all([
        PujaTransaction.aggregate([
          {
            $match: {
              ...query
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
              count: { $sum: 1 },
              amount: { $sum: '$totalAmount' }
            }
          },
          { $sort: { _id: 1 } }
        ]),
        ProductTransaction.aggregate([
          {
            $match: {
              ...query
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
              count: { $sum: 1 },
              amount: { $sum: '$totalAmount' }
            }
          },
          { $sort: { _id: 1 } }
        ])
      ]);

      return res.status(200).json({
        success: true,
        stats: {
          puja: {
            count: pujaTotal.count,
            totalAmount: pujaTotal.totalAmount,
            orderAmount: pujaTotal.orderAmount,
            gstAmount: pujaTotal.gstAmount
          },
          product: {
            count: productTotal.count,
            totalAmount: productTotal.totalAmount,
            orderAmount: productTotal.orderAmount,
            gstAmount: productTotal.gstAmount,
            shippingCharges: productTotal.shippingCharges
          },
          total: {
            count: pujaTotal.count + productTotal.count,
            totalAmount: pujaTotal.totalAmount + productTotal.totalAmount
          },
          dailyStats: {
            puja: dailyStats[0],
            product: dailyStats[1]
          }
        }
      });

    } catch (error) {
      console.error('Error getting payment stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Error getting payment statistics',
        error: error.message
      });
    }
  },

  /**
   * Create a new chadawa payment order
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  createChadawaOrder: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { chadawaId, offeringId, customerDetails = {} } = req.body;
      const userId = req.user._id;
  
      const chadawa = await Chadawa.findById(chadawaId);
      if (!chadawa) {
        return res.status(404).json({ success: false, message: 'Chadawa not found' });
      }

      if (chadawa.status !== 'Active') {
        return res.status(400).json({ success: false, message: 'This chadawa is currently unavailable' });
      }
  
      // Find selected offering by ID
      const selectedOffering = chadawa.offerings.find(o => o._id.toString() === offeringId);
      if (!selectedOffering) {
        return res.status(400).json({ success: false, message: 'Invalid offering selected' });
      }
  
      let orderAmount = selectedOffering.price;
      const totalAmount = orderAmount;
      const receiptId = generateReceiptId();
  
      const razorpayOrder = await razorpay.orders.create({
        amount: totalAmount * 100,
        currency: 'INR',
        receipt: receiptId,
        notes: {
          userId: userId.toString(),
          chadawaId,
          type: 'CHADAWA_TRANSACTION'
        }
      });
  
      // Save transaction
      const transaction = new ChadawaTransaction({
        userId,
        totalAmount,
        orderAmount: selectedOffering.price,
        receiptId,
        chadawaName: chadawa.title,
        orderId: razorpayOrder.id,
        paymentId: '',
        status: 'INITIATED',
        discountAmount: 0,
        couponCode: '',
        chadawaId,
        chadawaDate: chadawa.chadawaDate,
        location: chadawa.location,
        customerDetails,
        initiatedAt: getCurrentIST(),
        isPaymentAttempted: false,
        selectedOffering: {
          id: selectedOffering._id,
          header: selectedOffering.header,
          price: Number(selectedOffering.price) || 0,
          image: selectedOffering.image || ''
        }
      });
  
      await transaction.save({ session });
      await session.commitTransaction();
  
      return res.status(200).json({
        success: true,
        order: razorpayOrder.id,
        transactionId: transaction._id,
        key: process.env.RAZORPAY_KEY_ID,
        orderSummary: {
          orderAmount: selectedOffering.price,
          totalAmount
        }
      });
  
    } catch (error) {
      await session.abortTransaction();
      console.error('Error creating chadawa order:', error);
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
   * Process chadawa payment webhook from Razorpay
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  handleChadawaWebhook: async (req, res) => {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers['x-razorpay-signature'];
      const payload = req.body;
  
      // 1. Verify the signature
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
  
      if (expectedSignature !== signature) {
        console.error('❌ Invalid webhook signature');
        return res.status(400).json({ success: false, message: 'Invalid signature' });
      }
  
      // 2. Extract event and order/payment info
      const event = payload.event;
      const paymentEntity = payload.payload?.payment?.entity;
      const paymentId = paymentEntity?.id;
      const orderId = paymentEntity?.order_id;
  
      if (!orderId) {
        return res.status(400).json({ success: false, message: 'Order ID missing from webhook payload' });
      }
  
      // 3. Find Chadawa transaction
      const transaction = await ChadawaTransaction.findOne({ orderId });
      if (!transaction) {
        console.error(`❌ ChadawaTransaction not found for orderId: ${orderId}`);
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }
  
      // 4. Process based on event type
      switch (event) {
        case 'payment.authorized':
          transaction.status = 'PENDING';
          transaction.paymentId = paymentId;
          transaction.isPaymentAttempted = true;
          break;
  
        case 'payment.captured':
          transaction.status = 'COMPLETED';
          transaction.paymentId = paymentId;
          transaction.completedAt = getCurrentIST();
          transaction.isPaymentAttempted = true;
          break;
  
        case 'payment.failed':
          transaction.status = 'FAILED';
          transaction.paymentId = paymentId;
          transaction.isPaymentAttempted = true;
          break;
  
        case 'refund.created':
          transaction.status = 'REFUNDED';
          break;
  
        default:
          console.log(`Unhandled event type: ${event}`);
          break;
      }
  
      // 5. Save updated transaction
      await transaction.save();
  
      return res.status(200).json({ success: true });
  
    } catch (error) {
      console.error('Chadawa Webhook error:', error);
      return res.status(500).json({ success: false, message: 'Webhook processing failed', error: error.message });
    }
  },
  
  /**
   * Get chadawa transaction history
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getChadawaTransactionHistory: async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10, search = '', status } = req.query;
  
      const skip = (page - 1) * limit;
  
      const query = {
        userId,
        // isPaymentAttempted: true, // Only show transactions where payment was attempted
        // status: { $ne: 'INITIATED' } // Don't show transactions that were just initiated
      };
  
      if (search) {
        query.chadawaName = { $regex: search, $options: 'i' };
      }
  
      if (status) {
        query.status = status;
      }
  
      const [transactions, total] = await Promise.all([
        ChadawaTransaction.find(query)
          .select('chadawaName chadawaId chadawaStatus chadawaDate status rating created_at')
          .populate('chadawaId', 'title chadawaImage')
          .sort({ created_at: -1 })
          .skip(parseInt(skip))
          .limit(parseInt(limit))
          .lean(),
  
        ChadawaTransaction.countDocuments(query),
      ]);
  
      return res.status(200).json({
        success: true,
        transactions,
        pagination: {
          totalItems: total,
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      });
    } catch (error) {
      console.error('Error fetching chadawa transaction history:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching transaction history',
        error: error.message,
      });
    }
  },
  
  /**
   * Get chadawa transaction details
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getChadawaTransactionDetails: async (req, res) => {
    try {
      const { transactionId } = req.params;
      const userId = req.user._id;
  
      const transaction = await ChadawaTransaction.findOne({ _id: transactionId, userId })
        .populate('chadawaId', 'title chadawaImage slug')
        .lean();
  
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found',
        });
      }
  
      return res.status(200).json({
        success: true,
        transaction,
      });
    } catch (error) {
      console.error('Error fetching chadawa transaction details:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching transaction details',
        error: error.message,
      });
    }
  },
  
  /**
   * Get chadawa details from order
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getChadawaDetailsFromOrder: async (req, res) => {
    try {
      const { chadawaID } = req.params;
      const userId = req.user._id;
  
      const transaction = await ChadawaTransaction.findById(chadawaID)
        .populate('chadawaId', 'title chadawaImage aboutChadawa shortDescription customerDetails')
  
      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }
  
      return res.status(200).json({
        success: true,
        transaction
      });
  
    } catch (error) {
      console.error('Error fetching chadawa transaction details:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching transaction details',
        error: error.message
      });
    }
  }
};

module.exports = paymentController