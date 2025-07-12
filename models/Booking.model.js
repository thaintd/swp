import mongoose from 'mongoose';
const { Schema } = mongoose;

const BookingSchema = new Schema({
  serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerEmail: { type: String, required: true },
  serviceType: { type: String, enum: ['onsite', 'offsite'], required: true },
  address: { type: String, required: true },
  bookingDate: { type: Date, required: true },
  bookingTime: { type: String, required: true },
  notes: { type: String },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  totalAmount: { type: Number, required: true },
  depositAmount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

BookingSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });

const Booking = mongoose.model('Booking', BookingSchema);
export default Booking;

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         serviceId:
 *           type: string
 *           description: ID của dịch vụ
 *         shopId:
 *           type: string
 *           description: ID của shop
 *         customerName:
 *           type: string
 *           description: Họ tên khách hàng
 *         customerPhone:
 *           type: string
 *           description: Số điện thoại khách hàng
 *         customerEmail:
 *           type: string
 *           description: Email khách hàng
 *         serviceType:
 *           type: string
 *           enum: [onsite, offsite]
 *           description: Loại dịch vụ (tại chỗ/tại nhà)
 *         address:
 *           type: string
 *           description: Địa chỉ thực hiện dịch vụ
 *         bookingDate:
 *           type: string
 *           format: date
 *           description: Ngày đặt lịch
 *         bookingTime:
 *           type: string
 *           description: Giờ đặt lịch
 *         notes:
 *           type: string
 *           description: Ghi chú
 *         status:
 *           type: string
 *           enum: [pending, confirmed, completed, cancelled]
 *           description: Trạng thái đặt lịch
 *         paymentStatus:
 *           type: string
 *           enum: [pending, paid, failed]
 *           description: Trạng thái thanh toán
 *         totalAmount:
 *           type: number
 *           description: Tổng tiền dịch vụ
 *         depositAmount:
 *           type: number
 *           description: Phí đặt cọc (10% tổng tiền)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */ 