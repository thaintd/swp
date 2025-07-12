import asyncHandler from 'express-async-handler';
import Shop from '../models/Shop.model.js';
import Auth from '../models/Auth.model.js';
import transporter from '../utils/MailserVices.js';

/**
 * @swagger
 * tags:
 *   name: Shops
 *   description: API để quản lý đăng ký và duyệt shop
 */

/**
 * @swagger
 * /api/shops/register:
 *   post:
 *     summary: Đăng ký shop mới (tạo luôn tài khoản shop)
 *     tags: [Shops]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - shopName
 *               - shopAddress
 *             properties:
 *               username:
 *                 type: string
 *                 example: "shop123"
 *               email:
 *                 type: string
 *                 example: "shop@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *               firstName:
 *                 type: string
 *                 example: "Nguyen"
 *               lastName:
 *                 type: string
 *                 example: "Van A"
 *               shopName:
 *                 type: string
 *                 example: "Shop Camera ABC"
 *               shopAddress:
 *                 type: string
 *                 example: "123 Đường ABC, Quận 1, TP.HCM"
 *               shopDescription:
 *                 type: string
 *                 example: "Chuyên cung cấp camera chất lượng cao"
 *               shopLogoUrl:
 *                 type: string
 *                 example: "https://example.com/logo.png"
 *               businessLicenseNumber:
 *                 type: string
 *                 example: "GP123456789"
 *                 description: "Số giấy phép kinh doanh (phải unique, không được trùng)"
 *               taxId:
 *                 type: string
 *                 example: "0123456789"
 *                 description: "Mã số thuế (phải unique, không được trùng)"
 *               contactEmail:
 *                 type: string
 *                 example: "contact@shop.com"
 *               contactPhone:
 *                 type: string
 *                 example: "0123456789"
 *               bankAccountNumber:
 *                 type: string
 *                 example: "1234567890"
 *               bankName:
 *                 type: string
 *                 example: "Vietcombank"
 *     responses:
 *       201:
 *         description: Đăng ký shop thành công, chờ admin duyệt
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Shop'
 *                 message:
 *                   type: string
 *       400:
 *         description: Tài khoản đã tồn tại, số giấy phép/mã số thuế trùng, hoặc dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Tài khoản đã tồn tại" hoặc "Số giấy phép kinh doanh đã tồn tại"
 */

/**
 * @swagger
 * /api/shops/pending:
 *   get:
 *     summary: Lấy danh sách shop chờ duyệt (admin)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách shop chờ duyệt
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
 *                     $ref: '#/components/schemas/Shop'
 */

/**
 * @swagger
 * /api/shops/{shopId}/approve:
 *   patch:
 *     summary: Duyệt shop (admin)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của shop
 *     responses:
 *       200:
 *         description: Shop đã được duyệt
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Shop'
 *       404:
 *         description: Không tìm thấy shop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/shops/{shopId}/reject:
 *   patch:
 *     summary: Từ chối shop (admin)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của shop
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Lý do từ chối
 *     responses:
 *       200:
 *         description: Shop đã bị từ chối
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Shop'
 *       404:
 *         description: Không tìm thấy shop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/shops/{shopId}:
 *   get:
 *     summary: Lấy chi tiết shop
 *     tags: [Shops]
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của shop
 *     responses:
 *       200:
 *         description: Thông tin chi tiết shop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Shop'
 *       404:
 *         description: Không tìm thấy shop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

// Đăng ký shop mới
const registerShop = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName, shopName, shopAddress, shopDescription, shopLogoUrl, businessLicenseNumber, taxId, contactEmail, contactPhone, bankAccountNumber, bankName } = req.body;

  // Kiểm tra tài khoản đã tồn tại chưa
  const userExists = await Auth.findOne({ $or: [{ username }, { email }] });
  if (userExists) {
    res.status(400);
    throw new Error('Tài khoản đã tồn tại');
  }

  // Kiểm tra businessLicenseNumber đã tồn tại chưa (nếu có)
  if (businessLicenseNumber) {
    const existingLicense = await Shop.findOne({ businessLicenseNumber });
    if (existingLicense) {
      res.status(400);
      throw new Error('Số giấy phép kinh doanh đã tồn tại');
    }
  }

  // Kiểm tra taxId đã tồn tại chưa (nếu có)
  if (taxId) {
    const existingTaxId = await Shop.findOne({ taxId });
    if (existingTaxId) {
      res.status(400);
      throw new Error('Mã số thuế đã tồn tại');
    }
  }

  // Tạo token xác thực email
  const emailVerificationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

  // Tạo tài khoản shop mới
  const account = await Auth.create({
    username,
    email,
    passwordHash: password,
    firstName,
    lastName,
    role: 'shop',
    isEmailVerified: false,
    emailVerificationToken
  });

  // Tạo shop liên kết với account vừa tạo
  const shop = await Shop.create({
    accountId: account._id,
    shopName,
    shopAddress,
    shopDescription,
    shopLogoUrl,
    businessLicenseNumber,
    taxId,
    contactEmail,
    contactPhone,
    bankAccountNumber,
    bankName,
    approvalStatus: 'pending',
    isActive: false
  });

  // Gửi email xác thực
  const verificationUrl = `http://localhost:5173/verify-email/${emailVerificationToken}`;

  const mailOptions = {
    to: email,
    subject: "Xác thực địa chỉ email shop của bạn",
    text: `Chào ${username},\n\nVui lòng xác thực địa chỉ email của shop bằng cách nhấp vào liên kết này:\n${verificationUrl}\n\n` + `Liên kết này sẽ hết hạn sau 1 giờ.`,
    html: `<p>Chào ${username},</p><p>Vui lòng xác thực địa chỉ email của shop bằng cách nhấp vào liên kết này:</p><p><a href="${verificationUrl}">Xác thực Email Shop</a></p><p>Liên kết này sẽ hết hạn sau 1 giờ.</p>`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Lỗi gửi email xác thực shop:", error);
    } else {
      console.log("Email xác thực shop đã gửi:", info.response);
    }
  });

  res.status(201).json({ 
    success: true, 
    data: shop, 
    message: 'Đăng ký shop thành công. Vui lòng kiểm tra email để xác thực tài khoản và chờ admin duyệt.' 
  });
});

// Lấy danh sách shop chờ duyệt
const getPendingShops = asyncHandler(async (req, res) => {
  const shops = await Shop.find({ approvalStatus: 'pending' }).populate('accountId', 'username email');
  res.json({ success: true, data: shops });
});

// Admin duyệt shop
const approveShop = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const shop = await Shop.findById(shopId);
  if (!shop) {
    res.status(404);
    throw new Error('Không tìm thấy shop');
  }
  shop.approvalStatus = 'approved';
  shop.isActive = true;
  await shop.save();
  res.json({ success: true, message: 'Shop đã được duyệt', data: shop });
});

// Admin từ chối shop
const rejectShop = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const { reason } = req.body;
  const shop = await Shop.findById(shopId);
  if (!shop) {
    res.status(404);
    throw new Error('Không tìm thấy shop');
  }
  shop.approvalStatus = 'rejected';
  shop.rejectionReason = reason || '';
  shop.isActive = false;
  await shop.save();
  res.json({ success: true, message: 'Shop đã bị từ chối', data: shop });
});

// Lấy chi tiết shop
const getShopDetail = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const shop = await Shop.findById(shopId).populate('accountId', 'username email');
  if (!shop) {
    res.status(404);
    throw new Error('Không tìm thấy shop');
  }
  res.json({ success: true, data: shop });
});

export { registerShop, getPendingShops, approveShop, rejectShop, getShopDetail }; 