# Como publicar o painel — fluxo obrigatório

> Criado 23/07/2026 (Dia 3) depois de três erros que passaram numa publicação
> só conferida "no olho". A trava agora mora aqui dentro do repo: quem clona,
> recebe o validador junto. Não existe publicar sem passar por ele.

## O fluxo (nunca pule o passo 3)

```bash
git clone --depth 1 "https://<TOKEN>@github.com/nelsoni76/painel.git" painel-repo
# 1. escreva o index.html novo em painel-repo/index.html
cd painel-repo

# 2. leia a hora REAL (nunca estime)
TZ=America/Sao_Paulo date

# 3. VALIDE — bloqueia o push se houver erro
node validate.js index.html || exit 1

# 4. só então
git add index.html
git -c user.name="Mr. T." -c user.email="mrt@dailyplan.local" commit -m "painel <DATA HHhMM>"
git push "https://<TOKEN>@github.com/nelsoni76/painel.git" main
```

Encadeie com `&&` para tornar impossível esquecer:

```bash
node validate.js index.html && git add index.html && git commit -m "..." && git push "https://<TOKEN>@github.com/nelsoni76/painel.git" main
```

Token sempre mascarado na saída: `2>&1 | sed -E 's/github_pat_[A-Za-z0-9_]+/***TOKEN***/g'`

## Regra número 1 — o que o Doc informa é a verdade

Os docs de plano (`metas/body.md`, a grade da semana, o template) dizem o que
**estava previsto**. O que o Doc relatou por voz/texto diz o que **aconteceu**.
Quando os dois divergem, **o relato vence, sempre**. Treinou peito+ombro numa
quinta prevista para peito+tríceps? O painel escreve peito+ombro. Divergência do
plano é dado de coaching (nota no log, conversa das 21h) — nunca um erro a
"corrigir" no painel.

*Em 23/07 eu troquei "Peito + Ombro" por "Peito + Tríceps" porque era o que o
documento dizia, apagando o relato do Doc — e ainda transformei isso em regra do
validador. Os dois foram desfeitos. O validador não checa e não deve checar
aderência ao plano.*

## O que o validador pega

| Código | O que checa | Erro que originou |
|---|---|---|
| `CONTAMINA` | nome de parceiro vazando para o campo Blindagem/Dieta (confirme contra o relato antes de remover) | "Blindagem ✓ FEITA (com Davi)" — 23/07 |
| `RELOGIO` | texto que venceu com a hora ("DIA COMEÇANDO" às 20h) | água 23/07 |
| `CARIMBO` | rodapé com data de hoje e hora ±20 min da real | carimbo 18h54 vivo às 20h30 |
| `DATA` | `DIA N · DDD DD/MM` bate com o calendário | — |
| `SEMAFORO` | dor>0→red, sono<7h→red, extras 0/1/2→ok/warn/red (B5) | — |
| `MARCADOR` | bola da lesão verde sse dor 0 | — |
| `CASCATA` | `.ok/.warn/.red` com `!important` | bug de 22/07 (cores nunca pintaram) |
| `PLACEHOLDER` | sobrou `{{ALGO}}` do template | — |
| `PROIBIDO` | textos banidos pelo template | — |
| `PRIVACIDADE` | `noindex`, nome completo, padrão de paciente | — |

**O validador pega erro mecânico** (texto herdado, dado vencido, cor que não
pinta, vazamento de privacidade). Ele **não julga o conteúdo do dia** — isso é
com o Doc.

## Regra de ouro do conteúdo

**Um campo só fala do que é dele.** Musculação tem treinador; corrida tem
parceiro; blindagem é sessão solo; dieta é dieta. Quando um registro do dia
misturar assuntos, separe antes de escrever no painel — não deixe o texto de
uma atividade "pegar carona" no campo de outra. Foi assim que "com Davi"
parou no campo errado.

**Nunca acrescente nome de paciente à whitelist do validador** — este repo é
público (LGPD).
