import { PrismaClient } from "@prisma/client";

// In Node.js server runtime (not Edge Runtime), prioritize IPv4 to prevent pooler timeouts
if (typeof process !== "undefined" && process.env?.NEXT_RUNTIME !== "edge") {
  try {
    const dnsModule = "node:dns";
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dns = typeof require !== "undefined" ? require(dnsModule) : null;
    if (dns && typeof dns.setDefaultResultOrder === "function") {
      dns.setDefaultResultOrder("ipv4first");
    }
  } catch {
    // Edge runtime or non-node environment fallback
  }
}

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
