import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma", "bullmq", "ioredis", "pdf-parse", "mammoth", "exceljs", "jspdf", "docx", "pptxgenjs"],
};

export default nextConfig;
