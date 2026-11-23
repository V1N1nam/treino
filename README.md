# Treino

App de academia pessoal (PWA). JS puro com ES modules, sem build e sem dependências. Funciona offline e é instalado na tela inicial do iPhone.

## Estrutura

```
index.html            casca do app (tab bar, timer, toast)
manifest.webmanifest  metadados de instalação
sw.js                 service worker (cache offline)
css/style.css         tema e layout
js/app.js             rotas + bootstrap
js/router.js          navegação por hash
js/store.js           estado, persistência (localStorage) e consultas
js/ui.js              helper h() e formatadores
js/timer.js           timer de descanso global
js/dates.js           datas como chave AAAA-MM-DD
js/calc.js            calorias, músculos, ganhos/perdas
js/plan.js            tipos de dia (musculação/corrida/híbrido/descanso)
js/pickers.js         seletores de exercício e alimento
js/bodymap.js         mapa muscular (SVG frente/costas)
js/data/              bibliotecas: exercícios, alimentos, músculos
js/views/             uma tela por arquivo (day-*.js = abas do dia)
```

Modelo de dados em `js/store.js`: `plan` (semana), `days` (pré, pós, corridas, peso, esforço por data), `workouts` (fichas), `sessions` (musculação), `active`, `exercises`/`foods`/`meals` personalizados e `settings`. Migra sozinho da v1.

## Publicar (GitHub Pages)

1. Crie um repositório (ex: `treino`) e suba esta pasta.
2. Settings → Pages → Branch `main` / root → Save.
3. Abra `https://V1N1nam.github.io/treino/` **no Safari** do iPhone.
4. Compartilhar → "Adicionar à Tela de Início".

## Rodar local

```
python3 -m http.server 8000
```

## Atualizar

Depois de mudar qualquer arquivo, aumente `CACHE` em `sw.js` (`treino-v2`, `v3`...) e, se criar um arquivo novo, adicione em `ASSETS`. Feche e abra o app duas vezes pra pegar a versão nova.

## Dados

Ficam só no iPhone. Use Ajustes → Exportar backup de vez em quando (apagar o ícone da tela inicial apaga os dados).

## Strava (opcional)

Fluxo: relógio → Huawei Saúde → Strava → Worker → app. O Worker guarda o client secret, que não pode ficar no GitHub.

1. **Cloudflare** (grátis): Workers & Pages → Create → Worker → nome `treino-strava` → Deploy → Edit code → cole `worker/strava-worker.js` → Deploy. Anote o endereço (`treino-strava.SEUNOME.workers.dev`).
2. **Strava** (strava.com/settings/api): Nome `Treino`, Site `https://v1n1nam.github.io/treino`, Domínio de autorização callback = endereço do Worker **sem https://**. Criar. Copie o Client ID e o Client Secret.
3. **Cloudflare → Worker → Settings → Variables and Secrets**: `STRAVA_CLIENT_ID` (Text), `STRAVA_CLIENT_SECRET` (Secret), `ALLOWED_ORIGIN` = `https://v1n1nam.github.io` (Text). Deploy.
4. **App → Ajustes → Strava**: cole o endereço do Worker → Autorizar no Strava → copie o código da página → cole no app → Conectar.

As corridas do dia aparecem na aba Treino (busca automática quando o dia tem corrida planejada). Atividades que não são corrida são ignoradas.
