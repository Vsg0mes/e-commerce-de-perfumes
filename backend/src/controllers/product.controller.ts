import { Request, Response } from 'express';
import prisma from '../prisma';
import { z } from 'zod';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { category, brand, gender, olfactoryFamily, search, minPrice, maxPrice, sort, page = 1, limit = 10 } = req.query;
    
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

    const filter: any = { isActive: true };

    if (category) filter.category = { name: category };
    if (brand) filter.brand = { name: brand };
    if (gender) filter.gender = gender;
    if (olfactoryFamily) filter.olfactoryFamily = olfactoryFamily;
    if (search) {
      filter.name = { contains: search as string, mode: 'insensitive' };
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.gte = parseFloat(minPrice as string);
      if (maxPrice) filter.price.lte = parseFloat(maxPrice as string);
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    else if (sort === 'price_desc') orderBy = { price: 'desc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: filter,
        include: { brand: true, category: true },
        skip,
        take: limitNumber,
        orderBy,
      }),
      prisma.product.count({ where: filter })
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { brand: true, category: true }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getBrands = async (_req: Request, res: Response) => {
  try {
    const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: brands });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  price: z.preprocess((v) => parseFloat(v as string), z.number().min(0)),
  promotionalPrice: z.preprocess((v) => (v ? parseFloat(v as string) : undefined), z.number().min(0).optional()),
  stock: z.preprocess((v) => parseInt(v as string, 10), z.number().min(0)),
  image: z.string().optional(),
  gender: z.string().optional(),
  olfactoryFamily: z.string().optional(),
  concentration: z.string().optional(),
  volume: z.string().optional(),
  brandId: z.string().min(1, 'Marca é obrigatória'),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
});

export const createProduct = async (req: Request, res: Response) => {
  try {
    const payload = { ...req.body };

    if (req.file) {
      const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
      payload.image = `${backendUrl}/uploads/${req.file.filename}`;
    }

    const data = productSchema.parse(payload);
    const product = await prisma.product.create({
      data,
      include: { brand: true, category: true }
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };

    if (req.file) {
      const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
      payload.image = `${backendUrl}/uploads/${req.file.filename}`;
    }

    const data = productSchema.partial().parse(payload);
    const product = await prisma.product.update({
      where: { id },
      data,
      include: { brand: true, category: true }
    });

    res.json({ success: true, data: product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'Produto desativado com sucesso' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
