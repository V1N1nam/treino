import { getState, update, exportData, importData, resetAll } from '../store.js';
import { h, header, toast } from '../ui.js';
import { rerender } from '../router.js';
import { VERSION } from '../version.js';
import { GOALS, ZONES, profile, bmi, bmiLabel, hrMax, waterTarget } from '../calc.js';
import { fmtKg } from '../ui.js';
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

    profileCard(),

    h('div', { class: 'card' },
      h('h3', { class: 'section' }, 'Treino'),
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

    h('div', { class: 'card' },
      h('div', { class: 'card-head' },
        h('div', {}, h('h3', { class: 'section' }, 'Versão'), h('p', {}, VERSION)),
        h('button', { class: 'btn small', onClick: checkUpdate }, 'Procurar atualização')),
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

async function checkUpdate() {
  const reg = await navigator.serviceWorker?.getRegistration();
  if (!reg) return toast('Atualização indisponível neste navegador');
  toast('Procurando…');
  await reg.update().catch(() => {});
  if (reg.installing || reg.waiting) toast('Baixando versão nova…');
  else toast('Você já está na versão mais recente');
}

function profileCard() {
  const p = profile();
  const setP = (patch) => { update((s) => (s.settings.profile = { ...s.settings.profile, ...patch })); rerender(); };
  const num = (label, value, unit, onSet, step = 1) => h('label', { class: 'field inline' },
    h('span', {}, label),
    h('div', { class: 'row tight' },
      h('input', { type: 'number', inputmode: 'decimal', step, value: value || '', placeholder: '—', onChange: (e) => onSet(+e.target.value.replace(',', '.') || 0) }),
      h('span', { class: 'muted small unit-w' }, unit)));
  const b = bmi(p);
  const max = p.age > 0 ? hrMax(p.age) : 0;

  return h('div', { class: 'card' },
    h('h3', { class: 'section' }, 'Perfil'),
    num('Altura', p.height, 'cm', (v) => setP({ height: v })),
    num('Peso', p.weight, 'kg', (v) => { update((s) => (s.settings.weight = v || s.settings.weight)); rerender(); }, 0.1),
    num('Idade', p.age, 'anos', (v) => setP({ age: v })),
    h('div', { class: 'field' }, h('span', {}, 'Objetivo com o peso'),
      h('div', { class: 'seg type-seg' }, Object.entries(GOALS).map(([k, g]) =>
        h('button', { class: p.goal === k ? 'on' : '', onClick: () => setP({ goal: k }) }, g.label)))),
    num('Copo', (getState().settings.water ?? {}).cup ?? 250, 'ml', (v) => { update((s) => (s.settings.water = { ...s.settings.water, cup: v || 250 })); rerender(); }, 50),
    num('Garrafa', (getState().settings.water ?? {}).bottle ?? 500, 'ml', (v) => { update((s) => (s.settings.water = { ...s.settings.water, bottle: v || 500 })); rerender(); }, 25),
    h('div', { class: 'profile-out' },
      out('IMC', b ? fmtKg(b) : '—', b ? bmiLabel(b) : 'precisa da altura'),
      out('Água', `${(waterTarget() / 1000).toLocaleString('pt-BR')} L/dia`, '35 ml por kg'),
    ),
    max > 0 ? h('div', { class: 'zones' },
      h('div', { class: 'card-head' }, h('span', { class: 'section' }, 'Zonas de frequência cardíaca'), h('span', { class: 'muted small' }, `FC máx ~${max} bpm`)),
      ZONES.map((z, i) => {
        const lo = Math.round(z.from * max), hi = Math.round((ZONES[i + 1]?.from ?? 1) * max);
        return h('div', { class: 'zone-row' }, h('span', { class: `zone ${z.code.toLowerCase()}` }, z.code), h('span', { class: 'grow' }, z.label), h('span', { class: 'muted small' }, `${lo}–${hi} bpm`));
      })) : h('p', { class: 'muted small' }, 'Coloque a idade pra ver suas zonas de frequência cardíaca.'),
  );
}

const out = (label, value, sub) => h('div', { class: 'out' }, h('small', {}, label), h('strong', {}, value), h('span', { class: 'muted tiny' }, sub));
