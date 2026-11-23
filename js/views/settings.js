import { getState, update, exportData, importData, resetAll } from '../store.js';
import { h, header, toast } from '../ui.js';
import { rerender } from '../router.js';
import { stravaReady, stravaAthlete, stravaWorker, setWorker, connect, disconnect } from '../strava.js';

export function settingsView() {
  const { settings, sessions, workouts } = getState();

  const exportFile = async () => {
    const name = `treino-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([exportData()], name, { type: 'application/json' });
    // No iPhone abre a folha de compartilhar (salvar no Arquivos, iCloud, WhatsApp…).
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); } catch {}
      return;
    }
    const a = h('a', { href: URL.createObjectURL(file), download: name });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const fileIn = h('input', {
    type: 'file', accept: 'application/json,.json', hidden: true,
    onChange: async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (!confirm('Importar vai substituir todos os dados atuais. Continuar?')) return;
      try { importData(await f.text()); toast('Backup restaurado'); rerender(); }
      catch { toast('Arquivo inválido'); }
    },
  });

  return h('div', { class: 'page' },
    header('Ajustes'),

    h('div', { class: 'card' },
      h('h3', { class: 'section' }, 'Treino'),
      h('label', { class: 'field inline' },
        h('span', {}, 'Peso corporal (kg)'),
        h('input', {
          type: 'number', inputmode: 'decimal', step: '0.1', value: settings.weight,
          onChange: (e) => update((s) => (s.settings.weight = +e.target.value.replace(',', '.') || 75)),
        }),
      ),
      h('p', { class: 'muted tiny' }, 'Usado pra estimar calorias gastas. Atualiza sozinho quando você registra o peso em Resultados.'),
      h('label', { class: 'field inline' },
        h('span', {}, 'Descanso padrão (s)'),
        h('input', {
          type: 'number', inputmode: 'numeric', step: 15, min: 0, value: settings.defaultRest,
          onChange: (e) => update((s) => (s.settings.defaultRest = +e.target.value || 0)),
        }),
      ),
    ),

    stravaCard(),

    h('div', { class: 'card' },
      h('h3', { class: 'section' }, 'Backup'),
      h('p', { class: 'muted' }, `${workouts.length} fichas · ${sessions.length} treinos salvos neste iPhone. Exporte de vez em quando: se apagar o app da tela inicial, os dados vão junto.`),
      h('button', { class: 'btn block', onClick: exportFile }, 'Exportar backup'),
      h('button', { class: 'btn block', onClick: () => fileIn.click() }, 'Importar backup'),
      fileIn,
    ),

    h('div', { class: 'card' },
      h('h3', { class: 'section' }, 'Instalar no iPhone'),
      h('p', { class: 'muted' }, 'No Safari: Compartilhar, depois Adicionar à Tela de Início. Abra sempre pelo ícone.'),
    ),

    h('button', {
      class: 'btn danger block',
      onClick: () => {
        if (!confirm('Apagar TODOS os dados? Não dá pra desfazer.')) return;
        resetAll(); toast('Dados apagados'); rerender();
      },
    }, 'Apagar todos os dados'),
  );
}

function stravaCard() {
  if (stravaReady()) {
    return h('div', { class: 'card' },
      h('h3', { class: 'section' }, 'Strava'),
      h('p', {}, `Conectado${stravaAthlete() ? ` como ${stravaAthlete()}` : ''}`),
      h('p', { class: 'muted small' }, 'As corridas aparecem na aba Treino de cada dia.'),
      h('button', { class: 'btn danger block', onClick: () => { if (confirm('Desconectar do Strava?')) { disconnect(); rerender(); } } }, 'Desconectar'),
    );
  }
  const worker = stravaWorker();
  let code = '';
  return h('div', { class: 'card' },
    h('h3', { class: 'section' }, 'Strava'),
    h('label', { class: 'field' }, h('span', {}, '1. Endereço do Worker'),
      h('input', { type: 'url', placeholder: 'treino-strava.seunome.workers.dev', value: worker, autocapitalize: 'off',
        onChange: (e) => { setWorker(e.target.value); rerender(); } })),
    h('a', { class: `btn block ${worker ? '' : 'disabled'}`, href: worker ? `${worker}/login` : null, target: '_blank', rel: 'noopener' }, '2. Autorizar no Strava'),
    h('label', { class: 'field' }, h('span', {}, '3. Cole o código que apareceu'),
      h('input', { placeholder: 'código', autocapitalize: 'off', autocomplete: 'off', onInput: (e) => (code = e.target.value) })),
    h('button', { class: 'btn primary block', onClick: async (e) => {
      if (!worker || !code.trim()) return toast('Preencha o endereço e o código');
      e.target.disabled = true;
      try { const me = await connect(code); toast(`Conectado: ${me.firstname ?? ''}`); }
      catch (err) { toast(err.message); }
      rerender();
    } }, 'Conectar'),
  );
}
