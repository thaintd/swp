import asyncHandler from "express-async-handler";
import dotenv from "dotenv";
import PayOS from "@payos/node";


dotenv.config();

const payOS = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

process.env.TZ = "Asia/Ho_Chi_Minh";

// Tạo URL thanh toán nâng cấp gói cho shop qua PayOS
export const createPayOSPayment = asyncHandler(async (req, res) => {
  const { amount, description, shopId } = req.body;
  const user = req.user;
  console.log(req.body)


  // Tạo orderCode ngắn gọn từ userId (chỉ lấy 6 ký tự cuối)
  const shortUserId = user._id.toString().slice(-6);
  const orderCode = parseInt(shortUserId, 16) + Math.floor(Date.now() / 1000);

  const body = {
    orderCode,
    amount: Math.round(amount),
    description: description || "Đăng ký gói Shop",
    items: [
      {
        name: "Gói Shop",
        quantity: 1,
        price: Math.round(amount)
      }
    ],
    cancelUrl: `${process.env.FRONTEND_URL}/shop-package`,
    returnUrl: `${process.env.FRONTEND_URL}/payment-success?shopId=${shopId}`,
    buyerName: user.firstName + " " + user.lastName,
    buyerEmail: user.email,
    expiredAt: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
  };

  try {
    const paymentLinkRes = await payOS.createPaymentLink(body);
    res.json({
      success: true,
      data: {
        paymentUrl: paymentLinkRes.checkoutUrl
      },
      message: "Tạo URL thanh toán thành công"
    });
  } catch (error) {
    res.status(500);
    throw new Error("Không thể tạo thanh toán PayOS: " + (error.response?.data?.desc || error.message));
  }
});

// Xử lý return URL từ PayOS
export const handlePayOSReturn = asyncHandler(async (req, res) => {
  try {
    const { code, orderCode, status, shopId } = req.query;


    if (code === "00" && status === "PAID") {
      // Thanh toán thành công - cập nhật hasActivePackage thành true
      const Shop = (await import('../models/Shop.model.js')).default;
      
      if (!shopId) {
        console.log("Không có shopId trong query");
        return res.redirect(`${process.env.FRONTEND_URL}/payment-success?success=false&error=NoShopId`);
      }
      
      const shop = await Shop.findById(shopId);
      if (shop) {
        shop.hasActivePackage = true;
        await shop.save();
        console.log("Đã cập nhật shop:", shop.shopName, "hasActivePackage:", shop.hasActivePackage);
        return res.redirect(`${process.env.FRONTEND_URL}/payment-success?success=true&shopId=${shopId}`);
      } else {
        console.log("Không tìm thấy shop với ID:", shopId);
        return res.redirect(`${process.env.FRONTEND_URL}/payment-success?success=false&error=ShopNotFound`);
      }
    } else {
      return res.redirect(`${process.env.FRONTEND_URL}/payment-success?success=false&shopId=${shopId || ''}`);
    }
  } catch (error) {
    console.error('Payment return error:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/payment-success?success=false&error=${error.message}`);
  }
});

// Xử lý webhook từ PayOS (kích hoạt gói shop)
export const handlePayOSWebhook = asyncHandler(async (req, res) => {
  try {
    // Xác thực webhook
    const webhookData = payOS.verifyPaymentWebhookData(req.body);
    if (!webhookData) {
      res.status(400);
      throw new Error("Invalid webhook data");
    }
    // Lấy userId từ orderCode (giả sử orderCode = parseInt(userId.slice(-8), 16) + timestamp)
    // Để chắc chắn, bạn nên truyền userId vào description khi tạo payment, ở đây sẽ parse lại
    // Hoặc nếu frontend truyền userId vào description, ta lấy ra
    let userId = null;
    if (webhookData.description && webhookData.description.includes("userId:")) {
      userId = webhookData.description.split("userId:")[1].split(" ")[0];
    }
    // Nếu không có userId trong description, không thể xác định shop
    if (!userId) {
      res.status(400);
      throw new Error("Không xác định được shop để kích hoạt gói");
    }
    // Tìm shop theo accountId
    const Shop = (await import('../models/Shop.model.js')).default;
    const shop = await Shop.findOne({ accountId: userId });
    if (!shop) {
      res.status(404);
      throw new Error("Shop không tồn tại");
    }
    // Nếu thanh toán thành công, cập nhật shop
    if (webhookData.code === "00") {
      shop.hasActivePackage = true;
      await shop.save();
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500);
    throw new Error("Error processing webhook: " + error.message);
  }
}); 