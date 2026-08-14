<p align="center">
  <img src="assets/banner.png" alt="Dozamigos Launcher" width="100%">
</p>

<p align="center">
  Launcher em português para Fortnite Battle Royale, Salve o Mundo e Epic Games, feito por <b>Heyash</b>.
</p>

![Prévia do launcher](assets/preview.png)

## Instalação

1. Baixe o instalador `.exe` mais recente na [página de releases](https://github.com/luanwolf/DozamigosLauncher/releases/latest).
2. Execute o instalador e abra o Dozamigos Launcher.
3. Na primeira execução, o app abre uma tela de boas-vindas para você adicionar sua conta Epic e apontar a pasta de instalação do Fortnite.

Depois disso o launcher se atualiza sozinho: ao abrir, ele consulta a última release e instala a nova versão automaticamente.

## Funcionalidades

### Battle Royale

- **Loja de itens** com prévia em vídeo, áudio (músicas e emotes), estilos dos cosméticos e exportação da loja em WebP
- **Ofertas especiais** da Epic e da PSN em dinheiro real
- **Vestiário** com busca por categoria, prévia em vídeo dos itens e exportação do vestiário em imagem 1:1
- **Estatísticas**, **XP ganho**, **mapa atual**, **status dos servidores** e **vazamentos**
- **Comprar V-Bucks** e **apoiar um criador**

### STW (Salve o Mundo)

- **Alertas de missão** com recompensas e rotação
- **Lhamas grátis** com resgate automático (varredura a cada hora, em UTC, para todas as contas com o resgate ligado)
- **Loja do STW** e **missões diárias**
- **Auto-kick**: sai da missão na hora, resgata recompensas, transfere materiais e convida seus amigos ao fim da missão

### Conta e Epic Games

- Várias contas cadastradas, com troca rápida (o login de todas é feito na abertura do app)
- Perfil, lista de amigos, EULA e ajustes
- Autenticação: gera tokens de acesso, exchange codes e device auths
- Biblioteca da Epic Games: baixe, atualize e inicie seus jogos
- Jogos grátis da semana, com marcação de **Resgatado** direto na home

## Como usar

- **Adicionar conta:** _Conta → Conta_ e siga o fluxo de login da Epic. Contas ficam salvas e podem ser trocadas pelo topo da janela.
- **Iniciar o Fortnite:** botão _Iniciar jogo_ no topo. O caminho da instalação fica em _Ajustes_.
- **Exportar loja ou vestiário:** abra a página e clique em _Exportar_. A imagem `.webp` é salva em `%APPDATA%\dozamigos-launcher\exports` e o botão _Abrir imagem_ aparece ao lado logo depois.
- **Resgate automático de lhamas:** ligue em _STW → Lhamas grátis_; a varredura roda de hora em hora, mesmo com o app minimizado.
- **Relatar um problema:** deixe **Logs de depuração** ligado em _Ajustes_, reproduza o erro e abra uma issue com os logs (F12 → Console), passos e prints.

## Desenvolvimento

### Pré-requisitos

1. **Bun**
   - Windows: `powershell -c "irm bun.sh/install.ps1 | iex"`
   - Linux e macOS: `curl -fsSL https://bun.sh/install | bash`
2. **Tauri** — siga o guia oficial de pré-requisitos: https://v2.tauri.app/start/prerequisites

### Rodando o app

```sh
bun install
# perfil de dev (identificador com.dozamigos-launcher.dev — roda junto com a versão instalada)
bun run tauri:dev
```

Produção e desenvolvimento usam identificadores e pastas do AppData diferentes, então os dois podem ficar abertos ao mesmo tempo.

### Gerando o instalador

```sh
bun run tauri:build
```

O instalador NSIS sai em `src-tauri/target/release/bundle/nsis/`. As artes do instalador e o banner deste README são gerados por
`src-tauri/installer/build-images.ps1` e `scripts/build-banner.ps1`.

### Atualização automática

O app consulta `https://github.com/luanwolf/DozamigosLauncher/releases/latest/download/latest.json` ao iniciar.
Builds de release precisam da variável `TAURI_SIGNING_PRIVATE_KEY` com a chave privada correspondente ao `pubkey` em
`src-tauri/tauri.conf.json`. O GitHub Actions lê essa chave do secret de mesmo nome e publica o instalador assinado,
sua assinatura e o `latest.json`.

Versão atual: **0.1.0**

## Créditos

O Dozamigos Launcher é baseado no [Spitfire Launcher](https://github.com/bur4ky/spitfire-launcher), de
[Burak (bur4ky)](https://github.com/bur4ky) — todo o crédito da base original é dele. Este projeto adapta e estende
aquele trabalho com interface em português, novas páginas e ajustes próprios.

## Licença

Licenciado sob a GNU General Public License v3.0 — veja o arquivo [LICENSE](LICENSE).
