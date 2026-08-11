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

const productSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number().min(0),
  promotionalPrice: z.number().min(0).optional(),
  stock: z.number().min(0),
  image: z.string().optional(),
  gender: z.string().optional(),
  olfactoryFamily: z.string().optional(),
  concentration: z.string().optional(),
  volume: z.string().optional(),
  brandId: z.string(),
  categoryId: z.string(),
});

export const createProduct = async (req: Request, res: Response) => {
  try {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({ data });
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
    const data = productSchema.partial().parse(req.body);
    const product = await prisma.product.update({ where: { id }, data });
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
