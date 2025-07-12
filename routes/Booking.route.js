import express from 'express';
import { 
  createBooking, 
  createBookingPayment, 
  handleBookingPaymentReturn, 
  handleBookingPaymentWebhook,
  getBookings,
  getBookingById,
  getBookingsByCustomerEmail,
  updateBookingStatus
} from '../controllers/booking.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: API đặt lịch dịch vụ
 */

// Tạo booking mới
router.post('/', createBooking);

// Tạo thanh toán cho booking
router.post('/payment', createBookingPayment);

// Xử lý return URL từ PayOS
router.get('/payment/return', handleBookingPaymentReturn);

// Xử lý webhook từ PayOS
router.post('/payment/webhook', handleBookingPaymentWebhook);

// Lấy danh sách booking
router.get('/', getBookings);

// Lấy danh sách booking theo email khách hàng
router.get('/customer/:email', getBookingsByCustomerEmail);

// Lấy chi tiết booking theo ID
router.get('/:id', getBookingById);

// Cập nhật trạng thái booking
router.put('/:id', updateBookingStatus);

export default router; 