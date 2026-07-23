#!/usr/bin/env node
/**
 * VALIDADOR PRÉ-PUBLICAÇÃO — Painel DOC BODY SCAN
 * ------------------------------------------------
 * Criado 23/07/2026 depois dos erros do Dia 3:
 *   1) campo "Blindagem" saiu rotulado "(com Davi)" — nome do parceiro de
 *      musculação vazou para o campo da blindagem (atividades diferentes);
 *   2) B2 mostrava "Peito + Ombro" quando a grade diz "Peito + Tríceps";
 *   3) água mostrava "DIA COMEÇANDO" às 20h30.
 * Todos os três passariam despercebidos numa conferência só de cor/HTML.
 *
 * USO (obrigatório antes do git push):
 *     node validate.js index.html && git push "https://<TOKEN>@github.com/..." main
 * Sai com código 1 se houver ERRO. WARN não bloqueia, mas deve ser lido.
 */

const fs = require('fs');
const path = process.argv[2] || 'index.html';
const html = fs.readFileSync(path, 'utf8');
const txt = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const errors = [];
const warns = [];
const E = (code, msg) => errors.push(`[${code}] ${msg}`);
const W = (code, msg) => warns.push(`[${code}] ${msg}`);

/* ---------- relógio real (nunca estimar — regra do Doc, 22/07) ---------- */
const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
const dd = String(now.getDate()).padStart(2, '0');
const mm = String(now.getMonth() + 1).padStart(2, '0');
const hoje = `${dd}/${mm}`;
const hora = now.getHours();
const semana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'][now.getDay()];
// Dia 1 do sistema = 21/07/2026
const diaN = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) -
  new Date(2026, 6, 21)) / 86400000) + 1;

/* ================= 1. CONTAMINAÇÃO DE CAMPOS ================= */
/* O bug do Dia 3: cada campo só pode citar o que é dele.        */
const PARCEIROS = ['Davi', 'Nicolle', 'Campos'];
const campo = (rotulo) => {
  const re = new RegExp(`<span>\\s*${rotulo}[^<]*</span>\\s*<b[^>]*>([^<]*)</b>`, 'i');
  const m = html.match(re);
  return m ? m[1].trim() : null;
};

const blind = campo('Blindagem');
if (blind) {
  PARCEIROS.forEach(p => {
    if (new RegExp(p, 'i').test(blind))
      E('CONTAMINA', `campo Blindagem cita "${p}" — parceiro de treino não pertence à blindagem (é sessão solo). Valor: "${blind}"`);
  });
  if (/musculação|treino|corrida/i.test(blind))
    E('CONTAMINA', `campo Blindagem cita outra atividade. Valor: "${blind}"`);
}

const dieta = campo('DIETA');
if (dieta && PARCEIROS.some(p => new RegExp(p, 'i').test(dieta)))
  E('CONTAMINA', `campo DIETA cita parceiro de treino. Valor: "${dieta}"`);

/* ================= 2. COERÊNCIA COM A GRADE (metas/body.md) ================= */
const GRADE = {
  'Seg': { ex: 'Pernas', quem: 'Nicolle' },
  'Ter': { ex: 'Costas + Bíceps', quem: 'Nicolle' },
  'Qui': { ex: 'Peito + Tríceps', quem: 'Davi' },
};
Object.entries(GRADE).forEach(([dia, { ex, quem }]) => {
  const re = new RegExp(`<span>\\s*${dia}\\s*·\\s*([^<(]+)\\(([^)]+)\\)`, 'i');
  const m = html.match(re);
  if (!m) { W('GRADE', `linha B2 de ${dia} não encontrada`); return; }
  const exFound = m[1].trim(), quemFound = m[2].trim();
  if (exFound.toLowerCase() !== ex.toLowerCase())
    E('GRADE', `B2 ${dia}: painel diz "${exFound}", a grade diz "${ex}"`);
  if (quemFound.toLowerCase() !== quem.toLowerCase())
    E('GRADE', `B2 ${dia}: painel diz treinador "${quemFound}", a grade diz "${quem}"`);
});

