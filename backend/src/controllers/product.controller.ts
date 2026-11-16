import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import { z } from 'zod';
import { localizeImageUrl, deleteLocalImage, ImageDownloadError } from '../utils/imageDownloader';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { category, brand, gender, olfactoryFamily, search, minPrice, maxPrice, sort, page = 1, limit = 10 } = req.query;

    const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNumber - 1) * limitNumber;

    const filter: Prisma.ProductWhereInput = { isActive: true };

    if (category) filter.category = { name: String(category) };
    if (brand) filter.brand = { name: String(brand) };
    if (gender) filter.gender = String(gender);
    if (olfactoryFamily) filter.olfactoryFamily = String(olfactoryFamily);
    if (search) {
      filter.name = { contains: String(search), mode: 'insensitive' };
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.gte = parseFloat(minPrice as string);
      if (maxPrice) filter.price.lte = parseFloat(maxPrice as string);
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    else if (sort === 'price_desc') orderBy = { price: 'desc' };
    else if (sort === 'newest') orderBy = { createdAt: 'desc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: filter,
        include: { brand: true, category: true },
        skip,
        take: limitNumber,
        orderBy,
      }),
      prisma.product.count({ where: filter }),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

const adminProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  brandId: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  lowStock: z.enum(['true', 'false']).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
});

/** GET /api/products/admin — lista paginada para o admin (inclui produtos inativos). */
export const getAdminProducts = async (req: Request, res: Response) => {
  try {
    const { page, limit, search, brandId, categoryId, isActive, lowStock, lowStockThreshold } =
      adminProductsQuerySchema.parse(req.query);

    const where: Prisma.ProductWhereInput = {
      ...(brandId ? { brandId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
      ...(lowStock === 'true' ? { stock: { lte: lowStockThreshold } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { brand: true, category: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error fetching admin products:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

/** GET /api/products/:id — público; retorna 404 se o produto não existir ou estiver inativo. */
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { brand: true, category: true },
    });

    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado ou indisponível' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

export const getBrands = async (_req: Request, res: Response) => {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    res.json({ success: true, data: brands });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

const nameSchema = z.object({
  name: z.string({ required_error: 'Informe o nome' }).trim().min(1, 'Informe o nome').max(80, 'Nome muito longo'),
});

export const createBrand = async (req: Request, res: Response) => {
  try {
    const { name } = nameSchema.parse(req.body);
    const exists = await prisma.brand.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Já existe uma marca com este nome' });
    }
    const brand = await prisma.brand.create({
      data: { name },
      include: { _count: { select: { products: true } } },
    });
    res.status(201).json({ success: true, message: 'Marca criada com sucesso', data: brand });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error creating brand:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

export const updateBrand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = nameSchema.parse(req.body);
    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Marca não encontrada' });
    }
    const conflict = await prisma.brand.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
    });
    if (conflict) {
      return res.status(409).json({ success: false, message: 'Já existe outra marca com este nome' });
    }
    const brand = await prisma.brand.update({
      where: { id },
      data: { name },
      include: { _count: { select: { products: true } } },
    });
    res.json({ success: true, message: 'Marca renomeada com sucesso', data: brand });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error updating brand:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

export const deleteBrand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Marca não encontrada' });
    }
    const linkedProducts = await prisma.product.count({ where: { brandId: id } });
    if (linkedProducts > 0) {
      return res.status(409).json({
        success: false,
        message: `Não é possível excluir a marca "${existing.name}" pois existem ${linkedProducts} produto(s) vinculado(s) a ela`,
      });
    }
    await prisma.brand.delete({ where: { id } });
    res.json({ success: true, message: 'Marca excluída com sucesso' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name } = nameSchema.parse(req.body);
    const exists = await prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Já existe uma categoria com este nome' });
    }
    const category = await prisma.category.create({
      data: { name },
      include: { _count: { select: { products: true } } },
    });
    res.status(201).json({ success: true, message: 'Categoria criada com sucesso', data: category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = nameSchema.parse(req.body);
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
    }
    const conflict = await prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
    });
    if (conflict) {
      return res.status(409).json({ success: false, message: 'Já existe outra categoria com este nome' });
    }
    const category = await prisma.category.update({
      where: { id },
      data: { name },
      include: { _count: { select: { products: true } } },
    });
    res.json({ success: true, message: 'Categoria renomeada com sucesso', data: category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
    }
    const linkedProducts = await prisma.product.count({ where: { categoryId: id } });
    if (linkedProducts > 0) {
      return res.status(409).json({
        success: false,
        message: `Não é possível excluir a categoria "${existing.name}" pois existem ${linkedProducts} produto(s) vinculado(s) a ela`,
      });
    }
    await prisma.category.delete({ where: { id } });
    res.json({ success: true, message: 'Categoria excluída com sucesso' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

const toCents = (v: number) => Math.round(v * 100);

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  price: z.preprocess((v) => parseFloat(v as string), z.number().min(0)),
  promotionalPrice: z.preprocess(
    (v) => (v !== undefined && v !== '' && v !== null ? parseFloat(v as string) : null),
    z.number().min(0).nullable().optional()
  ),
  stock: z.preprocess((v) => parseInt(v as string, 10), z.number().int().min(0)),
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

    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    if (req.file) {
      payload.image = `/uploads/${req.file.filename}`;
    } else if (payload.image) {
      payload.image = await localizeImageUrl(payload.image, backendUrl);
    }

    const parsed = productSchema.parse(payload);
    const data = {
      ...parsed,
      price: toCents(parsed.price) / 100,
      promotionalPrice: parsed.promotionalPrice != null ? toCents(parsed.promotionalPrice) / 100 : null,
    };

    const product = await prisma.product.create({
      data,
      include: { brand: true, category: true },
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error instanceof ImageDownloadError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };

    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    if (req.file) {
      payload.image = `/uploads/${req.file.filename}`;
    } else if (payload.image) {
      payload.image = await localizeImageUrl(payload.image, backendUrl);
    }

    const parsed = productSchema.partial().parse(payload);
    const data: Prisma.ProductUncheckedUpdateInput = {
      ...parsed,
      ...(parsed.price !== undefined ? { price: toCents(parsed.price) / 100 } : {}),
      ...(parsed.promotionalPrice !== undefined
        ? { promotionalPrice: parsed.promotionalPrice != null ? toCents(parsed.promotionalPrice) / 100 : null }
        : {}),
    };

    const previous = data.image ? await prisma.product.findUnique({ where: { id }, select: { image: true } }) : null;
    const product = await prisma.product.update({
      where: { id },
      data,
      include: { brand: true, category: true },
    });

    if (previous?.image && previous.image !== product.image) deleteLocalImage(previous.image);
    res.json({ success: true, data: product });
  } catch (error) {
    if (error instanceof ImageDownloadError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

const activeSchema = z.object({
  isActive: z.boolean({ required_error: 'Informe o estado isActive' }),
});

/** PATCH /api/products/:id/active — ativa ou desativa um produto (ADMIN). */
export const toggleProductActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = activeSchema.parse(req.body);

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    const product = await prisma.product.update({
      where: { id },
      data: { isActive },
      include: { brand: true, category: true },
    });

    res.json({
      success: true,
      message: isActive ? 'Produto reativado com sucesso' : 'Produto desativado com sucesso',
      data: product,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error toggling product active:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'Produto desativado com sucesso' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};
