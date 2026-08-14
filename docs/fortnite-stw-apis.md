# APIs Fortnite & Save the World — Referência

> Auditoria do **Dozamigos Launcher** em 07/06/2026.  
> Legenda: ✅ integrada · ⬜ não integrada · 🔑 requer auth · 🌐 pública · 🎮 BR · 🏰 STW · 🎨 Creative

---

## Resumo executivo

| Métrica | Quantidade |
|---------|------------|
| Fontes/endpoints **integrados** | **32** |
| Fontes/endpoints **não integrados** (documentados abaixo) | **28** |
| Links externos apenas (sem API) | **2** (FortniteDB, fortnite.gg) |

---

## Já integradas no Dozamigos

### fortnite-api.com (comunidade)

| Status | Nome | Base URL / Endpoint | Uso no projeto | Arquivo |
|--------|------|-------------------|----------------|---------|
| ✅ | Loja BR | `GET https://fortnite-api.com/v2/shop?language=pt-BR` | Item Shop diário | `src/lib/modules/fortnite-api.ts` |
| ✅ | Cosméticos BR (catálogo) | `GET https://fortnite-api.com/v2/cosmetics/br` | Metadados de cosméticos, nomes, ícones | `src/lib/modules/fortnite-api.ts` |
| ⬜ | Cosméticos BR (busca temporada) | `GET https://fortnite-api.com/v2/cosmetics/br/search/all` | *(removido)* Passe de Batalha | — |
| ✅ | Cosméticos novos (leaks) | `GET https://fortnite-api.com/v2/cosmetics/new` | Página de vazamentos | `src/lib/modules/fortnite-leaks.ts` |
| ✅ | Notícias BR | `GET https://fortnite-api.com/v2/news/br` | Feed de notícias | `src/lib/modules/fortnite-api.ts` |
| ✅ | Notícias STW | `GET https://fortnite-api.com/v2/news/stw` | Feed de notícias STW | `src/lib/modules/fortnite-api.ts` |
| ✅ | Mapa BR | `GET https://fortnite-api.com/v1/map` | Mapa com POIs | `src/lib/modules/fortnite-api.ts` |
| ✅ | CDN de imagens | `https://fortnite-api.com/images/cosmetics/br/{id}/smallicon.png` | Avatares de amigos / party | `src/lib/modules/avatar.ts`, `src/lib/modules/party.ts` |

**Auth (opcional):** chaves em `.env` via `VITE_FORTNITE_API_KEY` — header `Authorization: {key}` em `src/lib/http.ts`.