/* ================= 3. TEXTO VENCIDO PELO RELÓGIO ================= */
/* "DIA COMEÇANDO" às 20h30 foi o 3º erro do Dia 3.              */
const JANELAS = [
  { frase: /DIA COMEÇANDO/i, ate: 10, oq: 'só faz sentido antes das 10h' },
  { frase: /MANHÃ AINDA|AINDA DE MANHÃ/i, ate: 12, oq: 'só faz sentido antes do meio-dia' },
  { frase: /DIA COMEÇOU AGORA/i, ate: 9, oq: 'só faz sentido antes das 9h' },
];
JANELAS.forEach(({ frase, ate, oq }) => {
  if (frase.test(txt) && hora >= ate)
    E('RELOGIO', `texto "${txt.match(frase)[0]}" no painel às ${hora}h — ${oq}`);
});

/* ================= 4. CARIMBO E DATA ================= */
const carimbo = txt.match(/ATUALIZADO\s+(\d{2}\/\d{2})\/(\d{4})\s+(\d{1,2})h(\d{2})/i);
if (!carimbo) E('CARIMBO', 'rodapé sem carimbo no formato "ATUALIZADO DD/MM/AAAA HHhMM"');
else {
  if (carimbo[1] !== hoje) E('CARIMBO', `carimbo diz ${carimbo[1]}, hoje é ${hoje}`);
  const diff = Math.abs((hora * 60 + now.getMinutes()) - (+carimbo[3] * 60 + +carimbo[4]));
  if (diff > 20) E('CARIMBO', `carimbo ${carimbo[3]}h${carimbo[4]} está ${diff} min fora da hora real (${hora}h${String(now.getMinutes()).padStart(2, '0')}) — leia com TZ=America/Sao_Paulo date`);
}
const cab = txt.match(/DIA\s+(\d+)\s*·\s*([A-ZÇ]{3})\s+(\d{2}\/\d{2})/i);
if (!cab) E('DATA', 'cabeçalho STATUS sem "DIA N · DDD DD/MM"');
else {
  if (+cab[1] !== diaN) E('DATA', `cabeçalho diz DIA ${cab[1]}, hoje é DIA ${diaN}`);
  if (cab[2].toUpperCase() !== semana) E('DATA', `cabeçalho diz ${cab[2]}, hoje é ${semana}`);
  if (cab[3] !== hoje) E('DATA', `cabeçalho diz ${cab[3]}, hoje é ${hoje}`);
}

/* ================= 5. SEMÁFORO COERENTE COM O NÚMERO ================= */
const classeDe = (rotulo) => {
  const re = new RegExp(`<span>\\s*${rotulo}[^<]*</span>\\s*<b class="([^"]*)"`, 'i');
  const m = html.match(re); return m ? m[1] : '';
};
const dor = campo('Dor');
if (dor !== null) {
  const n = parseFloat((dor.match(/\d+([.,]\d+)?/) || ['0'])[0].replace(',', '.'));
  const c = classeDe('Dor');
  if (n > 0 && !/red/.test(c)) E('SEMAFORO', `dor ${n} deveria ser .red, está "${c}"`);
  if (n === 0 && !/ok/.test(c)) E('SEMAFORO', `dor 0 deveria ser .ok, está "${c}"`);
  const dotVerde = /\.dor \.dot\{[^}]*#7CFF9B/i.test(html);
  if (n === 0 && !dotVerde) E('MARCADOR', 'dor 0 mas o marcador da figura não está verde (#7CFF9B)');
  if (n > 0 && dotVerde) E('MARCADOR', `dor ${n} mas o marcador da figura está verde`);
}
const sono = campo('Sono');
if (sono !== null && /\d/.test(sono)) {
  const h = parseFloat(sono.replace(',', '.').match(/\d+([.]\d+)?/)[0]);
  const c = classeDe('Sono');
  if (h < 7 && !/red/.test(c)) E('SEMAFORO', `sono ${h}h (<7h) deveria ser .red, está "${c}"`);
  if (h >= 7 && !/ok/.test(c)) E('SEMAFORO', `sono ${h}h (≥7h) deveria ser .ok, está "${c}"`);
}
const extras = campo('EXTRAS DO MÊS');
if (extras) {
  const n = parseInt(extras, 10);
  const c = classeDe('EXTRAS DO MÊS');
  const esperado = n === 0 ? 'ok' : n === 1 ? 'warn' : 'red';
  if (!new RegExp(esperado).test(c)) E('SEMAFORO', `extras ${n}/2 deveria ser .${esperado}, está "${c}" (regra B5)`);
}

