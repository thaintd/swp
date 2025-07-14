import asyncHandler from 'express-async-handler';
import Booking from '../models/Booking.model.js';
import Service from '../models/Service.model.js';
import Shop from '../models/Shop.model.js';
import PayOS from "@payos/node";
import dotenv from "dotenv";
import ServiceReview from '../models/ReviewSchema.js';
import Customer from '../models/Customer.model.js';
import Auth from '../models/Auth.model.js';

dotenv.config();

const payOS = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Đặt lịch dịch vụ
 *     tags: [Bookings]
 *     description: |
 *       - Khách hàng đặt lịch dịch vụ.
 *       - Shop không thể tự đặt dịch vụ của chính mình (nếu user là shop và dịch vụ thuộc shop đó sẽ trả lỗi 403).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *               - customerName
 *               - customerPhone
 *               - customerEmail
 *               - serviceType
 *               - address
 *               - bookingDate
 *               - bookingTime
 *             properties:
 *               serviceId:
 *                 type: string
 *                 description: ID dịch vụ
 *               customerName:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *               customerPhone:
 *                 type: string
 *                 example: "0987654321"
 *               customerEmail:
 *                 type: string
 *                 example: "nguyenvana@email.com"
 *               serviceType:
 *                 type: string
 *                 enum: [onsite, offsite]
 *                 example: onsite
 *               address:
 *                 type: string
 *                 example: "123 Đường ABC, Quận 1, TP.HCM"
 *               bookingDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-06-01"
 *               bookingTime:
 *                 type: string
 *                 example: "14:00"
 *               notes:
 *                 type: string
 *                 example: "Khách cần chuẩn bị phòng rộng"
 *     responses:
 *       201:
 *         description: Đặt lịch thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *                 message:
 *                   type: string
 *                   example: "Đặt lịch thành công, vui lòng thanh toán phí đặt cọc 10% để xác nhận!"
 *       403:
 *         description: Shop không thể tự đặt dịch vụ của chính mình
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Shop không thể tự đặt dịch vụ của chính mình"
 */
export const createBooking = asyncHandler(async (req, res) => {
  const {
    serviceId, customerName, customerPhone, customerEmail,
    serviceType, address, bookingDate, bookingTime, notes
  } = req.body;

  // Validate
  const service = await Service.findById(serviceId);
  if (!service) throw new Error('Không tìm thấy dịch vụ');
  const shop = await Shop.findById(service.shopId);
  if (!shop) throw new Error('Không tìm thấy shop');

  // Debug log
  if (req.user) {
    console.log('User:', req.user._id.toString(), req.user.role);
    console.log('Shop accountId:', shop.accountId.toString());
  }

  // Chặn shop tự đặt dịch vụ của mình
  if (req.user && req.user.role === 'shop' && shop.accountId && shop.accountId.toString() === req.user._id.toString()) {
    res.status(403);
    throw new Error('Shop không thể tự đặt dịch vụ của chính mình');
  }

  // Tính phí đặt cọc 10% giá dịch vụ
  const depositAmount = Math.round(service.price * 0.1);
  const totalAmount = service.price;

  const bookingData = {
    serviceId,
    shopId: shop._id,
    customerName,
    customerPhone,
    customerEmail,
    serviceType,
    address,
    bookingDate,
    bookingTime,
    notes,
    totalAmount,
    depositAmount
  };
  if (req.user) {
    bookingData.userId = req.user._id;
  }

  const booking = await Booking.create(bookingData);

  res.status(201).json({
    success: true,
    data: booking,
    message: 'Đặt lịch thành công, vui lòng thanh toán phí đặt cọc 10% để xác nhận!'
  });
});

/**
 * @swagger
 * /api/bookings/payment:
 *   post:
 *     summary: Tạo thanh toán phí đặt cọc cho booking
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *             properties:
 *               bookingId:
 *                 type: string
 *                 description: ID của booking cần thanh toán phí đặt cọc
 *     responses:
 *       200:
 *         description: Tạo thanh toán phí đặt cọc thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentUrl:
 *                       type: string
 *                       description: URL thanh toán PayOS
 *                 message:
 *                   type: string
 *                   example: "Tạo URL thanh toán phí đặt cọc thành công"
 */
