import express from 'express';
import {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
  getServicesByShop,
} from '../controllers/service.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes for services (anyone can view services)
router.route('/').get(getServices);
router.route('/:id').get(getServiceById);
router.route('/shop/:shopId').get(getServicesByShop); 

// Protected routes (require authentication)
// Shop-only routes
router.route('/').post(protect, createService); 
router.route('/:id').put(protect, updateService); 
router.route('/:id').delete(protect, deleteService); 

export default router; 