**Docs:** [https://fortnite-api.com/](https://fortnite-api.com/) · [https://fortnite-api.com/documentation](https://fortnite-api.com/documentation) · [https://dash.fortnite-api.com/](https://dash.fortnite-api.com/)  
**Auth:** 🌐 maioria sem chave; 🔑 chave opcional no dashboard para stats

---

### Epic Games — serviços HTTP (oficiais / não documentados publicamente)

| Status | Nome | Base URL / Endpoint | Uso no projeto | Arquivo |
|--------|------|-------------------|----------------|---------|
| ✅ | MCP — perfis | `POST …/fortnite/api/game/v2/profile/{id}/client/{op}?profileId=` | QueryProfile, compras, quests, autokick, etc. | `src/lib/http.ts`, `src/lib/modules/mcp.ts` |
| ✅ | MCP — world info 🏰 | `GET …/fortnite/api/game/v2/world/info` | Alertas de missão STW | `src/lib/modules/world-info.ts` |
| ✅ | Storefront — catálogo | `GET …/fortnite/api/storefront/v2/catalog` | Loja STW | `src/lib/modules/stw-catalog.ts` |
| ✅ | Calendar — timeline | `GET …/fortnite/api/calendar/v1/timeline` | Info da temporada | `src/lib/modules/fortnite-season.ts` |
| ✅ | OAuth | `POST …/account/api/oauth/token` (+ exchange, device) | Login, tokens, refresh | `src/lib/modules/authentication.ts` |
| ✅ | OAuth — device code | `POST …/account/api/oauth/deviceAuthorization` | Login via código | `src/lib/components/modules/login/LoginStep1.svelte` |
| ✅ | Account Public | `GET …/account/api/public/account/{id}` | Lookup de jogadores | `src/lib/modules/lookup.ts` |
| ✅ | Account Public (prod03) | `GET …/account-public-service-prod03…/account/{id}` | Email/dados do dono da conta | `src/lib/modules/lookup.ts` |
| ✅ | Account — device auth | `POST/GET/DELETE …/deviceAuth` | Sessões persistentes | `src/lib/modules/device-auth.ts` |
| ✅ | User Search | `GET …/api/v1/search/{accountId}?prefix=` | Busca por nome | `src/lib/modules/lookup.ts` |
| ✅ | Friends | `GET/POST/DELETE …/friends/api/v1/{id}/…` | Amigos, bloqueio, alias | `src/lib/modules/friends.ts` |
| ✅ | Party | `GET/PATCH/POST …/party/api/v1/Fortnite/…` | Grupos, convites, taxi | `src/lib/modules/party.ts` |
| ✅ | Fulfillment — códigos | `POST …/fulfillment/api/public/accounts/{id}/codes/{code}` | Resgate de códigos | `src/lib/modules/code.ts` |
| ✅ | Lightswitch | `GET …/lightswitch/api/service/Fortnite/status` | Status dos servidores FN | `src/lib/modules/server-status.ts` |
| ✅ | Waiting Room | `GET https://fortnitewaitingroom-public-service-prod.ol.epicgames.com/waitingroom/api/waitingroom` | Fila de espera | `src/lib/modules/server-status.ts` |
| ✅ | Status Page | `GET https://status.epicgames.com/api/v2/summary.json` | Incidentes Epic | `src/lib/modules/server-status.ts` |
| ✅ | EULA FN | `GET/POST …/eulatracking/api/public/agreements/fn/…` | Aceite de EULA (claim EGS) | `src/lib/modules/eula.ts` |
| ✅ | Avatar Service | `GET …/v1/avatar/fortnite/ids/?accountIds=` | Cosmético equipado (avatar) | `src/lib/modules/avatar.ts` |
| ✅ | EGS Store (promoções) | `GET https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions` | Jogos grátis | `src/lib/modules/free-games.ts` |
| ✅ | EGS GraphQL | `GET https://store.epicgames.com/graphql` | Resolver offerId para claim | `src/lib/modules/free-games-offers.ts` |
| ✅ | Order Processor | `POST …/orderprocessor/api/shared/accounts/{id}/orders/quickPurchase` | Claim de jogos grátis | `src/lib/modules/free-games-claim.ts` |
| ✅ | XMPP Presence | `prod.ol.epicgames.com` (XMPP) | Presença, party em tempo real | `src/lib/modules/xmpp.ts` |

**Referência comunitária Epic:** [https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation)  
**MCP (operações):** [https://github.com/MixV2/EpicResearch/tree/master/docs/mcp](https://github.com/MixV2/EpicResearch/tree/master/docs/mcp)

#### Operações MCP já usadas (amostra)

| Operação | Perfil | Escopo | Arquivo / rota |
|----------|--------|--------|----------------|
| `QueryProfile` | `campaign`, `athena`, `common_core`, `outpost0` | 🏰🎮 | Várias rotas `br-stw/*`, `mcp.ts` |
| `ClientQuestLogin` | `campaign`, `athena` | 🏰🎮 | `daily-quests`, `stw-store` |
| `PopulatePrerolledOffers` / `OpenCardPackBatch` | `campaign` | 🏰 | `free-llamas.ts`, autokick |
| `ClaimMissionAlertRewards` / `ClaimDifficultyIncreaseRewards` | `campaign` | 🏰 | `autokick/claim-rewards.ts` |
| `ClaimQuestReward` / `FortRerollDailyQuest` | `campaign` | 🏰 | `daily-quests`, autokick |
| `PurchaseCatalogEntry` / `GiftCatalogEntry` | `common_core` | 🎮 | `mcp.ts`, `stw-catalog.ts` |
| `SetAffiliateName` | `common_core` | 🎮 | `support-creator` |
| `StorageTransfer` | `theater0` | 🏰 | `autokick/transfer-building-materials.ts` |
| `RedeemSTWAccoladeTokens` | `athena` | 🏰 | `autokick/claim-rewards.ts` |

---

### Outros serviços integrados

| Status | Nome | Base URL / Endpoint | Uso no projeto | Arquivo |
|--------|------|-------------------|----------------|---------|
| ✅ | Legendary SDL | `GET https://api.legendary.gl/v1/sdl/{app}.json` | Metadados de instalação EGS | `src/lib/modules/legendary.ts` |

---

## Disponíveis (não integradas)

### fortnite-api.com — endpoints restantes

| Status | Nome | Link documentação | Descrição | Potencial uso | Auth | Escopo |
|--------|------|-------------------|-----------|---------------|------|--------|
| ⬜ | Stats BR v2 | [https://fortnite-api.com/documentation](https://fortnite-api.com/documentation) · endpoint: `GET /v2/stats/br/v2` | Estatísticas BR por nome ou accountId | Enriquecer **Lookup de jogadores**, cards de perfil | 🔑 API key | 🎮 |
| ⬜ | Playlists | `GET /v1/playlists` · [docs](https://fortnite-api.com/documentation) | Modos de jogo ativos | Dashboard BR, filtros de notícias | 🌐 | 🎮 |
| ⬜ | Playlists por ID | `GET /v1/playlists/{id}` | Detalhe de um modo | Detalhe de LTM | 🌐 | 🎮 |
| ⬜ | AES Keys | `GET /v2/aes` | Chaves de descriptografia de pak | Datamining / versão de build | 🌐 | 🎮🏰 |
| ⬜ | Banners | `GET /v1/banners` | Banners de perfil | Cosméticos / locker | 🌐 | 🎮 |
| ⬜ | Cores de banners | `GET /v1/banners/colors` | Paleta de cores | Personalização de perfil | 🌐 | 🎮 |
| ⬜ | Creator Code | `GET /v2/creatorcode?name=` | Validação de código SAC | Página **Support a Creator** | 🌐 | 🎮 |
| ⬜ | Notícias Creative | `GET /v2/news/creative` | MOTDs do Creative | Feed de notícias | 🌐 | 🎨 |
| ⬜ | Notícias (todas) | `GET /v2/news` | BR + STW + Creative | Feed unificado | 🌐 | 🎮🏰🎨 |
| ⬜ | Cosmético por ID | `GET /v2/cosmetics/br/{id}` | Detalhe de um item | Tooltips na loja | 🌐 | 🎮 |
| ⬜ | Loja combinada | `GET /v2/shop/br` ou `/v2/shop/combined` | Variante da loja | Alternativa ao `/v2/shop` | 🌐 | 🎮 |

**Referência adicional (lista de endpoints):** [https://github.com/Fortnite-Datamining/Fortnite-Datamining](https://github.com/Fortnite-Datamining/Fortnite-Datamining) · [https://docs.rs/fortnite-api/latest/fortnite_api/](https://docs.rs/fortnite-api/latest/fortnite_api/)

---

### fortniteapi.io (comunidade)

| Status | Nome | Link documentação | Descrição | Potencial uso | Auth | Escopo |
|--------|------|-------------------|-----------|---------------|------|--------|
| ⬜ | Stats / lookup | [https://fortniteapi.io/](https://fortniteapi.io/) · `GET /v1/lookup` | Resolver nome → accountId | Lookup alternativo | 🔑 | 🎮 |
| ⬜ | Stats completas | `GET /v1/stats` | Stats BR por accountId | Perfil de jogador | 🔑 | 🎮 |
| ⬜ | Stats ranqueadas | `GET /v1/stats/mode` | Ranked por modo | Tab competitivo | 🔑 | 🎮 |
| ⬜ | Torneios | `GET /v1/events/list` | Lista de eventos FNCS etc. | Seção de torneios | 🔑 | 🎮 |
| ⬜ | Pontuação torneio | `GET /v1/events/tournament` | Leaderboard de torneio | Resultados ao vivo | 🔑 | 🎮 |
| ⬜ | Ilhas Creative | `GET /v1/creative/islands` | Ilhas em destaque | Browser Creative | 🔑 | 🎨 |
| ⬜ | Busca de ilhas | `GET /v1/creative/island` | Metadados por código | Detalhe de ilha | 🔑 | 🎨 |
| ⬜ | Itens futuros | `GET /v2/items/upcoming` | Loja futura | Complemento aos leaks | 🔑 | 🎮 |
| ⬜ | Desafios da temporada | `GET /v2/challenges` | Lista de quests BR | Desafios sem MCP | 🔑 | 🎮 |
| ⬜ | Recompensas Passe | `GET /v1/season/rewards` | Track do passe | Alternativa ao cosmetics search | 🔑 | 🎮 |
| ⬜ | Fortnite Crew | `GET /v1/crew` | Assinatura Crew atual | Info de assinatura | 🔑 | 🎮 |

**Wrapper (lista de métodos):** [https://github.com/nmanclank/FnAPI_io-Python-Wrapper](https://github.com/nmanclank/FnAPI_io-Python-Wrapper) · [https://github.com/benhawley7/fortnite-api-io/wiki](https://github.com/benhawley7/fortnite-api-io/wiki)

---

### fnbr.co (comunidade — acesso sob pedido)

| Status | Nome | Link documentação | Descrição | Potencial uso | Auth | Escopo |
|--------|------|-------------------|-----------|---------------|------|--------|
| ✅ | API fnbr.co | [https://fnbr.co/api/docs](https://fnbr.co/api/docs) | Shop, cosméticos, stats, upcoming | Alternativa/enriquecimento | 🔑 `x-api-key` | 🎮 |
| ✅ | Shop fnbr | `GET https://fnbr.co/api/shop` | Rotação da loja | Item Shop (módulo pronto) | 🔑 | 🎮 |
| ✅ | Stats fnbr | `GET https://fnbr.co/api/stats` | Stats BR | Catálogo / stats | 🔑 | 🎮 |
| ✅ | Upcoming fnbr | `GET https://fnbr.co/api/upcoming` | Itens não lançados | Leaks (módulo pronto) | 🔑 | 🎮 |
| ⬜ | Images search | `GET https://fnbr.co/api/images?search=` | *(removido)* tier/page BP | — | 🔑 | 🎮 |

**Auth:** chave em `.env` via `VITE_FNBR_API_KEY` — header `x-api-key` em `src/lib/http.ts`.

**Como obter chave:** [https://fnbr.co/discord](https://fnbr.co/discord) · wrapper: [https://github.com/hiitsdan/fnbr.js](https://github.com/hiitsdan/fnbr.js)

---

### Sites sem API pública documentada

| Status | Nome | Link | Situação | Potencial uso |
|--------|------|------|----------|---------------|
| ⬜ | FortniteDB | [https://fortnitedb.com/](https://fortnitedb.com/) | **Sem API pública**; perfis via snapshot web | Hoje só link externo em `lookup-players` |
| ⬜ | fortnite.gg | [https://fortnite.gg/](https://fortnite.gg/) | **Sem API pública** para desenvolvedores | Cosméticos/loja só no site |

**FortniteDB perfil (link atual):** `https://fortnitedb.com/profile/{accountId}` — usado em `src/routes/br-stw/lookup-players/+page.svelte`

---

## Epic (oficial) — endpoints conhecidos não integrados

Documentação comunitária principal: [https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation)

### Estatísticas & competição

| Status | Nome | Endpoint | Docs | Descrição | Auth | Escopo |
|--------|------|----------|------|-----------|------|--------|
| ⬜ | Stats Proxy v2 | `GET https://statsproxy-public-service-live.ol.epicgames.com/statsproxy/api/statsv2/account/{accountId}` | [StatsProxyService](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames/StatsProxyService) | Stats BR oficiais | 🔑 Bearer | 🎮 |
| ⬜ | Leaderboards | `…/fortnite/api/leaderboards/…` | [StatsLeaderboard.md](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/blob/main/EpicGames/FN-Service/Game/StatsLeaderboard.md) | Rankings BR | 🔑 | 🎮 |
| ⬜ | Habanero (Ranked) | `fn-service-habanero…` | [FN-Habanero-Service](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames/FN-Habanero-Service) | Ranks competitivos (`ranked-br`, etc.) | 🔑 | 🎮 |
| ⬜ | Events Service | `events-public-service-live.ol.epicgames.com` | [EventsService](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames/EventsService) | Torneios FNCS / Arena | 🔑 | 🎮 |

### Conteúdo & descoberta

| Status | Nome | Endpoint | Docs | Descrição | Auth | Escopo |
|--------|------|----------|------|-----------|------|--------|
| ⬜ | FN Content API | `GET https://fortnitecontent-website-prod07.ol.epicgames.com/content/api/pages/fortnite-game` | [FN-Content](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames/FN-Content) | CMS: desafios, UI, spark-tracks | 🌐/🔑 | 🎮🏰 |
| ⬜ | PRM MOTD Dialogue | `GET https://prm-dialogue-public-api-prod.edea.live.use1a.on.epicgames.com/api/v1/fortnite-br/channel/motd/target` | [PRMDialogService](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames/PRMDialogService) | MOTD in-game alternativo | 🔑 | 🎮 |
| ⬜ | Discovery (Creative) | `GET https://fn-service-discovery-live-public.ogs.live.on.epicgames.com/api/v2/discovery/surface/…` | [FN-Discovery-Service](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames/FN-Discovery-Service) | Aba Descobrir / ilhas | 🔑 | 🎨 |
| ⬜ | Links (ilhas relacionadas) | `GET https://links-public-service-live.ol.epicgames.com/links/api/fn/mnemonic/{code}/related` | [LinksService](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames/LinksService) | Ilhas relacionadas por código | 🔑 | 🎨 |
| ⬜ | Fortnite Data API (oficial) | Swagger na documentação Epic | [Using Fortnite Data API](https://dev.epicgames.com/documentation/en-us/fortnite/using-fortnite-data-api-in-fortnite) | Métricas de engajamento de ilhas (7 dias) | 🌐 | 🎨 |

### Catálogo & inventário

| Status | Nome | Endpoint | Docs | Descrição | Auth | Escopo |
|--------|------|----------|------|-----------|------|--------|
| ⬜ | Storefront Keychain | `GET …/fortnite/api/storefront/v2/keychain` | [Catalog](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames/FN-Service/Game/Catalog) | Chaves dinâmicas de criptografia | 🔑 | 🎮 |
| ⬜ | BR Inventory | `GET …/fortnite/api/game/v2/br-inventory/account/{accountId}` | [BR-Inventory.md](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/blob/main/EpicGames/FN-Service/Game/BR-Inventory.md) | Barras de ouro BR | 🔑 | 🎮 |
| ⬜ | Cloudstorage | `GET/PUT …/fortnite/api/cloudstorage/system|user` | [Cloudstorage](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames/FN-Service/Game/Cloudstorage) | Configs do cliente (GameUserSettings) | 🔑 | 🎮🏰 |

### EOS (Epic Online Services)

| Status | Nome | Endpoint | Docs | Descrição | Auth | Escopo |
|--------|------|----------|------|-----------|------|--------|
| ⬜ | EOS Connect Token | `POST https://api.epicgames.dev/auth/v1/oauth/token` | [EOS-Services README](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/blob/main/EpicGames/FN-Service/EOS-Services/README.md) | Token EOS a partir do EG1 | 🔑 client secret | 🎮 |
| ⬜ | EOS Locker | `api.epicgames.dev/…/locker` | [Locker](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames/FN-Service/EOS-Services/Locker) | Locker moderno (pós-MCP) | 🔑 EOS | 🎮 |
| ⬜ | EOS Quests | `api.epicgames.dev/…/quests` | [Quests](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames/FN-Service/EOS-Services/Quests) | Quests via EOS | 🔑 EOS | 🎮 |
| ⬜ | EOS Inventory | `api.epicgames.dev/…/inventories` | [Inventory](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames/FN-Service/EOS-Services/Inventory) | Inventário EOS | 🔑 EOS | 🎮 |

### Launcher / biblioteca (EGS)

| Status | Nome | Endpoint | Docs | Descrição | Auth | Escopo |
|--------|------|----------|------|-----------|------|--------|
| ⬜ | Launcher Service | `launcher-public-service-prod…` | [LauncherService](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames/LauncherService) | Metadados do launcher | 🔑 | EGS |
| ⬜ | Library Service | `library-service.live.use1a.on.epicgames.com` | [LibraryService](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames/LibraryService) | Biblioteca de jogos EGS | 🔑 | EGS |
| ⬜ | Catalog Public (EGS) | `catalog-public-service-prod…` | [EGS docs](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGamesStore) | Catálogo EGS global | 🔑 | EGS |

### Save the World — Epic (além do já integrado)

| Status | Nome | Endpoint / operação MCP | Docs | Descrição | Auth | Escopo |
|--------|------|-------------------------|------|-----------|------|--------|
| ✅ | World Info | `GET …/world/info` | [Missions.md](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/blob/main/EpicGames/FN-Service/Game/SaveTheWorld/Missions.md) | Teatros, alertas, missões | 🔑 | 🏰 |
| ⬜ | Missions Validate | `POST …/world/validate` (aprox.) | [MissionsValidate.md](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/blob/main/EpicGames/FN-Service/Game/SaveTheWorld/MissionsValidate.md) | Validar seleção de missão | 🔑 | 🏰 |
| ⬜ | Friend Codes STW | endpoint dedicado STW | [FriendCodes.md](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/blob/main/EpicGames/FN-Service/Game/SaveTheWorld/FriendCodes.md) | Códigos de amigo STW | 🔑 | 🏰 |
| ⬜ | Collection Book (MCP) | `ClaimCollectionBookRewards`, `ResearchItemFromCollectionBook`, etc. | [MCP operations](https://github.com/MixV2/EpicResearch/tree/master/docs/mcp/operations) | Livro de coleção | 🔑 | 🏰 |
| ⬜ | Hero / Loadout (MCP) | `AssignHeroToLoadout`, `AssignWorkerToSquad`, `ClearHeroLoadout` | `src/lib/constants/mcp.ts` (lista) | Squads, heróis, armadilhas | 🔑 | 🏰 |
| ⬜ | Ventures (dados) | Perfil `campaign` (atributos de temporada) | Via `QueryProfile` | XP/nível Ventures — hoje só alertas de missão | 🔑 | 🏰 |
| ⬜ | Expeditions (MCP) | `RefreshExpeditions`, `CollectExpedition` | MCP ops | Expedições de heróis | 🔑 | 🏰 |

> **Nota STW:** heróis, squads, collection book e ventures **não têm API pública de terceiros** confiável; os dados vêm do perfil `campaign` via MCP ou de sites como FortniteDB (sem API).

---

## Top 5 APIs ausentes mais úteis para este launcher

1. **Stats Proxy Epic** (`statsproxy…/statsv2`) ou **fortnite-api.com `/v2/stats/br/v2`** — enriquecer a página de lookup com vitórias, K/D e tempo jogado (🎮 BR).
2. **FN Content API** (`fortnitecontent-website…/content/api/pages/fortnite-game`) — metadados oficiais de desafios, UI e eventos sem depender só do MCP.
3. **fortnite-api.com Creator Code** (`/v2/creatorcode`) — validar código SAC antes de `SetAffiliateName` na página Support a Creator.
4. **Habanero Service** (ranked) — exibir rank competitivo na ficha do jogador (crescente relevância no BR).
5. **Operações MCP de Collection Book / Ventures** (perfil `campaign`) — painéis STW de progresso de coleção e Ventures além dos alertas de missão já implementados.

---

## APIs depreciadas, indisponíveis ou com problemas conhecidos

| API | Situação | Notas |
|-----|----------|-------|
| `GET …/fortnite/api/stats/accountId/{id}/bulk/window/{window}` | ❌ **Removida** | Documentação marca: *"Has been removed ages ago"* — [Stats.md](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/blob/main/EpicGames/FN-Service/Game/Stats.md) |
| `https://dash.fortnite-api.com/endpoints` | ❌ **404** | Usar [fortnite-api.com/documentation](https://fortnite-api.com/documentation) ou dashboard |
| `https://fortniteapi.io/` | ⚠️ **Instável** | Retornou 503 durante pesquisa; dashboard pode exigir registro |
| EGS GraphQL (`store.epicgames.com/graphql`) | ⚠️ **403/401** com token launcher | Já tratado em `free-games-offers.ts` — fallback silencioso |
| FortniteDB API | ❌ **Inexistente** | Apenas website; dados via snapshot manual |
| fortnite.gg API | ❌ **Inexistente** | Site comercial sem docs para devs |

---

## Referências gerais

| Recurso | URL |
|---------|-----|
| Fortnite-API (site) | [https://fortnite-api.com/](https://fortnite-api.com/) |
| Fortnite-API (dashboard / docs) | [https://dash.fortnite-api.com/](https://dash.fortnite-api.com/) |
| Fortnite-API Python docs | [https://fortnite-api.readthedocs.io/en/stable/](https://fortnite-api.readthedocs.io/en/stable/) |
| FortniteAPI.io | [https://fortniteapi.io/](https://fortniteapi.io/) |
| FNBR.co API | [https://fnbr.co/api/docs](https://fnbr.co/api/docs) |
| FortniteDB | [https://fortnitedb.com/](https://fortnitedb.com/) |
| Epic FN Endpoints (comunidade) | [https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation) |
| Epic MCP Research | [https://github.com/MixV2/EpicResearch](https://github.com/MixV2/EpicResearch) |
| Fortnite Data API (oficial Epic) | [https://dev.epicgames.com/documentation/en-us/fortnite/using-fortnite-data-api-in-fortnite](https://dev.epicgames.com/documentation/en-us/fortnite/using-fortnite-data-api-in-fortnite) |
| Status Epic | [https://status.epicgames.com/](https://status.epicgames.com/) |

---

*Gerado por auditoria automatizada do repositório Dozamigos Launcher. Verifique endpoints e termos de uso antes de integrar em produção.*
