# Dozamigos Discord bot

Bot TypeScript (Bun + discord.js) com as funções do launcher — sem iniciar jogo, biblioteca ou downloads.

## Setup

1. Crie uma aplicação em [Discord Developer Portal](https://discord.com/developers/applications):
   - Bot → Reset Token
   - OAuth2 → URL Generator: `bot` + `applications.commands`
   - Permissões: Send Messages, Embed Links, Attach Files, Use External Emojis
2. Node 22+ (ou [Bun](https://bun.sh)).
3. Neste diretório:

```sh
npm install
cp .env.example .env
```

4. Preencha `.env`:
   - `BOT_TOKEN` — token do bot
   - `ENCRYPTION_KEY` — senha qualquer (criptografa o device auth da Epic no SQLite)
   - `DEV_GUILD_ID` — (opcional) servidor de teste; comandos globais podem levar até 1h
   - `FORTNITE_API_KEY` — (opcional) [fortnite-api.com](https://fortnite-api.com)

5. Registrar slash commands e subir:

```sh
npm run register
npm start
```

`/login` manda um link da Epic no DM. Sem DM aberto, use o comando no chat privado com o bot.

## Comandos

Imagem: `/loja` `/vazamentos` `/mapa` `/elementais` `/vestiario` `/stw recursos`

Conta: `/login` `/logout` `/conta` `/stats` `/vbucks` `/passe`

Escrita (pede confirmação): `/passe resgatar` `/stw lhama` `/stw resgatar` `/mfa` `/codigo` `/criador` `/comprar`
