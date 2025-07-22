import dotenv from 'dotenv';
import express from 'express';
import connectDB from './config/db.js';
import { createDefaultAdmin } from './utils/InitAccount.js';
import { seedUsers } from './utils/seedUsers.js';
import UserRoute from './routes/User.route.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import ProductTypeRoute from './routes/productType.routes.js';
import productRoutes from './routes/product.routes.js';
import brandRoutes from './routes/brand.routes.js';
import CartRoute from './routes/Cart.route.js';
import OrderRoute from './routes/Order.route.js';
import PaymentRoute from './routes/Payment.route.js';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerOptions from './swaggerConfig.js';
import ConsultationRoute from './routes/consultation.routes.js';
import cors from 'cors';
import ComboRoute from './routes/combo.route.js';
import shopRoutes from './routes/Shop.route.js';
import serviceRoutes from './routes/service.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import bookingRoutes from './routes/Booking.route.js';

// const { notFound, errorHandler } = require('./middleware/errorMiddleware');

        // import productRoutes from './routes/productRoutes.js';
// import userRoutes from './routes/userRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

connectDB();
createDefaultAdmin();

// // Seed dữ liệu users sau khi tạo admin
// setTimeout(async () => {
//   await seedUsers();
// }, 2000); // Đợi 2 giây để đảm bảo database đã kết nối

app.use('/api/users', UserRoute);
app.use('/api/product-types', ProductTypeRoute);
app.use('/api/products', productRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/cart', CartRoute);
app.use('/api/orders', OrderRoute);
app.use('/api/payments', PaymentRoute);
app.use('/api/consultations', ConsultationRoute);
app.use('/api/combos', ComboRoute);
app.use('/api/shops', shopRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/bookings', bookingRoutes);


const specs = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));