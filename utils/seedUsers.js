import { faker } from '@faker-js/faker';
import Auth from '../models/Auth.model.js';
import Shop from '../models/Shop.model.js';

// Danh sách họ tiếng Việt
const vietnameseLastNames = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
  'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Mai', 'Đinh', 'Lương', 'Lưu',
  'Trương', 'Tô', 'Đão', 'Chu', 'Cao', 'Vương', 'Hà', 'Tạ', 'Thái', 'Nông'
];

// Danh sách tên tiếng Việt (nam)
const vietnameseMaleNames = [
  'Văn Hưng', 'Đức Anh', 'Minh Tuấn', 'Quang Huy', 'Thanh Sơn', 'Văn Nam', 'Hoàng Long',
  'Minh Khôi', 'Đình Duy', 'Quốc Bảo', 'Thành Đạt', 'Văn Tú', 'Minh Đức', 'Quang Minh',
  'Hải Đăng', 'Văn Phúc', 'Đức Thắng', 'Minh Hải', 'Quang Dũng', 'Thanh Tùng',
  'Văn Khánh', 'Đức Mạnh', 'Minh Tâm', 'Quang Vinh', 'Thành Công', 'Văn Đức',
  'Hoàng Nam', 'Minh Hiếu', 'Đình Khoa', 'Quốc Hưng'
];

// Danh sách tên tiếng Việt (nữ)
const vietnameseFemaleNames = [
  'Thu Hà', 'Minh Châu', 'Thanh Huyền', 'Phương Anh', 'Thu Thảo', 'Minh Ngọc', 'Thanh Mai',
  'Phương Linh', 'Thu Trang', 'Minh Hương', 'Thanh Loan', 'Phương Thảo', 'Thu Hiền',
  'Minh Thư', 'Thanh Nga', 'Phương Dung', 'Thu Phương', 'Minh Trang', 'Thanh Tâm',
  'Phương Vy', 'Thu Hương', 'Minh Hạnh', 'Thanh Thúy', 'Phương Nhi', 'Thu Lan',
  'Minh Thảo', 'Thanh Vân', 'Phương Quỳnh', 'Thu Giang', 'Minh Phương'
];

// Danh sách tên shop phổ biến
const shopTypes = [
  'Studio Ảnh', 'Cửa hàng Camera', 'Phòng Chụp', 'Studio Chụp Ảnh', 'Cửa hàng Thiết bị',
  'Studio Phim', 'Trung tâm Ảnh', 'Xưởng Ảnh', 'Gallery Ảnh', 'Phòng Studio'
];

const generateVietnameseName = () => {
  const lastName = faker.helpers.arrayElement(vietnameseLastNames);
  const isMale = faker.datatype.boolean();
  const firstName = isMale 
    ? faker.helpers.arrayElement(vietnameseMaleNames)
    : faker.helpers.arrayElement(vietnameseFemaleNames);
  
  return `${lastName} ${firstName}`;
};

const generateShopName = (ownerName) => {
  const shopType = faker.helpers.arrayElement(shopTypes);
  const lastName = ownerName.split(' ')[0];
  return `${shopType} ${lastName}`;
};

