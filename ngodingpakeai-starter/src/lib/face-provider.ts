import "server-only";
import { z } from "zod";
import { env } from "@/lib/env";

// Kontrak provider face API (dokumentasi: docs/face-verification.md).
// Respons: { faces, similarity, liveness }. similarity/liveness boleh 0..1
// atau 0..100; server menormalkan ke 0..1.
const providerResponseSchema = z.object({
  faces: z.coerce.number().int().min(0).max(50),
  similarity: z.coerce.number().min(0).max(100),
  liveness: z.coerce.number().min(0).max(100).default(1),
});

export type FaceProbeResult = {
  faces: number;
  similarity: number;
  liveness: number;
};

// Ambang liveness minimum. Di bawah ini dianggap gagal liveness.
export const FACE_LIVENESS_MIN = 0.5;

const normalizeScore = (value: number) => (value > 1 ? value / 100 : value);

export function faceProviderName(): "http" | "mock" | null {
  if (env.FACE_PROVIDER === "mock") return "mock";
  if (env.FACE_PROVIDER === "http" && env.FACE_API_URL && env.FACE_API_KEY)
    return "http";
  return null;
}

export function isFaceProviderConfigured() {
  return faceProviderName() !== null;
}

const dataUrl = (buffer: Buffer, mimeType: string) =>
  `data:${mimeType};base64,${buffer.toString("base64")}`;

// Provider mock sengaja hanya aktif lewat FACE_PROVIDER=mock (pengujian).
// Penanda pada byte foto memudahkan e2e menguji jalur gagal tanpa layanan
// eksternal.
const MOCK_OUTCOMES: Record<string, FaceProbeResult> = {
  "MOCK:NO_FACE": { faces: 0, similarity: 0, liveness: 0 },
  "MOCK:MULTIPLE_FACES": { faces: 2, similarity: 0.9, liveness: 0.9 },
  "MOCK:LOW_LIVENESS": { faces: 1, similarity: 0.99, liveness: 0.1 },
  "MOCK:MISMATCH": { faces: 1, similarity: 0.2, liveness: 0.99 },
};

const mockProbe = (probe: Buffer): FaceProbeResult => {
  const text = probe.toString("latin1");
  for (const [marker, result] of Object.entries(MOCK_OUTCOMES)) {
    if (text.includes(marker)) return result;
  }
  return { faces: 1, similarity: 0.99, liveness: 0.99 };
};

export async function requestFaceVerification(input: {
  reference: Buffer;
  referenceMimeType: string;
  probe: Buffer;
  probeMimeType: string;
  livenessRequired: boolean;
}): Promise<{ provider: string; result: FaceProbeResult }> {
  const provider = faceProviderName();
  if (!provider) throw new Error("FACE_PROVIDER_NOT_CONFIGURED");

  if (provider === "mock") {
    return { provider, result: mockProbe(input.probe) };
  }

  const response = await fetch(env.FACE_API_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.FACE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reference: dataUrl(input.reference, input.referenceMimeType),
      probe: dataUrl(input.probe, input.probeMimeType),
      livenessRequired: input.livenessRequired,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error(`FACE_PROVIDER_HTTP_${response.status}`);
  const parsed = providerResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("FACE_PROVIDER_INVALID_RESPONSE");
  return {
    provider,
    result: {
      faces: parsed.data.faces,
      similarity: normalizeScore(parsed.data.similarity),
      liveness: normalizeScore(parsed.data.liveness),
    },
  };
}
