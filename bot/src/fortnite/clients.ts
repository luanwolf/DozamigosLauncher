export type ClientCredentials = {
  name: string;
  clientId: string;
  secret: string;
  base64: string;
};

function createClientCredentials({ name, clientId, secret }: Omit<ClientCredentials, 'base64'>): ClientCredentials {
  return {
    name,
    clientId,
    secret,
    base64: Buffer.from(`${clientId}:${secret}`).toString('base64')
  };
}

export const fortniteAndroidGameClient = createClientCredentials({
  name: 'fortniteAndroidGameClient',
  clientId: '3f69e56c7649492c8cc29f1af08a8a12',
  secret: 'b51ee9cb12234f50a69efa67ef53812e'
});

export const fortniteNewSwitchGameClient = createClientCredentials({
  name: 'fortniteNewSwitchGameClient',
  clientId: '98f7e42c2e3a4f86a74eb43fbb41ed39',
  secret: '0a2449a2-001a-451e-afec-3e812901c4d7'
});

export const fortnitePCGameClient = createClientCredentials({
  name: 'fortnitePCGameClient',
  clientId: 'ec684b8c687f479fadea3cb2ad83f5c6',
  secret: 'e1f31c211f28413186262d37a13fc84d'
});

export const defaultClient = fortnitePCGameClient;

export type AccountData = {
  displayName: string;
  accountId: string;
  deviceId: string;
  secret: string;
};
