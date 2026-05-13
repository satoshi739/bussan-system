import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import type { EbayAccount } from "@/lib/generated/prisma/client";

type EbayAccountPlain = Omit<EbayAccount, "accessToken" | "refreshToken"> & {
  accessToken: string;
  refreshToken: string;
};

type UpsertInput = {
  userId: string;
  ebayUserId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  scopes: string[];
};

function decryptAccount(account: EbayAccount): EbayAccountPlain {
  return {
    ...account,
    accessToken: decrypt(account.accessToken),
    refreshToken: decrypt(account.refreshToken),
  };
}

export async function upsertEbayAccount(data: UpsertInput): Promise<EbayAccount> {
  const encryptedAccess = encrypt(data.accessToken);
  const encryptedRefresh = encrypt(data.refreshToken);
  return prisma.ebayAccount.upsert({
    where: { userId: data.userId },
    create: {
      userId: data.userId,
      ebayUserId: data.ebayUserId,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiresAt: data.tokenExpiresAt,
      scopes: data.scopes,
    },
    update: {
      ebayUserId: data.ebayUserId,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiresAt: data.tokenExpiresAt,
      scopes: data.scopes,
      deletedAt: null,
    },
  });
}

export async function getEbayAccount(userId: string): Promise<EbayAccountPlain | null> {
  const account = await prisma.ebayAccount.findFirst({
    where: { userId, deletedAt: null },
  });
  if (!account) return null;
  return decryptAccount(account);
}

// eBay Account Deletion Notification で呼び出す
export async function softDeleteByEbayUserId(ebayUserId: string): Promise<number> {
  const result = await prisma.ebayAccount.updateMany({
    where: { ebayUserId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count;
}