/* ================= 6. PLACEHOLDERS E TEXTOS PROIBIDOS ================= */
const ph = html.match(/\{\{[A-Z_0-9]+\}\}/g);
if (ph) E('PLACEHOLDER', `sobraram placeholders do template: ${[...new Set(ph)].join(', ')}`);

['USUÁRIO/IDENTIDADE', 'MODO HOLOGRAMA', 'POST. COXA E', 'BIOMETRIA']
  .forEach(t => { if (txt.toUpperCase().includes(t)) E('PROIBIDO', `texto proibido pelo template: "${t}"`); });

/* ================= 7. PRIVACIDADE (página PÚBLICA — LGPD) ================= */
if (!/name="robots"[^>]*noindex/i.test(html)) E('PRIVACIDADE', 'falta <meta name="robots" content="noindex,nofollow">');
[/paciente/i, /cirurgia de [A-Z]/, /consultório/i, /clínica/i].forEach(re => {
  if (re.test(txt)) W('PRIVACIDADE', `padrão sensível encontrado: ${txt.match(re)[0]} — painel é público, só métricas fitness`);
});
/* nomes próprios permitidos; qualquer outro "Nome Sobrenome" acende alerta.
   NUNCA acrescente nome de paciente a esta lista — este arquivo é PÚBLICO. */
const OK_NOMES = new Set(['Mr T', 'Daily Plan', 'Doc Body', 'Body Scan', 'Jim Rohn', 'James Clear',
  'Tony Robbins', 'Ray Dalio', 'Segoe UI', 'Courier New', 'Google Photos']);
(txt.match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{2,}\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{2,}\b/g) || [])
  .forEach(n => { if (!OK_NOMES.has(n)) W('PRIVACIDADE', `nome completo no painel público: "${n}" — confirmar que não é paciente`); });

/* ================= 8. CASCATA DE COR (lição v2.9 — 22/07) ================= */
['ok', 'warn', 'red'].forEach(c => {
  const re = new RegExp(`\\.${c}\\{color:[^;}]*!important`, 'i');
  if (!re.test(html)) E('CASCATA', `.${c} sem !important — .kv b vence por especificidade e a cor não pinta (bug 22/07)`);
});

/* ================= SAÍDA ================= */
const R = '\x1b[31m', Y = '\x1b[33m', G = '\x1b[32m', X = '\x1b[0m';
console.log(`\n── VALIDADOR DO PAINEL · ${hoje} ${hora}h${String(now.getMinutes()).padStart(2, '0')} · DIA ${diaN} (${semana}) ──`);
warns.forEach(w => console.log(`${Y}WARN ${X}${w}`));
errors.forEach(e => console.log(`${R}ERRO ${X}${e}`));
if (!errors.length && !warns.length) console.log(`${G}✓ tudo certo — pode publicar.${X}`);
else if (!errors.length) console.log(`${G}✓ sem erros bloqueantes${X} (${warns.length} aviso(s) — leia antes de publicar).`);
else console.log(`\n${R}✗ ${errors.length} erro(s) — NÃO PUBLIQUE antes de corrigir.${X}`);
process.exit(errors.length ? 1 : 0);