export const seedUsers = async () => {
  try {
    console.log('🌱 Bắt đầu tạo dữ liệu 50 shop users...');

    // Kiểm tra xem đã có shop users chưa
    const existingShopUsersCount = await Auth.countDocuments({ role: 'shop' });
    if (existingShopUsersCount >= 50) {
      console.log('✅ Đã có đủ 50 shop users, bỏ qua việc tạo dữ liệu');
      return;
    }

    const users = [];
    const shops = [];
    const usedEmails = new Set();
    const usedUsernames = new Set();
    const usedPasswords = new Set();

    // Lấy danh sách email, username và passwordHash đã tồn tại
    const existingUsers = await Auth.find({}, { email: 1, username: 1, passwordHash: 1 });
    existingUsers.forEach(user => {
      usedEmails.add(user.email);
      usedUsernames.add(user.username);
      usedPasswords.add(user.passwordHash);
    });

    for (let i = 0; i < 50; i++) {
      let email;
      let username;
      let password;
      
      // Đảm bảo email không trùng lặp
      do {
        email = faker.internet.email().toLowerCase();
      } while (usedEmails.has(email));
      
      // Đảm bảo username không trùng lặp
      do {
        username = email.split('@')[0];
        // Nếu username trùng, tạo username mới với số random
        if (usedUsernames.has(username)) {
          username = username + faker.number.int({ min: 100, max: 999 });
        }
      } while (usedUsernames.has(username));

      // Đảm bảo password không trùng lặp
      do {
        password = `123456${(i + 1).toString().padStart(3, '0')}${faker.number.int({ min: 10, max: 99 })}`;
      } while (usedPasswords.has(password));
      
      usedEmails.add(email);
      usedUsernames.add(username);
      usedPasswords.add(password);

      const vietnameseName = generateVietnameseName();
      const [lastName, ...firstNameParts] = vietnameseName.split(' ');
      const firstName = firstNameParts.join(' ');

      // Tạo user data
      const userData = {
        username: username,
        passwordHash: password,
        email: email,
        firstName: firstName,
        lastName: lastName,
        role: 'shop', // Tất cả users đều là shop
        isEmailVerified: true, // Đã xác thực email
        verificationCode: null,
        verificationCodeExpires: null,
        emailVerificationToken: null,
        createdAt: faker.date.between({
          from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          to: new Date()
        })
      };

      users.push(userData);

      // Tạo shop data tương ứng
      const shopName = generateShopName(vietnameseName);
      const hasActivePackage = i < 25; // 25 đầu có gói, 25 sau không có gói
      
      const shopData = {
        // accountId sẽ được set sau khi tạo user
        shopName: shopName,
        shopAddress: faker.location.streetAddress() + ', ' + faker.location.city() + ', Việt Nam',
        shopDescription: `${shopName} chuyên cung cấp dịch vụ chụp ảnh và thiết bị camera chất lượng cao.`,
        contactEmail: email,
        contactPhone: faker.phone.number('09########'),
        approvalStatus: 'approved', // Tất cả đều đã được duyệt
        isActive: true, // Tất cả đều active
        hasActivePackage: hasActivePackage, // 25 đầu có gói, 25 sau không có
        createdAt: userData.createdAt
      };

      shops.push(shopData);
    }

    // Tạo users trước
    const createdUsers = await Auth.insertMany(users);
    console.log(`✅ Đã tạo thành công ${createdUsers.length} shop users`);

    // Cập nhật accountId cho shops và tạo shops
    for (let i = 0; i < shops.length; i++) {
      shops[i].accountId = createdUsers[i]._id;
    }

    const createdShops = await Shop.insertMany(shops);
    console.log(`✅ Đã tạo thành công ${createdShops.length} shops`);

    console.log('📧 Tất cả users đều đã xác thực email');
    console.log('🔑 Mật khẩu: 123456 + 3 chữ số + 2 số random (VD: 12345600123, 12345600245, ...)');
    console.log('👥 Role: shop');
    console.log('🏪 25 shops đầu: Đã đăng ký gói (hasActivePackage: true)');
    console.log('🏪 25 shops sau: Chưa đăng ký gói (hasActivePackage: false)');
    console.log('✅ Tất cả shops đều đã được duyệt và active');

  } catch (error) {
    console.error('❌ Lỗi khi tạo dữ liệu users:', error);
  }
};

export const clearUsers = async () => {
  try {
    // Xóa tất cả shops trước
    const shopResult = await Shop.deleteMany({});
    console.log(`🗑️  Đã xóa ${shopResult.deletedCount} shops`);
    
    // Xóa tất cả users trừ admin
    const userResult = await Auth.deleteMany({ role: { $ne: 'admin' } });
    console.log(`🗑️  Đã xóa ${userResult.deletedCount} users (giữ lại admin)`);
  } catch (error) {
    console.error('❌ Lỗi khi xóa users:', error);
  }
}; 