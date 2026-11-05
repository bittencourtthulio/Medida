/* Elementos estratégicos locais: símbolos em SVG, sem fontes de ícones ou serviços externos. */
(function () {
  const grupos = ['Pessoas e empresa', 'Marketing e canais', 'Vendas', 'Estratégia e ferramentas'];
  const dados = [
    ['pessoa', 'Pessoa', 0, 'usuario responsável colaborador', '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>'],
    ['equipe', 'Equipe', 0, 'time pessoas colaboradores', '<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 4 5v2"/>'],
    ['empresa', 'Empresa', 0, 'negócio organização', '<rect x="4" y="3" width="16" height="19" rx="1"/><path d="M9 22v-5h6v5M8 7h2m4 0h2M8 11h2m4 0h2"/>'],
    ['cliente', 'Cliente', 0, 'consumidor comprador público', '<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 12-5M16 17l3 3 4-6"/>'],
    ['parceiro', 'Parceiro', 0, 'parceria afiliado indicação', '<path d="m2 12 5-6 5 2 5-2 5 6-6 8-4-2-4 2-6-8Z M7 6l5 2-4 5 3 2 5-5 6 2M12 18l3-4"/>'],
    ['email', 'E-mail', 1, 'email correio newsletter campanha', '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m3 6 9 7 9-7"/>'],
    ['pagina-de-vendas', 'Página de vendas', 1, 'landing page site página conversão', '<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 8h20M6 5.5h.1M9 5.5h.1M6 12h12M6 15h7"/><rect x="6" y="17" width="7" height="1" rx=".5"/>'],
    ['instagram', 'Instagram', 1, 'rede social reels stories', '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>'],
    ['meta', 'Meta', 1, 'facebook anúncio ads rede social', '<path d="M12 14C9 8 7 4 5 5c-3 1-5 11-2 13 3 2 6-5 9-9 3-4 5-5 7-2 2 3 4 10 1 11-3 2-6-5-10-10"/>'],
    ['youtube', 'YouTube', 1, 'vídeo canal shorts', '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 6 3-6 3Z" fill="currentColor" stroke="none"/>'],
    ['whatsapp', 'WhatsApp', 1, 'mensagem atendimento chat', '<path d="M21 11.5A9 9 0 0 1 7 19l-5 2 2-5a9 9 0 1 1 17-4.5Z M8 7c-3 2 3 9 6 9l2-2-3-2-1 1-3-3 1-1-2-2Z"/>'],
    ['google', 'Google', 1, 'busca pesquisa seo orgânico', '<path d="M20 7a9 9 0 1 0 1 5h-9M21 12v5"/>'],
    ['google-ads', 'Google Ads', 1, 'anúncio tráfego pago adwords search display', '<path d="M10 4 3 16a3 3 0 0 0 5 3l7-12M10 4a3 3 0 0 1 5 0l7 12a3 3 0 0 1-5 3L10 7a3 3 0 0 1 0-3Z"/><circle cx="5.5" cy="17.5" r="2.5" fill="currentColor"/>'],
    ['linkedin', 'LinkedIn', 1, 'rede social b2b profissional', '<rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 10v8M11 18v-8M11 13c0-4 6-4 6 0v5"/><circle cx="7" cy="6.5" r="1" fill="currentColor" stroke="none"/>'],
    ['anuncio', 'Anúncio', 1, 'campanha tráfego pago publicidade divulgação', '<path d="m3 10 14-6v16L3 14v-4Z M6 15l2 7h4l-2-6M21 8v8"/>'],
    ['lead', 'Lead', 2, 'prospect oportunidade contato interessado', '<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 11-6M18 11v10M13 16h10"/>'],
    ['crm', 'CRM', 2, 'pipeline carteira comercial negócios', '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 4v16M15 4v16M4 8h2M10 8h3M17 8h3M4 12h2M10 12h3"/>'],
    ['reuniao', 'Reunião', 2, 'agenda reunião demo demonstração call', '<rect x="2" y="4" width="20" height="18" rx="2"/><path d="M7 2v5M17 2v5M2 10h20M8 16l3 3 5-6"/>'],
    ['proposta', 'Proposta', 2, 'orçamento contrato oferta', '<path d="M14 2H5v20h14V7l-5-5Z M14 2v6h5M8 12h8M8 16h8M8 19h5"/>'],
    ['pagamento', 'Pagamento', 2, 'venda dinheiro receita compra checkout', '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20M6 15h4M14 15h4"/>'],
    ['objetivo', 'Objetivo', 3, 'meta alvo estratégia resultado', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'],
    ['indicador', 'Indicador', 3, 'kpi métrica resultado análise relatório', '<path d="M3 3v18h19M7 17v-5M12 17V7M17 17v-9"/>'],
    ['funil', 'Funil', 3, 'aquisição conversão jornada etapas', '<path d="M2 3h20l-8 9v8l-4 2V12L2 3ZM6 7h12"/>'],
    ['produto', 'Produto', 3, 'serviço oferta entrega saas', '<path d="m12 2 10 5v10l-10 5-10-5V7l10-5Z M2 7l10 5 10-5M12 12v10M7 4.5l10 5"/>'],
    ['processo', 'Processo', 3, 'etapa fluxo operação tarefa', '<rect x="2" y="2" width="7" height="7" rx="1"/><rect x="15" y="15" width="7" height="7" rx="1"/><path d="M9 5h9v10M14 11l4 4 4-4M5 9v10h10"/>'],
    ['ferramenta', 'Ferramenta', 3, 'software sistema plataforma tecnologia', '<path d="M14 3a6 6 0 0 0-7 8l-5 5a3 3 0 0 0 4 4l5-5a6 6 0 0 0 8-7l-4 4-3-3 4-4-2-2Z"/>'],
    ['automacao', 'Automação', 3, 'automação integração workflow zapier n8n', '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>'],
    ['ia', 'IA', 3, 'inteligência artificial agente assistente chatbot', '<rect x="4" y="7" width="16" height="14" rx="3"/><path d="M12 3v4M1 12v5M23 12v5M8 17h8"/><circle cx="8" cy="12" r="1" fill="currentColor"/><circle cx="16" cy="12" r="1" fill="currentColor"/>'],
  ];
  const lista = dados.map(([id, nome, grupo, termos, desenho]) => ({ id, nome, grupo: grupos[grupo], termos, desenho }));
  const porId = new Map(lista.map(e => [e.id, e]));
  window.ElementosQuadro = {
    lista, grupos, obter: id => porId.get(id),
    svg(id, cor = 'currentColor') {
      const e = porId.get(id); if (!e) return '';
      const tinta = /^#[0-9a-f]{6}$/i.test(cor) ? cor : 'currentColor';
      return `<svg xmlns="http://www.w3.org/2000/svg" class="q-simbolo" viewBox="0 0 24 24" fill="none" stroke="currentColor" color="${tinta}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e.desenho}</svg>`;
    },
  };
})();
