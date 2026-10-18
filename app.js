'use strict';

// ---------- Armazenamento ----------
const CHAVE = 'economija:v1';

function carregar() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) {
      const d = JSON.parse(bruto);
      return { lancamentos: d.lancamentos || [], pagos: d.pagos || {}, config: d.config || {} };
    }
  } catch (e) { /* armazenamento indisponível: começa vazio */ }
  return { lancamentos: [], pagos: {}, config: {} };
}

function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)); }
  catch (e) { alert('Não foi possível salvar os dados neste navegador.'); }
}

const estado = carregar();

// ---------- Utilitários de mês (formato "AAAA-MM") ----------
function hojeMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function somaMeses(ym, n) {
  const [a, m] = ym.split('-').map(Number);
  const t = a * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}
function difMeses(de, ate) {
  const [a1, m1] = de.split('-').map(Number);
  const [a2, m2] = ate.split('-').map(Number);
  return (a2 * 12 + m2) - (a1 * 12 + m1);
}
function nomeMes(ym, curto = false) {
  const [a, m] = ym.split('-').map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: curto ? 'short' : 'long', year: 'numeric' });
}

// ---------- Moeda ----------
// Moeda padrão de cada país (usada só no primeiro uso, pela região do celular)
const MOEDA_POR_PAIS = {
  // Zona do euro
  PT: 'EUR', ES: 'EUR', FR: 'EUR', DE: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', LU: 'EUR',
  IE: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', SK: 'EUR',
  SI: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR', BG: 'EUR', AD: 'EUR', MC: 'EUR', SM: 'EUR',
  VA: 'EUR', ME: 'EUR', XK: 'EUR',
  // Língua portuguesa
  BR: 'BRL', AO: 'AOA', MZ: 'MZN', CV: 'CVE', GW: 'XOF', ST: 'STN', TL: 'USD', MO: 'MOP',
  // Américas
  US: 'USD', CA: 'CAD', MX: 'MXN', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN', UY: 'UYU',
  PY: 'PYG', BO: 'BOB', VE: 'VES', EC: 'USD', SV: 'USD', PR: 'USD',
  // Resto da Europa
  GB: 'GBP', CH: 'CHF', LI: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', IS: 'ISK', PL: 'PLN',
  CZ: 'CZK', HU: 'HUF', RO: 'RON', RS: 'RSD', UA: 'UAH', RU: 'RUB', TR: 'TRY',
  // Ásia, Oceania e África
  JP: 'JPY', CN: 'CNY', HK: 'HKD', TW: 'TWD', KR: 'KRW', IN: 'INR', SG: 'SGD', MY: 'MYR',
  TH: 'THB', ID: 'IDR', PH: 'PHP', VN: 'VND', PK: 'PKR', BD: 'BDT', AE: 'AED', SA: 'SAR',
  QA: 'QAR', IL: 'ILS', AU: 'AUD', NZ: 'NZD', ZA: 'ZAR', NG: 'NGN', EG: 'EGP', MA: 'MAD',
};

// Descobre a moeda pela região configurada no celular (sem GPS, sem internet)
function moedaDoAparelho () {
  const idiomas = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'pt-PT'];
  for (const idioma of idiomas) {
    let regiao = null;
    try { regiao = new Intl.Locale(idioma).maximize().region; } catch (e) { /* idioma inválido */}
    if (regiao && MOEDA_POR_PAIS[regiao]) return MOEDA_POR_PAIS[regiao];
  }
  return 'EUR';
}

// Primeiro uso: escolhe automáticamente e salva
if (!estado.config.moeda) {
  estado.config.moeda = moedaDoAparelho();
  salvar();
}

let formatador;
function aplicarMoeda() {
  const moeda = estado.config.moeda;
  const local = moeda === 'BRL' ? 'pt-BR' : 'pt-PT';
  try {
    formatador = new Intl.NumberFormat(local, { style: 'currency', currency: moeda });
  } catch (e) {
    estado.config.moeda = 'EUR';
    formatador = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
  }
  const simbolo = formatador.formatToParts(0).find(p => p.type === 'currency')?.value || moeda;
  const el = document.getElementById('simbolo-moeda');
  if (el) el.textContent = simbolo;
}
aplicarMoeda();

