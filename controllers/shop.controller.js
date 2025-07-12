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
 *     description: |
 *       API này cho phép đăng ký shop mới với các bước:
 *       1. Tạo tài khoản Auth với role 'shop'
 *       2. Tạo thông tin shop liên kết với tài khoản
 *       3. Gửi email xác thực cho shop
 *       4. Shop sẽ ở trạng thái 'pending' chờ admin duyệt
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
 *                 minLength: 3
 *                 maxLength: 50
 *                 example: "shop123"
 *                 description: "Tên đăng nhập của shop (phải unique)"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "shop@example.com"
 *                 description: "Email của shop (phải unique)"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "password123"
 *                 description: "Mật khẩu (tối thiểu 6 ký tự)"
 *               firstName:
 *                 type: string
 *                 example: "Nguyen"
 *                 description: "Tên của chủ shop"
 *               lastName:
 *                 type: string
 *                 example: "Van A"
 *                 description: "Họ của chủ shop"
 *               shopName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Shop Camera ABC"
 *                 description: "Tên cửa hàng"
 *               shopAddress:
 *                 type: string
 *                 minLength: 10
 *                 example: "123 Đường ABC, Quận 1, TP.HCM"
 *                 description: "Địa chỉ cửa hàng"
 *               shopDescription:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Chuyên cung cấp camera chất lượng cao, dịch vụ tận tâm"
 *                 description: "Mô tả về cửa hàng (không bắt buộc)"
 *               shopLogoUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/logo.png"
 *                 description: "URL logo cửa hàng (không bắt buộc)"
 *               businessLicenseNumber:
 *                 type: string
 *                 pattern: "^[A-Z0-9]{8,15}$"
 *                 example: "GP123456789"
 *                 description: "Số giấy phép kinh doanh (phải unique, format: GP + 9 số)"
 *               taxId:
 *                 type: string
 *                 pattern: "^[0-9]{10,13}$"
 *                 example: "0123456789"
 *                 description: "Mã số thuế (phải unique, 10-13 số)"
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 example: "contact@shop.com"
 *                 description: "Email liên hệ cửa hàng (không bắt buộc)"
 *               contactPhone:
 *                 type: string
 *                 pattern: "^[0-9]{10,11}$"
 *                 example: "0123456789"
 *                 description: "Số điện thoại liên hệ (10-11 số)"
 *               bankAccountNumber:
 *                 type: string
 *                 pattern: "^[0-9]{10,16}$"
 *                 example: "1234567890"
 *                 description: "Số tài khoản ngân hàng (10-16 số)"
 *               bankName:
 *                 type: string
 *                 example: "Vietcombank"
 *                 description: "Tên ngân hàng"
 *           examples:
 *             example1:
 *               summary: "Đăng ký shop cơ bản"
 *               value:
 *                 username: "shop123"
 *                 email: "shop@example.com"
 *                 password: "password123"
 *                 firstName: "Nguyen"
 *                 lastName: "Van A"
 *                 shopName: "Shop Camera ABC"
 *                 shopAddress: "123 Đường ABC, Quận 1, TP.HCM"
 *             example2:
 *               summary: "Đăng ký shop đầy đủ thông tin"
 *               value:
 *                 username: "shop456"
 *                 email: "shop2@example.com"
 *                 password: "password123"
 *                 firstName: "Tran"
 *                 lastName: "Thi B"
 *                 shopName: "Shop Camera XYZ"
 *                 shopAddress: "456 Đường XYZ, Quận 2, TP.HCM"
 *                 shopDescription: "Chuyên cung cấp camera chất lượng cao, dịch vụ tận tâm"
 *                 shopLogoUrl: "https://example.com/logo.png"
 *                 businessLicenseNumber: "GP987654321"
 *                 taxId: "9876543210"
 *                 contactEmail: "contact@shop.com"
 *                 contactPhone: "0987654321"
 *                 bankAccountNumber: "1234567890"
 *                 bankName: "Vietcombank"
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Shop'
 *                 message:
 *                   type: string
 *                   example: "Đăng ký shop thành công. Vui lòng kiểm tra email để xác thực tài khoản và chờ admin duyệt."
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc trùng lặp
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   examples:
 *                     duplicate_user: "Tài khoản đã tồn tại"
 *                     duplicate_license: "Số giấy phép kinh doanh đã tồn tại"
 *                     duplicate_tax: "Mã số thuế đã tồn tại"
 *                     invalid_data: "Dữ liệu không hợp lệ"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Lỗi server, vui lòng thử lại sau"
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