# Treino

App pessoal de academia e corrida (PWA) pra iPhone. JS puro com ES modules, sem build e sem dependências. Fica instalado na tela inicial e funciona offline.

- App: https://v1n1nam.github.io/treino
- Worker (Cloudflare): `https://treino-strava.hubner-vini.workers.dev`

---

## Onde ficam os dados

| O quê | Onde |
|---|---|
| Fichas, treinos, cargas, corridas, peso, água, refeições, perfil | **No iPhone**, no armazenamento do app da tela inicial |
| Cópia de segurança desses dados | **KV do Cloudflare** (backup automático) |
| Água registrada pelos atalhos | KV do Cloudflare, só até o app abrir e puxar |
| Corridas e treinos do relógio | Strava (o app copia o que for importado) |
| Segredo do Strava e chave do app | Variáveis do Worker no Cloudflare |
| Código | Este repositório (sem nenhum dado pessoal) |

Apagar o ícone do app, trocar de iPhone ou limpar os dados de sites do Safari **apaga os dados do iPhone**. O backup na nuvem existe pra isso.

---

## Backup automático

Liga sozinho quando o app tem o **endereço do Worker** e a **chave do app** (Ajustes → Atalhos do iPhone).

- Envia uma cópia 20 s depois de cada alteração, ao sair do app e, no mínimo, a cada 12 h.
- No Cloudflare ficam: o backup **mais recente** + **uma cópia por dia** dos últimos **14 dias**.
- Em Ajustes → Backup aparece "Backup na nuvem ativo · Último: há X min".
- Tudo dentro do plano grátis do Cloudflare (o uso fica muito abaixo de 1.000 gravações por dia).

### Guarde estas duas coisas

1. **Endereço do Worker:** `treino-strava.hubner-vini.workers.dev`
2. **Chave do app:** está em Ajustes → Atalhos do iPhone → Chave do app → Copiar. Salve no gerenciador de senhas ou nas Notas.

> Perdeu a chave? Sem problema, desde que você tenha acesso ao Cloudflare: invente uma chave nova, coloque em `WATER_KEY` (Settings → Variables and Secrets → editar → Deploy) e use essa nova pra restaurar. Os backups continuam lá. Depois atualize os links dos atalhos.

---

## Como recuperar os dados

### iPhone novo, ou app reinstalado

1. Abra **https://v1n1nam.github.io/treino** no **Safari**.
2. Compartilhar → **Adicionar à Tela de Início**.
3. Abra o app **pelo ícone** (não pelo Safari: os dois guardam dados separados).
4. Vá em **Ajustes → Backup → Restaurar da nuvem**.
5. Preencha:
   - **Endereço do Worker:** `treino-strava.hubner-vini.workers.dev`
   - **Chave do app:** a que você guardou
6. Toque em **Buscar backups** → escolha **Mais recente** → **Restaurar** → confirme.

O app recarrega com tudo de volta: fichas, histórico, peso, água, perfil, conexão com o Strava e a chave dos atalhos. Os atalhos do iPhone voltam a funcionar sem mudar nada.

### Voltar pra um dia anterior (desfazer um erro)

Ajustes → Backup → **Restaurar da nuvem** → escolha uma **Cópia de dd/mm/aaaa** → Restaurar.
Isso substitui os dados atuais pelos daquele dia.

### Sem acesso ao app (pelo navegador)

Pra baixar o backup como arquivo, abra no navegador:

```
https://treino-strava.hubner-vini.workers.dev/backup/list?key=SUA_CHAVE
https://treino-strava.hubner-vini.workers.dev/backup/get?key=SUA_CHAVE
```

O segundo link devolve o JSON completo. Salve como `.json` e importe pelo app em **Ajustes → Backup → Importar arquivo**.
Também dá pra ver os dados no painel: Cloudflare → Storage & Databases → KV → `treino` → chave `backup:latest`.

### Backup manual (sem nuvem)

Ajustes → Backup → **Exportar arquivo** (abre a folha de compartilhar: salve no Arquivos/iCloud). Pra voltar: **Importar arquivo**.

---

## Configuração do Cloudflare (referência)

Worker `treino-strava`, código em `worker/strava-worker.js`.

**Variables and Secrets**

| Nome | Tipo | Valor |
|---|---|---|
| `STRAVA_CLIENT_ID` | Text | ID do app em strava.com/settings/api |
| `STRAVA_CLIENT_SECRET` | Secret | segredo do app do Strava |
| `ALLOWED_ORIGIN` | Text | `https://v1n1nam.github.io` |
| `WATER_KEY` | Secret | chave do app (gerada em Ajustes) |

**Bindings**

| Nome | Tipo | Namespace |
|---|---|---|
| `TREINO_KV` | KV namespace | `treino` |

Ao mudar o código do Worker: copie `worker/strava-worker.js` (botão Raw no GitHub), cole no editor do Cloudflare e clique em **Deploy**.

**Rotas do Worker:** `/login` e `/callback` (Strava), `/refresh`, `/api/*` (proxy da API do Strava), `/water/add` e `/water/take` (atalhos), `/backup/put`, `/backup/list` e `/backup/get`.

---

## Strava

Fluxo: relógio → Huawei Saúde → Strava → Worker → app.

1. App → Ajustes → Strava → endereço do Worker → **Autorizar no Strava**.
2. Copie o código que aparece e cole no app → **Conectar**.

Na aba Treino de cada dia: corridas do Strava pra importar e musculações pra vincular ao treino do app (duração, FC, calorias e esforço vêm do relógio).

## Atalhos do iPhone (água)

Links em Ajustes → Atalhos do iPhone. No app Atalhos: ação **Obter Conteúdo do URL** com o link de Copo/Garrafa; pro "Outro", **Pedir Entrada** (número) e a variável no fim do link (`ml=`). Coloque na tela bloqueada (Personalizar → botões de baixo → Atalho) ou no widget de Atalhos.

---

## Estrutura do código

```
index.html            casca (tab bar, água, timer, toast)
manifest.webmanifest  instalação
sw.js                 service worker (rede primeiro, cache offline)
css/style.css         visual
js/app.js             rotas, atualizações, backup e atalhos
js/version.js         versão + novidades (mostradas após atualizar)
js/store.js           estado e persistência (localStorage)
js/backup.js          backup na nuvem
js/shortcuts.js       água pelos atalhos
js/strava.js          integração Strava
js/calc.js            músculos, progressão, peso, zonas de FC
js/bodymap.js         mapa muscular
js/data/              bibliotecas: exercícios, alimentos, músculos
js/views/             telas (day-*.js = abas do dia)
worker/               código do Cloudflare Worker
```

## Publicar uma versão nova

1. Aumente `VERSION` e liste as novidades em `js/version.js`.
2. Use o mesmo número em `CACHE` no `sw.js` e inclua arquivos novos em `ASSETS`.
3. Commit na `main`. O GitHub Pages publica em 1–2 min e o app mostra "Nova versão disponível".

## Rodar local

```
python3 -m http.server 8000
```
