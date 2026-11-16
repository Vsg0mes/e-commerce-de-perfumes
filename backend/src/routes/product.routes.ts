import { Router } from 'express';
import {
  getProducts,
  getAdminProducts,
  getProductById,
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  getCategories,
  getOlfactoryFamilies,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  toggleProductActive,
  deleteProduct,
} from '../controllers/product.controller';
import { authenticate, authorizeAdmin } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

// Rotas públicas e fixas ANTES de '/:id'
router.get('/', getProducts);
router.get('/brands', getBrands);
router.get('/categories', getCategories);
router.get('/olfactory-families', getOlfactoryFamilies);

// Rotas administrativas fixas ANTES de '/:id'
router.get('/admin', authenticate, authorizeAdmin, getAdminProducts);
router.post('/brands', authenticate, authorizeAdmin, createBrand);
router.put('/brands/:id', authenticate, authorizeAdmin, updateBrand);
router.delete('/brands/:id', authenticate, authorizeAdmin, deleteBrand);
router.post('/categories', authenticate, authorizeAdmin, createCategory);
router.put('/categories/:id', authenticate, authorizeAdmin, updateCategory);
router.delete('/categories/:id', authenticate, authorizeAdmin, deleteCategory);

// Rotas com parâmetro ':id'
router.get('/:id', getProductById);
router.post('/', authenticate, authorizeAdmin, upload.single('image'), createProduct);
router.put('/:id', authenticate, authorizeAdmin, upload.single('image'), updateProduct);
router.patch('/:id/active', authenticate, authorizeAdmin, toggleProductActive);
router.delete('/:id', authenticate, authorizeAdmin, deleteProduct);

export default router;