export const createBookingPayment = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;

  // Validate booking
  const booking = await Booking.findById(bookingId).populate('serviceId');
  if (!booking) {
    res.status(404);
    throw new Error('Không tìm thấy booking');
  }

  if (booking.paymentStatus === 'paid') {
    res.status(400);
    throw new Error('Booking đã được thanh toán');
  }

  // Tạo orderCode ngắn gọn từ bookingId
  const shortBookingId = bookingId.slice(-6);
  const orderCode = parseInt(shortBookingId, 16) + Math.floor(Date.now() / 1000);

  const body = {
    orderCode,
    amount: Math.round(booking.depositAmount),
    description: `Thanh toán `,
    items: [
      {
        name: `Phí đặt cọc - ${booking.serviceId.name || 'Dịch vụ'}`,
        quantity: 1,
        price: Math.round(booking.depositAmount)
      }
    ],
    cancelUrl: `${process.env.FRONTEND_URL}/booking-payment?bookingId=${bookingId}`,
    returnUrl: `${process.env.FRONTEND_URL}/booking-payment-success?bookingId=${bookingId}`,
    buyerName: booking.customerName,
    buyerEmail: booking.customerEmail,
    expiredAt: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
  };

  try {
    const paymentLinkRes = await payOS.createPaymentLink(body);
    res.json({
      success: true,
      data: {
        paymentUrl: paymentLinkRes.checkoutUrl
      },
      message: "Tạo URL thanh toán phí đặt cọc thành công"
    });
  } catch (error) {
    res.status(500);
    throw new Error("Không thể tạo thanh toán PayOS: " + (error.response?.data?.desc || error.message));
  }
});

/**
 * @swagger
 * /api/bookings/payment/return:
 *   get:
 *     summary: Xử lý return URL từ PayOS cho booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Mã trạng thái từ PayOS
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Trạng thái thanh toán
 *       - in: query
 *         name: bookingId
 *         schema:
 *           type: string
 *         description: ID của booking
 *     responses:
 *       200:
 *         description: Xử lý thành công
 */
export const handleBookingPaymentReturn = asyncHandler(async (req, res) => {
  try {
    const { code, status, bookingId } = req.query;

    if (code === "00" && status === "PAID") {
      // Thanh toán thành công - cập nhật paymentStatus thành paid
      const booking = await Booking.findById(bookingId);
      if (booking) {
        booking.paymentStatus = 'paid';
        booking.status = 'confirmed'; // Tự động xác nhận booking khi thanh toán thành công
        await booking.save();
        console.log("Đã cập nhật booking:", bookingId, "paymentStatus:", booking.paymentStatus);
        return res.redirect(`${process.env.FRONTEND_URL}/booking-payment-success?success=true&bookingId=${bookingId}`);
      } else {
        console.log("Không tìm thấy booking với ID:", bookingId);
        return res.redirect(`${process.env.FRONTEND_URL}/booking-payment-success?success=false&error=BookingNotFound`);
      }
    } else {
      return res.redirect(`${process.env.FRONTEND_URL}/booking-payment-success?success=false&bookingId=${bookingId || ''}`);
    }
  } catch (error) {
    console.error('Booking payment return error:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/booking-payment-success?success=false&error=${error.message}`);
  }
});

/**
 * @swagger
 * /api/bookings/payment/webhook:
 *   post:
 *     summary: Xử lý webhook từ PayOS cho booking
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Xử lý webhook thành công
 */
export const handleBookingPaymentWebhook = asyncHandler(async (req, res) => {
  try {
    // Xác thực webhook
    const webhookData = payOS.verifyPaymentWebhookData(req.body);
    if (!webhookData) {
      res.status(400);
      throw new Error("Invalid webhook data");
    }

    // Lấy bookingId từ description
    let bookingId = null;
    if (webhookData.description && webhookData.description.includes("bookingId:")) {
      bookingId = webhookData.description.split("bookingId:")[1].split(" ")[0];
    }

    if (!bookingId) {
      res.status(400);
      throw new Error("Không xác định được booking để cập nhật");
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404);
      throw new Error("Booking không tồn tại");
    }

    // Nếu thanh toán thành công, cập nhật booking
    if (webhookData.code === "00") {
      booking.paymentStatus = 'paid';
      booking.status = 'confirmed';
      await booking.save();
      console.log("Webhook: Đã cập nhật booking:", bookingId, "paymentStatus:", booking.paymentStatus);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Booking webhook error:', error);
    res.status(500);
    throw new Error("Error processing booking webhook: " + error.message);
  }
});

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Lấy danh sách booking
 *     tags: [Bookings]
 *     description: |
 *       - Lấy danh sách booking, hỗ trợ tìm kiếm theo tên, email, số điện thoại khách hàng (query: search).
 *       - Hỗ trợ filter theo trạng thái (status, paymentStatus).
 *     parameters:
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: string
 *         description: Lọc theo shop ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, completed, cancelled]
 *         description: Lọc theo trạng thái booking
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, paid, failed]
 *         description: Lọc theo trạng thái thanh toán
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên, email, số điện thoại khách hàng
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Trang hiện tại
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng item trên mỗi trang
 *     responses:
 *       200:
 *         description: Lấy danh sách booking thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
