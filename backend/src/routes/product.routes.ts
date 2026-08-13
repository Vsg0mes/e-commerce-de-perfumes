import { Router } from 'express';
import { 
  getProducts, 
  getProductById, 
  getBrands, 
  getCategories, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from '../controllers/product.controller';
import { authenticate, authorizeAdmin } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

// Public routes
router.get('/', getProducts);
router.get('/brands', getBrands);
router.get('/categories', getCategories);
router.get('/:id', getProductById);

// Admin routes
router.post('/', authenticate, authorizeAdmin, upload.single('image'), createProduct);
router.put('/:id', authenticate, authorizeAdmin, upload.single('image'), updateProduct);
router.delete('/:id', authenticate, authorizeAdmin, deleteProduct);

export default router;
