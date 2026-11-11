import prisma from '../prisma';

export interface AddressInput {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

/**
 * Salva o endereço de entrega no cadastro do usuário.
 * Reutiliza o endereço mais recente se for idêntico (evita duplicatas); caso contrário
 * cria um novo, que passa a ser o endereço salvo. Pedidos antigos mantêm o endereço original.
 */
export const saveUserAddress = async (userId: string, input: AddressInput) => {
  const data = {
    zipCode: input.zipCode.trim(),
    street: input.street.trim(),
    number: input.number.trim(),
    complement: input.complement?.trim() || null,
    neighborhood: input.neighborhood.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
  };

  const existing = await prisma.address.findFirst({ where: { userId, ...data } });
  if (existing) {
    // Marca como o mais recente
    return prisma.address.update({ where: { id: existing.id }, data: { updatedAt: new Date() } });
  }
  return prisma.address.create({ data: { userId, ...data } });
};

/** Salva CPF/telefone no usuário quando ainda não existem (CPF é único). */
export const saveUserContact = async (userId: string, cpf: string, phone: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const update: { cpf?: string; phone?: string } = {};
  if (!user.phone) update.phone = phone;
  if (!user.cpf) {
    const taken = await prisma.user.findUnique({ where: { cpf } });
    if (!taken) update.cpf = cpf;
  }
  if (Object.keys(update).length) await prisma.user.update({ where: { id: userId }, data: update });
};