export const getBookings = asyncHandler(async (req, res) => {
  const { shopId, status, paymentStatus, page = 1, limit = 10, search } = req.query;
  
  const filter = {};
  if (shopId) filter.shopId = shopId;
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  // Thêm search theo tên, email, phone
  if (search) {
    filter.$or = [
      { customerName: { $regex: search, $options: 'i' } },
      { customerEmail: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  
  const bookings = await Booking.find(filter)
    .populate('serviceId', 'name price')
    .populate('shopId', 'shopName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Booking.countDocuments(filter);
  const pages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: bookings,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages
    }
  });
});

/**
 * @swagger
 * /api/bookings/{id}:
 *   put:
 *     summary: Cập nhật trạng thái booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, completed, cancelled]
 *                 description: Trạng thái mới (completed chỉ được phép đúng vào ngày đặt lịch)
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, paid, failed]
 *                 description: Trạng thái thanh toán mới
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *                 message:
 *                   type: string
 *       400:
 *         description: Lỗi validation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Không thể hoàn thành booking trước/sau ngày đặt lịch"
 */
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, paymentStatus } = req.body;

  const booking = await Booking.findById(id);
  if (!booking) {
    res.status(404);
    throw new Error('Không tìm thấy booking');
  }

  // Kiểm tra nếu muốn chuyển sang completed
  if (status === 'completed') {
    const today = new Date();
    const bookingDate = new Date(booking.bookingDate);
    
    // So sánh ngày (bỏ qua giờ)
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const bookingDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
    
    if (todayDate < bookingDateOnly) {
      res.status(400);
      throw new Error('Không thể hoàn thành booking trước ngày đặt lịch');
    }
  }

  if (status) booking.status = status;
  if (paymentStatus) booking.paymentStatus = paymentStatus;

  await booking.save();

  res.json({
    success: true,
    data: booking,
    message: 'Cập nhật trạng thái booking thành công'
  });
});

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Lấy chi tiết booking theo ID
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của booking
 *     responses:
 *       200:
 *         description: Lấy chi tiết booking thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 */
export const getBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await Booking.findById(id)
    .populate('serviceId', 'name price description')
    .populate('shopId', 'shopName address phone');

  if (!booking) {
    res.status(404);
    throw new Error('Không tìm thấy booking');
  }

  res.json({
    success: true,
    data: booking
  });
});

/**
 * @swagger
 * /api/bookings/customer/{email}:
 *   get:
 *     summary: Lấy danh sách booking theo email khách hàng
 *     tags: [Bookings]
 *     description: |
 *       - Lấy danh sách booking của khách hàng theo email.
 *       - Hỗ trợ filter theo trạng thái (status, paymentStatus).
 *       - Hỗ trợ tìm kiếm theo tên, email, số điện thoại khách hàng (query: search).
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: Email của khách hàng
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, completed, cancelled]
 *         description: Lọc theo trạng thái booking
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, paid, failed]
 *         description: Lọc theo trạng thái thanh toán
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên, email, số điện thoại khách hàng
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Trang hiện tại
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng item trên mỗi trang
 *     responses:
 *       200:
 *         description: Lấy danh sách booking thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
export const getBookingsByCustomerEmail = asyncHandler(async (req, res) => {
  const { email } = req.params;
  const { page = 1, limit = 10, status, paymentStatus, search } = req.query;

  const filter = { customerEmail: email };
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  if (search) {
    filter.$or = [
      { customerName: { $regex: search, $options: 'i' } },
      { customerEmail: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  
  const bookings = await Booking.find(filter)
    .populate('serviceId', 'name price description')
    .populate('shopId', 'shopName address phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Booking.countDocuments(filter);
  const pages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: bookings,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages
    }
  });
}); 

/**
 * @swagger
 * /api/bookings/{id}/review:
 *   post:
 *     summary: Đánh giá dịch vụ đã hoàn thành booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Dịch vụ rất tốt!"
 *     responses:
 *       201:
 *         description: Đánh giá thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ServiceReview'
 *                 message:
 *                   type: string
 *                   example: "Đánh giá thành công"
 *       400:
 *         description: Lỗi validation hoặc đã đánh giá
 *       403:
 *         description: Không có quyền đánh giá
 */
