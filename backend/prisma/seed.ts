import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import '../src/config/env';

const prisma = new PrismaClient();

async function main() {
  // Admin user (credenciais vêm do ambiente; nunca há senha fixa)
  const isProduction = process.env.NODE_ENV === 'production';
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || (isProduction ? '' : 'admin@ecommerce.com');
  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL é obrigatório em produção. Seed abortado.');
  }

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) {
    console.log(`Admin ${adminEmail} já existe; senha mantida.`);
  } else {
    let plainPassword = process.env.ADMIN_PASSWORD;
    let generated = false;
    if (!plainPassword) {
      if (isProduction) {
        throw new Error('ADMIN_PASSWORD é obrigatório em produção. Seed abortado.');
      }
      plainPassword = crypto.randomBytes(12).toString('base64url');
      generated = true;
    }
    await prisma.user.create({
      data: {
        name: 'Admin Memorare',
        email: adminEmail,
        password: await bcrypt.hash(plainPassword, 10),
        role: 'ADMIN',
      },
    });
    console.log(`Admin ${adminEmail} criado.`);
    if (generated) {
      console.log(`Senha gerada (exibida apenas uma vez): ${plainPassword}`);
    }
  }

  // Brands
  const [dior, chanel, tomFord, ch, ysl, prada, jpg] = await Promise.all([
    prisma.brand.upsert({ where: { name: 'Dior' }, update: {}, create: { name: 'Dior' } }),
    prisma.brand.upsert({ where: { name: 'Chanel' }, update: {}, create: { name: 'Chanel' } }),
    prisma.brand.upsert({ where: { name: 'Tom Ford' }, update: {}, create: { name: 'Tom Ford' } }),
    prisma.brand.upsert({ where: { name: 'Carolina Herrera' }, update: {}, create: { name: 'Carolina Herrera' } }),
    prisma.brand.upsert({ where: { name: 'Yves Saint Laurent' }, update: {}, create: { name: 'Yves Saint Laurent' } }),
    prisma.brand.upsert({ where: { name: 'Prada' }, update: {}, create: { name: 'Prada' } }),
    prisma.brand.upsert({ where: { name: 'Jean Paul Gaultier' }, update: {}, create: { name: 'Jean Paul Gaultier' } }),
  ]);

  // Categories
  const [masculino, feminino, unissex, nicho] = await Promise.all([
    prisma.category.upsert({ where: { name: 'Masculino' }, update: {}, create: { name: 'Masculino' } }),
    prisma.category.upsert({ where: { name: 'Feminino' }, update: {}, create: { name: 'Feminino' } }),
    prisma.category.upsert({ where: { name: 'Unissex' }, update: {}, create: { name: 'Unissex' } }),
    prisma.category.upsert({ where: { name: 'Nicho' }, update: {}, create: { name: 'Nicho' } }),
  ]);

  // Products
  const products = [
    {
      name: 'Sauvage',
      description: 'Um perfume radicalmente fresco, cru e nobre ao mesmo tempo, com notas de bergamota da Calábria e ambroxan.',
      price: 699.90,
      promotionalPrice: 629.90,
      stock: 50,
      image: null,
      gender: 'Masculino',
      olfactoryFamily: 'Aromático Fougère',
      concentration: 'Eau de Parfum',
      volume: '100ml',
      brandId: dior.id,
      categoryId: masculino.id,
    },
    {
      name: 'CH MEN',
      description: 'Uma fragrância amadeirada floral e couro, feita para o homem contemporâneo de elegância espontânea.',
      price: 589.00,
      promotionalPrice: null,
      stock: 35,
      image: null,
      gender: 'Masculino',
      olfactoryFamily: 'Amadeirado Especiado',
      concentration: 'Eau de Toilette',
      volume: '100ml',
      brandId: ch.id,
      categoryId: masculino.id,
    },
    {
      name: 'MYSLF',
      description: 'A afirmação da masculinidade moderna. Uma fusão harmoniosa de flor de laranjeira cintilante e acordes amadeirados sensuais.',
      price: 749.00,
      promotionalPrice: 679.00,
      stock: 28,
      image: null,
      gender: 'Masculino',
      olfactoryFamily: 'Floral Amadeirado',
      concentration: 'Eau de Parfum',
      volume: '100ml',
      brandId: ysl.id,
      categoryId: masculino.id,
    },
    {
      name: 'PRADA PARADOXE',
      description: 'Reconciliação atemporal de notas florais e âmbar intenso, expressando a multiplicidade feminina em sua essência.',
      price: 799.00,
      promotionalPrice: 719.00,
      stock: 40,
      image: null,
      gender: 'Feminino',
      olfactoryFamily: 'Floral Âmbar',
      concentration: 'Eau de Parfum',
      volume: '90ml',
      brandId: prada.id,
      categoryId: feminino.id,
    },
    {
      name: 'SCANDAL',
      description: 'Uma aura ousada e envolvente de mel gourmet e gardênia radiante, que desafia os padrões com sensualidade sofisticada.',
      price: 669.00,
      promotionalPrice: null,
      stock: 22,
      image: null,
      gender: 'Feminino',
      olfactoryFamily: 'Chipre Floral',
      concentration: 'Eau de Parfum',
      volume: '80ml',
      brandId: jpg.id,
      categoryId: feminino.id,
    },
    {
      name: 'GOOD GIRL',
      description: 'A dualidade fascinante da mulher moderna em um acorde misterioso de tuberosa luminosa e fava tonka tostada.',
      price: 729.00,
      promotionalPrice: 649.00,
      stock: 45,
      image: null,
      gender: 'Feminino',
      olfactoryFamily: 'Oriental Floral',
      concentration: 'Eau de Parfum',
      volume: '80ml',
      brandId: ch.id,
      categoryId: feminino.id,
    },
    {
      name: 'Bleu de Chanel',
      description: 'Elegância e liberdade intemporal em uma composição aromática amadeirada com rastro cativante.',
      price: 850.00,
      promotionalPrice: null,
      stock: 30,
      image: null,
      gender: 'Masculino',
      olfactoryFamily: 'Amadeirado Aromático',
      concentration: 'Eau de Parfum',
      volume: '100ml',
      brandId: chanel.id,
      categoryId: masculino.id,
    },
    {
      name: 'Black Orchid',
      description: 'Luxuoso e sensual, de acordes ricos, trufas negras e orquídeas raras em uma poção magnética e inesquecível.',
      price: 1200.00,
      promotionalPrice: 1080.00,
      stock: 15,
      image: null,
      gender: 'Unissex',
      olfactoryFamily: 'Oriental Âmbar',
      concentration: 'Eau de Parfum',
      volume: '50ml',
      brandId: tomFord.id,
      categoryId: unissex.id,
    },
  ];

  for (const product of products) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } });
    if (!existing) {
      await prisma.product.create({ data: product });
    }
  }

  console.log('Seed completed with luxury perfumes!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
