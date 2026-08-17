<script lang="ts">
  // Dev-only console: never shipped to users, so the copy here stays inline
  // instead of going through the message catalog.
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { goto } from '$app/navigation';
  import { getName, getTauriVersion, getVersion } from '@tauri-apps/api/app';
  import { arch, platform, type as osType, version as osVersion } from '@tauri-apps/plugin-os';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { isFnbrApiConfigured, isFortniteApiConfigured } from '$lib/env';
  import { language } from '$lib/i18n';
  import { logger } from '$lib/logger';
  import { simulateLauncherUpdate } from '$lib/modules/launcher-update-prompt';
  import { requestNotificationPermission, sendNotificationMessage } from '$lib/modules/notification';
  import { accountStore, settingsStore } from '$lib/storage';
  import { pushAchievement, updateAchievement } from '$lib/stores/achievement-toasts';
  import { activityLog } from '$lib/stores/activity-log';
  import { pendingLauncherUpdate } from '$lib/stores/pending-launcher-update';
  import { sleep } from '$lib/utils';
  import PageContent from '$components/layout/PageContent.svelte';
  import SectionHeading from '$components/layout/SectionHeading.svelte';
  import IntegrationsSettings from '$components/modules/settings/categories/IntegrationsSettings.svelte';
  import { Badge } from '$components/ui/badge';
  import { Button } from '$components/ui/button';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';

  const activeAccount = accountStore.getActiveStore(true);

  let appInfo = $state<{ name: string; version: string; tauri: string } | null>(null);

  onMount(() => {
    if (!import.meta.env.DEV) {
      void goto('/inicio');
      return;
    }

    void Promise.all([getName(), getVersion(), getTauriVersion()])
      .then(([name, version, tauri]) => {
        appInfo = { name, version, tauri };
      })
      .catch((error) => logger.error('Failed to read app info', { error }));
  });

  const environment = $derived([
    { label: 'App', value: appInfo ? `${appInfo.name} ${appInfo.version}` : '…' },
    { label: 'Tauri', value: appInfo?.tauri ?? '…' },
    { label: 'Sistema', value: `${osType()} ${osVersion()} (${arch()})` },
    { label: 'Plataforma', value: platform() },
    { label: 'Modo', value: import.meta.env.DEV ? 'desenvolvimento' : 'produção' },
    { label: 'Idioma', value: $language },
    { label: 'Conta ativa', value: $activeAccount?.displayName ?? 'nenhuma' },
    { label: 'Contas salvas', value: String($accountStore.accounts.length) },
    { label: 'Histórico de atividade', value: `${$activityLog.length} entradas` },
    { label: 'Atualização adiada', value: $pendingLauncherUpdate?.version ?? 'nenhuma' },
    { label: 'fortnite-api.com', value: isFortniteApiConfigured() ? 'configurada' : 'sem chave' },
    { label: 'fnbr.co', value: isFnbrApiConfigured() ? 'configurada' : 'sem chave' },
    { label: 'Notificações do Windows', value: $settingsStore.app?.windowsNotifications === false ? 'desligadas' : 'ligadas' },
    { label: 'Caminho do Fortnite', value: $settingsStore.app?.gamePath || 'não definido' }
  ]);

  async function fakePendingToast(outcome: 'success' | 'error') {
    const id = toast.loading('Iniciando o Fortnite...');
    await sleep(1600);

    if (outcome === 'success') toast.success('Fortnite iniciado com sucesso', { id });
    else toast.error('Não foi possível iniciar o Fortnite', { id });
  }

  async function testNativeNotification() {
    const sent = await sendNotificationMessage('Notificação de teste do launcher.', 'Dozamigos Launcher');
    if (sent) toast.success('Notificação nativa enviada');
    else toast.error('O Windows bloqueou a notificação');
  }

  async function testPermission() {
    const granted = await requestNotificationPermission();
    if (granted) toast.success('Permissão concedida');
    else toast.error('Permissão negada');
  }

  function testAchievementProgress() {
    const id = 'dev-progress';
    pushAchievement({ id, title: 'Baixando teste', message: 'Progresso simulado', progress: 0, sticky: true });

    let percent = 0;
    const timer = setInterval(() => {
      percent = Math.min(100, percent + 8);
      updateAchievement(id, { progress: percent, message: `Progresso simulado — ${percent}%` });
      if (percent >= 100) {
        clearInterval(timer);
        updateAchievement(id, { message: 'Concluído', sticky: false, progress: undefined });
      }
    }, 180);
  }

  const toastTests: { label: string; run: () => void | Promise<void> }[] = [
    { label: 'Sucesso', run: () => void toast.success('Operação concluída com sucesso') },
    { label: 'Erro', run: () => void toast.error('Não foi possível concluir a operação') },
    { label: 'Info', run: () => void toast('Mensagem neutra do launcher') },
    { label: 'Carregando → sucesso', run: () => fakePendingToast('success') },
    { label: 'Carregando → erro', run: () => fakePendingToast('error') },
    {
      label: 'Texto longo',
      run: () =>
        void toast.error(
          'Falha ao contatar os servidores da Epic. Verifique sua conexão e tente novamente em alguns instantes.'
        )
    }
  ];

  const updateTests: { label: string; run: () => void }[] = [
    { label: 'Fluxo completo', run: () => simulateLauncherUpdate() },
    { label: 'Versão fictícia 9.9.9', run: () => simulateLauncherUpdate('9.9.9') },
    {
      label: 'Card simples',
      run: () =>
        pushAchievement({ title: 'Atualização do launcher', message: 'Nova versão 9.9.9 encontrada.', sticky: true })
    },
    { label: 'Com barra de progresso', run: testAchievementProgress },
    { label: 'Limpar update adiado', run: () => pendingLauncherUpdate.set(null) }
  ];

  const nativeTests: { label: string; run: () => void | Promise<void> }[] = [
    { label: 'Pedir permissão', run: testPermission },
    { label: 'Enviar notificação', run: testNativeNotification },
    {
      label: 'Gravar no histórico',
      run: () => void activityLog.add('info', 'Entrada de teste criada pela página de dev')
    },
    { label: 'Limpar histórico', run: () => activityLog.clear() }
  ];
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description="Simule notificações e inspecione o ambiente. Só aparece em builds de desenvolvimento."
  title="Ferramentas de Dev"
