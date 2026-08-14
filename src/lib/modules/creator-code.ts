import { fortniteApiService } from '$lib/http';

export type CreatorCodeInfo = {
  code: string;
  accountId: string;
  displayName: string;
  status: string;
};

type FnApiCreatorResponse = {
  status: number;
  data: {
    code?: string;
    account?: { id?: string; name?: string };
    status?: string;
  };
};

export async function lookupCreatorCode(name: string): Promise<CreatorCodeInfo | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  try {
    const response = await fortniteApiService
      .get<FnApiCreatorResponse>('v2/creatorcode', { searchParams: { name: trimmed } })
      .json();

    if (response.status !== 200 || !response.data?.account?.id) return null;

    return {
      code: response.data.code || trimmed,
      accountId: response.data.account.id,
      displayName: response.data.account.name || trimmed,
      status: response.data.status || 'ACTIVE'
    };
  } catch {
    return null;
  }
}