const dinheiro = v => formatador.format(v);

// Lista de todas as moedas do mundo, com nome em português
function listaMoedas() {
  let codigos = [];
  try { codigos = Intl.supportedValuesOf('currency'); } catch (e) { /* navegador antigo */ }
  if (!codigos.length) codigos = Object.values(MOEDA_POR_PAIS).filter((c, i, a) => a.indexOf(c) === i);
  let nomes = null;
  try { nomes = new Intl.DisplayNames(['pt-BR'], { type: 'currency' }); } catch (e) { /* sem nomes */}
  return codigos
    .map(c => ({ codigo: c, nome: nomes ? nomes.of(c) : c }))
    // Remove moedas antigas (nome com ano, ex: "(1964-2022)"),
    // moedas sem nome traduzido (ex: "XSU") e unidades que não são dinheiro do dia a dia
    .filter(m => !/\d{4}/.test.apply(m.nome) && m.nome !== m.codigo && !['XDR', 'XSU', 'XUA', 'XAU', 'XAG', 'XPT', 'XPD'].includes(m.codigo))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Regras de recorrência ----------
// Mês final de um lançamento (null = sem fim)
function mesFinal(l) {
  if (l.recorrencia === 'unica') return l.inicio;
  if (l.recorrencia === 'parcelada') return somaMeses(l.inicio, l.parcelas - 1);
  return l.fim || null;
}

// Retorna a ocorrência do lançamento no mês, ou null se não cai nesse mês
function ocorrencia(l, ym) {
  const k = difMeses(l.inicio, ym);
  if (k < 0) return null;
  if (l.recorrencia === 'unica' && k !== 0) return null;
  if (l.recorrencia === 'parcelada' && k >= l.parcelas) return null;
  if (l.recorrencia === 'fixa' && l.fim && difMeses(ym, l.fim) < 0) return null;
  return {
    lanc: l,
    mes: ym,
    valor: l.valor,
    parcela: l.recorrencia === 'parcelada' ? k + 1 : null,
    pago: !!estado.pagos[`${l.id}|${ym}`],
  };
}

function ocorrenciasDoMes(ym) {
  return estado.lancamentos.map(l => ocorrencia(l, ym)).filter(Boolean);
}

function resumoMes(ym) {
  const oc = ocorrenciasDoMes(ym);
  const r = { mes: ym, receitas: 0, fixas: 0, parceladas: 0, avulsas: 0, despesas: 0, pendente: 0, itens: oc };
  for (const o of oc) {
    if (o.lanc.tipo === 'receita') { r.receitas += o.valor; continue; }
    r.despesas += o.valor;
    if (o.lanc.recorrencia === 'fixa') r.fixas += o.valor;
    else if (o.lanc.recorrencia === 'parcelada') r.parceladas += o.valor;
    else r.avulsas += o.valor;
    if (!o.pago) r.pendente += o.valor;
  }
  r.saldo = r.receitas - r.despesas;
  return r;
}

function rotuloRecorrencia(l) {
  if (l.recorrencia === 'fixa') return 'Fixa mensal';
  if (l.recorrencia === 'parcelada') return `${l.parcelas}x`;
  return 'Única';
}

// ---------- Estado da interface ----------
let mesSel = hojeMes();
let abaSel = 'mes';
let editandoId = null;

const $ = s => document.querySelector(s);

// ---------- Renderização ----------
function render() {
  $('#mes-atual').textContent = nomeMes(mesSel);
  if (abaSel === 'mes') renderMes();
  if (abaSel === 'relatorio') renderRelatorio();
  if (abaSel === 'lancamentos') renderTodos();
}

function itemLista(o) {
  const l = o.lanc;
  let badge = '';
  if (l.recorrencia === 'fixa') badge = '<span class="badge">fixa</span>';
  if (l.recorrencia === 'parcelada') badge = `<span class="badge">parcela ${o.parcela}/${l.parcelas}</span>`;
  const rotuloPago = l.tipo === 'receita' ? 'Recebido' : 'Pago';
  return `<li class="${o.pago ? 'pago' : ''}">
    <input type="checkbox" data-pagar="${l.id}" ${o.pago ? 'checked' : ''} title="${rotuloPago}" aria-label="${rotuloPago}">
    <div class="desc">${esc(l.descricao)}${badge}<small>${esc(l.categoria || 'Sem categoria')}</small></div>
    <span class="valor ${l.tipo === 'receita' ? 'pos' : 'neg'}">${dinheiro(o.valor)}</span>
    <button class="link" data-editar="${l.id}" title="Editar">✎</button>
  </li>`;
}

function renderMes() {
  const r = resumoMes(mesSel);
  $('#c-receitas').textContent = dinheiro(r.receitas);
  $('#c-despesas').textContent = dinheiro(r.despesas);
  const s = $('#c-saldo');
  s.textContent = dinheiro(r.saldo);
  s.className = r.saldo >= 0 ? 'pos' : 'neg';
  $('#c-pendente').textContent = dinheiro(r.pendente);

  const ordena = (a, b) => b.valor - a.valor;
  const rec = r.itens.filter(o => o.lanc.tipo === 'receita').sort(ordena);
  const des = r.itens.filter(o => o.lanc.tipo === 'despesa').sort(ordena);
  $('#lista-receitas').innerHTML = rec.length ? rec.map(itemLista).join('') : '<li class="vazio">Nenhuma receita neste mês.</li>';
  $('#lista-despesas').innerHTML = des.length ? des.map(itemLista).join('') : '<li class="vazio">Nenhuma despesa neste mês.</li>';
}

function renderRelatorio() {
  const n = Number($('#horizonte').value);
  const meses = Array.from({ length: n }, (_, i) => somaMeses(mesSel, i));
  const resumos = meses.map(resumoMes);

  // Tabela de projeção
  let acumulado = 0;
  const tot = { receitas: 0, fixas: 0, parceladas: 0, avulsas: 0, despesas: 0, saldo: 0 };
  const linhas = resumos.map(r => {
    acumulado += r.saldo;
    for (const k in tot) tot[k] += r[k];
    return `<tr>
      <td style="text-transform:capitalize">${nomeMes(r.mes, true)}</td>
      <td class="num pos">${dinheiro(r.receitas)}</td>
      <td class="num">${dinheiro(r.fixas)}</td>
      <td class="num">${dinheiro(r.parceladas)}</td>
      <td class="num">${dinheiro(r.avulsas)}</td>
      <td class="num neg">${dinheiro(r.despesas)}</td>
      <td class="num ${r.saldo >= 0 ? 'pos' : 'neg'}">${dinheiro(r.saldo)}</td>
      <td class="num ${acumulado >= 0 ? 'pos' : 'neg'}">${dinheiro(acumulado)}</td>
    </tr>`;
  });
  const tabela = $('#tabela-projecao');
  tabela.querySelector('tbody').innerHTML = linhas.join('');
  tabela.querySelector('tfoot')?.remove();
  tabela.insertAdjacentHTML('beforeend', `<tfoot><tr>
    <td>Total</td>
    <td class="num">${dinheiro(tot.receitas)}</td>
    <td class="num">${dinheiro(tot.fixas)}</td>
    <td class="num">${dinheiro(tot.parceladas)}</td>
    <td class="num">${dinheiro(tot.avulsas)}</td>
    <td class="num">${dinheiro(tot.despesas)}</td>
    <td class="num ${tot.saldo >= 0 ? 'pos' : 'neg'}">${dinheiro(tot.saldo)}</td>
    <td></td>
  </tr></tfoot>`);

  // Gastos fixos e parcelados ainda ativos a partir do mês selecionado
  const ativos = estado.lancamentos
    .filter(l => l.tipo === 'despesa' && l.recorrencia !== 'unica')
    .filter(l => { const f = mesFinal(l); return !f || difMeses(mesSel, f) >= 0; })
    .sort((a, b) => b.valor - a.valor);
  const totalMensal = ativos.filter(l => ocorrencia(l, mesSel)).reduce((s, l) => s + l.valor, 0);
  $('#tabela-fixos tbody').innerHTML = ativos.length ? ativos.map(l => {
    const f = mesFinal(l);
    let situacao = '—';
    if (l.recorrencia === 'parcelada') {
      const k = difMeses(l.inicio, mesSel);
      situacao = k < 0 ? `começa em ${nomeMes(l.inicio, true)}` : `parcela ${k + 1}/${l.parcelas} · faltam ${l.parcelas - k}`;
    } else if (difMeses(l.inicio, mesSel) < 0) {
      situacao = `começa em ${nomeMes(l.inicio, true)}`;
    }
    return `<tr>
      <td>${esc(l.descricao)}</td>
      <td>${esc(l.categoria || '—')}</td>
      <td>${rotuloRecorrencia(l)}</td>
      <td class="num neg">${dinheiro(l.valor)}</td>
      <td>${situacao}</td>
      <td style="text-transform:capitalize">${f ? nomeMes(f, true) : 'sem fim'}</td>
    </tr>`;
  }).join('') + `<tr><td colspan="3"><strong>Comprometido em ${nomeMes(mesSel, true)}</strong></td><td class="num"><strong>${dinheiro(totalMensal)}</strong></td><td colspan="2"></td></tr>`
    : '<tr><td colspan="6" style="color:var(--muted)">Nenhum gasto fixo ou parcelado cadastrado.</td></tr>';

  // Detalhe por mês
  $('#detalhe-meses').innerHTML = resumos.map(r => {
    const itens = [...r.itens].sort((a, b) => (a.lanc.tipo === b.lanc.tipo ? b.valor - a.valor : a.lanc.tipo === 'receita' ? -1 : 1));
    const corpo = itens.length ? itens.map(o => `<tr>
        <td>${esc(o.lanc.descricao)}</td>
        <td>${esc(o.lanc.categoria || '—')}</td>
        <td>${o.parcela ? `parcela ${o.parcela}/${o.lanc.parcelas}` : rotuloRecorrencia(o.lanc)}</td>
        <td class="num ${o.lanc.tipo === 'receita' ? 'pos' : 'neg'}">${o.lanc.tipo === 'receita' ? '+' : '−'} ${dinheiro(o.valor)}</td>
      </tr>`).join('') : '<tr><td colspan="4" style="color:var(--muted)">Sem lançamentos.</td></tr>';
    return `<details>
      <summary><span>${nomeMes(r.mes)}</span><span class="${r.saldo >= 0 ? 'pos' : 'neg'}">${dinheiro(r.saldo)}</span></summary>
      <table><tbody>${corpo}</tbody></table>
    </details>`;
  }).join('');
}

function renderTodos() {
  const lista = [...estado.lancamentos].sort((a, b) => a.tipo.localeCompare(b.tipo) || a.descricao.localeCompare(b.descricao));
  $('#tabela-todos tbody').innerHTML = lista.length ? lista.map(l => `<tr>
      <td>${esc(l.descricao)}<br><small style="color:var(--muted)">${esc(l.categoria || '')}</small></td>
      <td class="${l.tipo === 'receita' ? 'pos' : 'neg'}">${l.tipo === 'receita' ? 'Receita' : 'Despesa'}</td>
      <td>${rotuloRecorrencia(l)}${l.recorrencia === 'fixa' && l.fim ? ` até ${nomeMes(l.fim, true)}` : ''}</td>
      <td class="num">${dinheiro(l.valor)}${l.recorrencia === 'parcelada' ? `<br><small style="color:var(--muted)">total ${dinheiro(l.valor * l.parcelas)}</small>` : ''}</td>
      <td style="text-transform:capitalize">${nomeMes(l.inicio, true)}</td>
      <td><button class="link" data-editar="${l.id}">Editar</button><button class="link" data-excluir="${l.id}">Excluir</button></td>
    </tr>`).join('') : '<tr><td colspan="6" style="color:var(--muted)">Nenhum lançamento ainda. Comece pelo seu salário e suas contas fixas.</td></tr>';
}

// ---------- Formulário ----------
const dlg = $('#dlg');
const form = $('#form');

function atualizarCamposForm() {
  const rec = form.recorrencia.value;
  $('#campos-fixa').hidden = rec !== 'fixa';
  $('#campos-parcelada').hidden = rec !== 'parcelada';
  form.parcelas.required = rec === 'parcelada';
  $('#campo-mes').firstChild.textContent = rec === 'fixa' ? 'Começa em' : 'Mês';

  if (rec === 'parcelada') {
    const n = Math.max(2, Number(form.parcelas.value) || 2);
    const atual = Math.min(n, Math.max(1, Number(form.parcelaAtual.value) || 1));
    const v = Number(form.valor.value) || 0;
    const parcela = form.valorRef.value === 'total' ? v / n : v;
    const ult = form.mes.value ? somaMeses(form.mes.value, n - atual) : null;
    $('#dica-parcela').textContent = v
      ? `${n}x de ${dinheiro(parcela)} (total ${dinheiro(parcela * n)})${ult ? ` · última parcela em ${nomeMes(ult)}` : ''}`
      : '';
  }
}

function abrirForm(l) {
  form.reset();
  editandoId = l ? l.id : null;
  $('#form-titulo').textContent = l ? 'Editar lançamento' : 'Novo lançamento';
  form.mes.value = mesSel;
  if (l) {
    form.tipo.value = l.tipo;
    form.descricao.value = l.descricao;
    form.categoria.value = l.categoria || '';
    form.recorrencia.value = l.recorrencia;
    form.valor.value = l.valor;
    form.mes.value = l.inicio;
    form.fim.value = l.fim || '';
    if (l.recorrencia === 'parcelada') {
      form.parcelas.value = l.parcelas;
      form.parcelaAtual.value = 1;
    }
  }
  const cats = [...new Set(estado.lancamentos.map(x => x.categoria).filter(Boolean))].sort();
  $('#categorias').innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');
  atualizarCamposForm();
  dlg.showModal();
}

form.addEventListener('input', atualizarCamposForm);
form.addEventListener('change', atualizarCamposForm);
$('#btn-cancelar').addEventListener('click', () => dlg.close());

form.addEventListener('submit', e => {
  e.preventDefault();
  const rec = form.recorrencia.value;
  let valor = Number(form.valor.value);
  let inicio = form.mes.value;
  const l = {
    id: editandoId || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
    tipo: form.tipo.value,
    descricao: form.descricao.value.trim(),
    categoria: form.categoria.value.trim(),
    recorrencia: rec,
  };
  if (rec === 'parcelada') {
    const n = Math.max(2, Math.round(Number(form.parcelas.value)));
    const atual = Math.min(n, Math.max(1, Math.round(Number(form.parcelaAtual.value) || 1)));
    if (form.valorRef.value === 'total') valor = valor / n;
    inicio = somaMeses(inicio, -(atual - 1)); // guarda sempre o mês da 1ª parcela
    l.parcelas = n;
  }
  if (rec === 'fixa' && form.fim.value) {
    if (difMeses(inicio, form.fim.value) < 0) { alert('O mês final não pode ser antes do início.'); return; }
    l.fim = form.fim.value;
  }
  l.valor = Math.round(valor * 100) / 100;
  l.inicio = inicio;

  const i = estado.lancamentos.findIndex(x => x.id === l.id);
  if (i >= 0) estado.lancamentos[i] = l; else estado.lancamentos.push(l);
  salvar();
  dlg.close();
  render();
});

// ---------- Eventos ----------
document.querySelectorAll('.abas button').forEach(b => b.addEventListener('click', () => {
  abaSel = b.dataset.aba;
  document.querySelectorAll('.abas button').forEach(x => x.classList.toggle('ativa', x === b));
  document.querySelectorAll('.aba').forEach(s => { s.hidden = s.id !== `aba-${abaSel}`; });
  render();
}));

$('#mes-ant').addEventListener('click', () => { mesSel = somaMeses(mesSel, -1); render(); });
$('#mes-prox').addEventListener('click', () => { mesSel = somaMeses(mesSel, 1); render(); });
$('#btn-novo').addEventListener('click', () => abrirForm());
$('#btn-novo-2').addEventListener('click', () => abrirForm());
$('#horizonte').addEventListener('change', render);

$('#btn-imprimir').addEventListener('click', () => {
  document.querySelectorAll('#detalhe-meses details').forEach(d => { d.open = true; });
  window.print();
});

document.addEventListener('click', e => {
  const ed = e.target.closest('[data-editar]');
  if (ed) { abrirForm(estado.lancamentos.find(l => l.id === ed.dataset.editar)); return; }

  const ex = e.target.closest('[data-excluir]');
  if (ex) {
    const l = estado.lancamentos.find(x => x.id === ex.dataset.excluir);
    if (l && confirm(`Excluir "${l.descricao}"?`)) {
      estado.lancamentos = estado.lancamentos.filter(x => x.id !== l.id);
      for (const k of Object.keys(estado.pagos)) if (k.startsWith(`${l.id}|`)) delete estado.pagos[k];
      salvar();
      render();
    }
  }
});

document.addEventListener('change', e => {
  const cb = e.target.closest('[data-pagar]');
  if (!cb) return;
  const k = `${cb.dataset.pagar}|${mesSel}`;
  if (cb.checked) estado.pagos[k] = true; else delete estado.pagos[k];
  salvar();
  render();
});

// Configurações (moeda)
const dlgConfig = $('#dlg-config');
const selMoeda = $('#sel-moeda');

$('#btn-config').addEventListener('click', () => {
  if (!selMoeda.options.length) {
    const todas= listaMoedas();
    const principais = ['EUR', 'BRL',  'USD', 'GBP'];
    const opcao = m => `<option value="${m.codigo}">${esc(m.nome)} (${m.codigo})</option>`;
    selMoeda.innerHTML = 
      `<optgroup label="Mais usadas">${todas.filter(m => principais.includes(m.codigo)).map(opcao).join('')}</optgroup>` +
      `<optgroup label="Todas as moedas">${todas.map(opcao).join('')}</optgroup>`;
  }
  selMoeda.value = estado.config.moeda;
  dlgConfig.showModal();
});

$('#btn-config-cancelar').addEventListener('click', () => dlgConfig.close());

$('#form-config').addEventListener('submit', e => {
  e.preventDefault();
  estado.config.moeda = selMoeda.value;
  aplicarMoeda();
  salvar();
  dlgConfig.close();
  render();
});

// Backup
$('#btn-exportar').addEventListener('click', async () => {
  const nome = `economija-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const conteudo = JSON.stringify(estado, null, 2);

  // No iPhone: abre a folha de compartilhar (Salvar em Arquivos, iCloud, WhatsApp...)
  const arquivo = new File([conteudo], nome, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    try { await navigator.share({ files: [arquivo], title: 'Backup Economijá' }); return; }
    catch (err) { if (err.name === 'AbortError') return; /* senão, cai no download normal */ }
  }

  // No computador: download normal
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }));
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('#input-importar').addEventListener('change', async e => {
  const arq = e.target.files[0];
  if (!arq) return;
  try {
    const d = JSON.parse(await arq.text());
    if (!Array.isArray(d.lancamentos)) throw new Error('formato inválido');
    if (!confirm('Substituir todos os dados atuais pelo backup?')) return;
    estado.lancamentos = d.lancamentos;
    estado.pagos = d.pagos || {};
    if (d.config) { estado.config = d.config; aplicarMoeda(); }
    salvar();
    render();
  } catch (err) {
    alert('Arquivo de backup inválido.');
  } finally {
    e.target.value = '';
  }
});

render();

// ---------- App instalável / offline ----------
// Pede ao navegador para não apagar os dados sozinho quando faltar espaço
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// Registra o service worker (só funciona em https ou localhost, não em file://)
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
