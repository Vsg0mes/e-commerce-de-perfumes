import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@ecommerce.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@ecommerce.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // Brands
  const brands = await Promise.all([
    prisma.brand.upsert({ where: { name: 'Dior' }, update: {}, create: { name: 'Dior' } }),
    prisma.brand.upsert({ where: { name: 'Chanel' }, update: {}, create: { name: 'Chanel' } }),
    prisma.brand.upsert({ where: { name: 'Tom Ford' }, update: {}, create: { name: 'Tom Ford' } }),
  ]);

  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: 'Masculino' }, update: {}, create: { name: 'Masculino' } }),
    prisma.category.upsert({ where: { name: 'Feminino' }, update: {}, create: { name: 'Feminino' } }),
    prisma.category.upsert({ where: { name: 'Unissex' }, update: {}, create: { name: 'Unissex' } }),
    prisma.category.upsert({ where: { name: 'Infantil' }, update: {}, create: { name: 'Infantil' } }),
    prisma.category.upsert({ where: { name: 'Nicho' }, update: {}, create: { name: 'Nicho' } }),
  ]);

  // Products
  const products = [
    {
      name: 'Sauvage',
      description: 'Um perfume radicalmente fresco, cru e nobre ao mesmo tempo.',
      price: 699.90,
      stock: 50,
      image: 'https://example.com/sauvage.jpg',
      gender: 'Masculino',
      olfactoryFamily: 'Aromático',
      concentration: 'EDT',
      volume: '100ml',
      brandId: brands[0].id,
      categoryId: categories[0].id,
    },
    {
      name: 'Bleu de Chanel',
      description: 'Elegância e liberdade, um perfume amadeirado aromático.',
      price: 850.00,
      stock: 30,
      image: 'https://example.com/bleu.jpg',
      gender: 'Masculino',
      olfactoryFamily: 'Amadeirado',
      concentration: 'EDP',
      volume: '100ml',
      brandId: brands[1].id,
      categoryId: categories[0].id,
    },
    {
      name: 'Black Orchid',
      description: 'Luxuoso e sensual, de acordes ricos e sombrios e uma poção sedutora.',
      price: 1200.00,
      stock: 15,
      image: 'https://example.com/blackorchid.jpg',
      gender: 'Unissex',
      olfactoryFamily: 'Oriental',
      concentration: 'EDP',
      volume: '50ml',
      brandId: brands[2].id,
      categoryId: categories[2].id,
    },
  ];

  for (const product of products) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } });
    if (!existing) {
      await prisma.product.create({ data: product });
    }
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
