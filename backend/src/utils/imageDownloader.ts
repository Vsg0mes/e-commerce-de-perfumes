import fs from 'fs';
import path from 'path';
import dns from 'dns/promises';
import net from 'net';

const uploadDir = path.join(process.cwd(), 'uploads');
const MAX_BYTES = 5 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/** Apaga do disco um arquivo de /uploads (ignora URLs externas e arquivos inexistentes). */
export function deleteLocalImage(image?: string | null): void {
  if (!image || !image.startsWith('/uploads/')) return;
  const file = path.join(uploadDir, path.basename(image));
  fs.promises.unlink(file).catch(() => undefined);
}

export class ImageDownloadError extends Error {}

const isPrivateIp = (ip: string): boolean => {
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    return l === '::1' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:127.') || l.startsWith('::ffff:10.') || l.startsWith('::ffff:192.168.');
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
};

/**
 * Se `value` for uma URL externa (http/https), baixa a imagem para /uploads e
 * devolve a URL local. URLs já locais (/uploads/...) ou valores vazios passam direto.
 */
export async function localizeImageUrl(value: string | undefined, backendUrl: string): Promise<string | undefined> {
  if (!value) return value;
  const url = value.trim();
  // Já é um arquivo local (relativo ou absoluto de outro host/porta): guarda só o caminho relativo
  const local = url.match(/^(?:https?:\/\/[^/]+)?(\/uploads\/[^?#]+)/i);
  if (local) return local[1];
  if (!/^https?:\/\//i.test(url)) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ImageDownloadError('URL da imagem inválida.');
  }

  // Evita SSRF para a rede interna
  try {
    const addrs = await dns.lookup(parsed.hostname, { all: true });
    if (addrs.some((a) => isPrivateIp(a.address))) {
      throw new ImageDownloadError('URL da imagem aponta para um endereço não permitido.');
    }
  } catch (e) {
    if (e instanceof ImageDownloadError) throw e;
    throw new ImageDownloadError('Não foi possível resolver o endereço da imagem.');
  }

  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PerfumeStoreBot/1.0)', Accept: 'image/*' },
    });
  } catch {
    throw new ImageDownloadError('Não foi possível baixar a imagem da URL informada. Baixe o arquivo e envie por upload.');
  }
  if (!res.ok) {
    throw new ImageDownloadError(`O site da imagem respondeu com erro ${res.status}. Baixe o arquivo e envie por upload.`);
  }

  const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const ext = EXT_BY_TYPE[type];
  if (!ext) {
    throw new ImageDownloadError('A URL não é uma imagem JPG, PNG ou WEBP direta (use o link da imagem, não da página).');
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new ImageDownloadError('Imagem maior que 5MB.');

  fs.mkdirSync(uploadDir, { recursive: true });
  const filename = `image-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  fs.writeFileSync(path.join(uploadDir, filename), buf);
  return `/uploads/${filename}`;
}