>
  {#snippet actions()}
    <Badge variant="secondary">dev</Badge>
  {/snippet}

  <section class="space-y-3">
    <SectionHeading title="Ambiente" />
    <HudPanel class="p-4">
      <dl class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {#each environment as row (row.label)}
          <div class="flex items-baseline justify-between gap-3 border-b border-border/40 py-1">
            <dt class="text-xs text-muted-foreground">{row.label}</dt>
            <dd class="min-w-0 truncate text-sm font-medium">{row.value}</dd>
          </div>
        {/each}
      </dl>
    </HudPanel>
  </section>

  <section class="space-y-3">
    <SectionHeading
      description="Card no topo com as opções de atualizar agora, em segundo plano ou depois."
      title="Notificações de atualização"
    />
    <HudPanel class="flex flex-wrap gap-2 p-4">
      {#each updateTests as test (test.label)}
        <Button onclick={test.run} size="sm" variant="outline">{test.label}</Button>
      {/each}
    </HudPanel>
  </section>

  <section class="space-y-3">
    <SectionHeading
      description="Os mesmos usados ao iniciar ou encerrar o jogo e em erros gerais."
      title="Avisos temporários"
    />
    <HudPanel class="flex flex-wrap gap-2 p-4">
      {#each toastTests as test (test.label)}
        <Button onclick={test.run} size="sm" variant="outline">{test.label}</Button>
      {/each}
    </HudPanel>
  </section>

  <section class="space-y-3">
    <SectionHeading
      description="Alertas nativos do sistema e o log interno de atividades."
      title="Notificações do Windows e histórico"
    />
    <HudPanel class="flex flex-wrap gap-2 p-4">
      {#each nativeTests as test (test.label)}
        <Button onclick={test.run} size="sm" variant="outline">{test.label}</Button>
      {/each}
    </HudPanel>
  </section>

  <section class="space-y-3">
    <IntegrationsSettings />
  </section>
</PageContent>
