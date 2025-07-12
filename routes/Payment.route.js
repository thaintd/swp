import express from "express";
import { createPayOSPayment, handlePayOSWebhook, handlePayOSReturn } from "../controllers/Payment.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/payments/payos/create:
 *   post:
 *     summary: Tạo đơn thanh toán nâng cấp Vip qua PayOS
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 1000000
 *               description:
 *                 type: string
 *                 example: "Đăng ký gói Shop"
 *               shopId:
 *                 type: string
 *                 example: "64f1234567890abcdef67890"
 *                 description: "ID của shop cần nâng cấp gói"
 *     responses:
 *       200:
 *         description: Tạo đơn thanh toán thành công
 */
router.post("/payos/create", protect, createPayOSPayment);

/**
 * @swagger
 * /api/payments/payos/return:
 *   get:
 *     summary: Xử lý return URL từ PayOS
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Mã trạng thái trả về từ PayOS
 *       - in: query
 *         name: orderCode
 *         schema:
 *           type: string
 *         required: true
 *         description: Mã đơn hàng
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         required: true
 *         description: Trạng thái thanh toán
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID của shop cần cập nhật gói
 *     responses:
 *       302:
 *         description: Chuyển hướng về trang thành công/thất bại
 */
router.get("/payos/return", handlePayOSReturn);

/**
 * @swagger
 * /api/payments/payos/webhook:
 *   post:
 *     summary: PayOS callback xác nhận thanh toán
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Đã nhận callback từ PayOS
 */
router.post("/payos/webhook", handlePayOSWebhook);

export default router;