export const reviewCompletedService = asyncHandler(async (req, res) => {
  const { id } = req.params; // bookingId
  const { rating, comment } = req.body;

  // Lấy booking và kiểm tra trạng thái
  const booking = await Booking.findById(id);
  if (!booking) {
    res.status(404);
    throw new Error('Không tìm thấy booking');
  }
  if (booking.status !== 'completed') {
    res.status(400);
    throw new Error('Chỉ có thể đánh giá dịch vụ đã hoàn thành');
  }

  // Xác định customerId qua userId (ưu tiên) hoặc email
  let customer = null;
  if (booking.userId) {
    customer = await Auth.findOne({ _id: booking.userId });
    console.log("customer",customer)
  }
  
  if (!customer) {
    res.status(403);
    throw new Error('Không xác định được khách hàng để đánh giá');
  }
  // Nếu có xác thực user, kiểm tra quyền
  if (req.user && req.user.role === 'customer' && req.user._id.toString() !== customer._id.toString()) {
    res.status(403);
    throw new Error('Bạn không có quyền đánh giá booking này');
  }

  // Kiểm tra đã đánh giá chưa
  const existed = await ServiceReview.findOne({ bookingId: id, customerId: customer._id });
  if (existed) {
    res.status(400);
    throw new Error('Bạn đã đánh giá booking này rồi');
  }

  // Tạo review
  const review = await ServiceReview.create({
    serviceId: booking.serviceId,
    bookingId: booking._id,
    customerId: customer._id,
    shopId: booking.shopId,
    rating,
    comment
  });

  res.status(201).json({
    success: true,
    data: review,
    message: 'Đánh giá thành công'
  });
}); 

/**
 * @swagger
 * /api/bookings/reviews/service/{serviceId}:
 *   get:
 *     summary: Lấy danh sách đánh giá cho dịch vụ (public)
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID dịch vụ
 *     responses:
 *       200:
 *         description: Danh sách đánh giá
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceReview'
 */
export const getServiceReviews = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  const reviews = await ServiceReview.find({ serviceId }).populate('customerId', 'username email');
  res.json({ success: true, data: reviews });
});

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Lấy chi tiết đánh giá
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID đánh giá
 *     responses:
 *       200:
 *         description: Chi tiết đánh giá
 */
export const getReviewById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const review = await ServiceReview.findById(id).populate('customerId', 'username email');
  if (!review) {
    res.status(404);
    throw new Error('Không tìm thấy đánh giá');
  }
  res.json({ success: true, data: review });
});

/**
 * @swagger
 * /api/reviews/{id}:
 *   put:
 *     summary: Sửa đánh giá (chỉ customer đã tạo)
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID đánh giá
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sửa đánh giá thành công
 */
export const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const review = await ServiceReview.findById(id);
  if (!review) {
    res.status(404);
    throw new Error('Không tìm thấy đánh giá');
  }
  // Chỉ cho phép customer đã tạo đánh giá sửa
  if (!req.user || (req.user.role === 'customer' && req.user._id.toString() !== review.customerId.toString())) {
    res.status(403);
    throw new Error('Bạn không có quyền sửa đánh giá này');
  }
  if (rating) review.rating = rating;
  if (comment) review.comment = comment;
  await review.save();
  res.json({ success: true, data: review, message: 'Cập nhật đánh giá thành công' });
});

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Xóa đánh giá (customer đã tạo hoặc admin)
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID đánh giá
 *     responses:
 *       200:
 *         description: Xóa đánh giá thành công
 */
export const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const review = await ServiceReview.findById(id);
  if (!review) {
    res.status(404);
    throw new Error('Không tìm thấy đánh giá');
  }
  // Chỉ cho phép customer đã tạo hoặc admin xóa
  if (!req.user || (req.user.role === 'customer' && req.user._id.toString() !== review.customerId.toString()) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Bạn không có quyền xóa đánh giá này');
  }
  await review.deleteOne();
  res.json({ success: true, message: 'Xóa đánh giá thành công' });
}); 