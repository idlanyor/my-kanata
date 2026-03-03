import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import * as BillingCatalogController from '../controllers/BillingCatalogController.js';

const router = express.Router();

router.use(authenticate);

router.get('/categories', authorizePermission('catalog.read'), BillingCatalogController.listCategories);
router.post('/categories', authorizePermission('catalog.update'), BillingCatalogController.createCategory);
router.patch('/categories/:id', authorizePermission('catalog.update'), BillingCatalogController.updateCategory);
router.delete('/categories/:id', authorizePermission('catalog.update'), BillingCatalogController.deleteCategory);

router.get('/products', authorizePermission('catalog.read'), BillingCatalogController.listProducts);
router.post('/products', authorizePermission('catalog.update'), BillingCatalogController.createProduct);
router.patch('/products/:id', authorizePermission('catalog.update'), BillingCatalogController.updateProduct);
router.delete('/products/:id', authorizePermission('catalog.update'), BillingCatalogController.deleteProduct);
router.post('/seed/pterodactyl-defaults', authorizePermission('catalog.update'), BillingCatalogController.seedDefaultPterodactylPlans);

export default router;
