// Isi data perusahaan di satu tempat ini sebelum mempublikasikan halaman
// kebijakan privasi. Nilai yang masih memakai tanda [ ... ] akan memunculkan
// peringatan draf di halaman.
export const privacyConfig = {
  appName: "Hadirku Lecarassa",
  companyName: "Lecarassa",
  address: "[Alamat perusahaan]",
  email: "[Email privasi]",
  phone: "[Nomor telepon]",
  effectiveDate: "17 November 2026",
  updatedDate: "17 November 2026",
} as const;

export const privacyHasPlaceholders = Object.values(privacyConfig).some(
  (value) => value.startsWith("["),
);
