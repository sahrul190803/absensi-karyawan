import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.url().refine((value) => {
    const url = new URL(value);
    return (
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      Boolean(url.hostname) &&
      url.pathname.length > 1 &&
      !url.hash
    );
  }, "Set DATABASE_URL to a PostgreSQL connection string or run npm run setup."),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "Run npm run setup to generate a secret."),
  BETTER_AUTH_URL: z
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash &&
        !url.username &&
        !url.password
      );
    }, "Use an origin, e.g. http://localhost:3000.")
    .default("http://localhost:3000"),
  // Email (Resend). Fitur email tetap jalan: jika key kosong, pengiriman
  // dilewati dan hanya dicatat di log.
  RESEND_API_KEY: z.string().trim().min(1).optional(),
  EMAIL_FROM: z.string().trim().min(3).optional(),
  // Verifikasi wajah (P3). Provider dipilih lewat env, bukan dipatok di kode.
  // "http" memakai FACE_API_URL + FACE_API_KEY; "mock" hanya untuk pengujian
  // lokal/e2e. Bila kosong, verifikasi yang diwajibkan akan ditolak
  // (fail-closed) agar absensi tidak lolos tanpa pemeriksaan.
  FACE_PROVIDER: z.enum(["http", "mock"]).optional(),
  FACE_API_URL: z.string().trim().url().optional(),
  FACE_API_KEY: z.string().trim().min(1).optional(),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  FACE_PROVIDER: process.env.FACE_PROVIDER,
  FACE_API_URL: process.env.FACE_API_URL,
  FACE_API_KEY: process.env.FACE_API_KEY,
});
