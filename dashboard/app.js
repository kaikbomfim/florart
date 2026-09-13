const state = {
  pedidos: null,
  produtos: null,
  estoque: null,
  avaliacoes: null,
};

const charts = {};

const services = {
  pedidos: {
    url: 'http://localhost:7001/pedidos',
    metric: 'pedidosMetric',
    content: 'pedidosContent',
    render(data) {
      const abertas = data.filter((item) => !['entregue', 'cancelado'].includes(item.status)).length;
      return {
        metric: `${abertas} ativos`,
        rows: data.slice(0, 3).map((item) => row(`#${item.id} · ${item.cliente}`, `${statusLabel(item.status)} · ${money(item.total)}`)),
      };
    },
  },
  produtos: {
    url: 'http://localhost:7002/produtos',
    metric: 'produtosMetric',
    content: 'produtosContent',
    render(data) {
      return {
        metric: `${data.length} itens`,
        rows: data.slice(0, 3).map((item) => row(item.nome, `${item.categoria} · ${money(item.preco)}`)),
      };
    },
  },
  estoque: {
    url: 'http://localhost:7003/estoque/baixo',
    metric: 'estoqueMetric',
    content: 'estoqueContent',
    render(data) {
      return {
        metric: `${data.length} alertas`,
        rows: data.slice(0, 3).map((item) => row(item.produto, `${item.quantidade} disponíveis · mínimo ${item.minimo}`)),
      };
    },
  },
  avaliacoes: {
    url: 'http://localhost:7004/avaliacoes/resumo',
    metric: 'avaliacoesMetric',
    content: 'avaliacoesContent',
    render(data) {
      const avaliados = data.filter((item) => item.total_avaliacoes > 0);
      const media = avaliados.reduce((sum, item) => sum + Number(item.media), 0) / Math.max(avaliados.length, 1);
      return {
        metric: `${media.toFixed(1)} / 5`,
        rows: avaliados.slice(0, 3).map((item) => row(item.produto, `${item.total_avaliacoes} avaliações · nota ${Number(item.media).toFixed(1)}`)),
      };
    },
  },
};

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function statusLabel(status) {
  return String(status).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shortLabel(value, limit = 22) {
  const label = String(value);
  return label.length > limit ? `${label.slice(0, limit - 1)}…` : label;
}

function row(title, detail) {
  return `<div class="row"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div>`;
}

function updatePanel(name, config, data) {
  const panel = document.querySelector(`[data-panel="${name}"]`);
  const metric = document.getElementById(config.metric);
  const content = document.getElementById(config.content);
  const view = config.render(data);

  panel.classList.remove('offline');
  metric.textContent = view.metric;
  content.innerHTML = view.rows.length ? view.rows.join('') : '<p class="empty-message">Nenhum registro encontrado.</p>';
}

function showPanelError(name, config) {
  const panel = document.querySelector(`[data-panel="${name}"]`);
  const metric = document.getElementById(config.metric);
  const content = document.getElementById(config.content);

  panel.classList.add('offline');
  metric.textContent = 'offline';
  content.innerHTML = '<p class="error">Serviço indisponível. Tentaremos reconectar automaticamente.</p>';
}

async function loadPanel(name, config) {
  try {
    const response = await fetch(config.url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    state[name] = Array.isArray(data) ? data : [];
    updatePanel(name, config, state[name]);
  } catch (error) {
    state[name] = null;
    showPanelError(name, config);
  }
}

function chartNote(id, message, isUnavailable = false) {
  const note = document.getElementById(id);
  note.textContent = message;
  note.classList.toggle('unavailable', isUnavailable);
}

function destroyChart(key) {
  if (charts[key]) {
    charts[key].destroy();
    delete charts[key];
  }
}

function createChart(key, canvasId, config) {
  destroyChart(key);
  if (!window.Chart) return;
  charts[key] = new window.Chart(document.getElementById(canvasId), config);
}

function commonChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 450 },
    plugins: {
      legend: {
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'circle',
          color: '#456354',
          font: { family: 'system-ui', size: 12, weight: '600' },
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#193f31',
        padding: 12,
        titleFont: { family: 'Georgia', size: 13 },
        bodyFont: { family: 'system-ui', size: 12 },
        displayColors: false,
      },
    },
  };
}

function renderOrdersChart() {
  const data = state.pedidos;
  if (!data) {
    destroyChart('pedidos');
    chartNote('ordersStatusNote', 'O gráfico será retomado quando o serviço de pedidos voltar.', true);
    return;
  }

  const statusCounts = data.reduce((counts, item) => {
    counts[item.status] = (counts[item.status] || 0) + 1;
    return counts;
  }, {});
  const labels = Object.keys(statusCounts).map(statusLabel);
  const values = Object.values(statusCounts);

  if (!values.length) {
    destroyChart('pedidos');
    chartNote('ordersStatusNote', 'Ainda não há pedidos para exibir.');
    return;
  }

  chartNote('ordersStatusNote', `${data.length} pedidos consultados agora.`);
  createChart('pedidos', 'ordersStatusChart', {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ['#e78896', '#f4b65e', '#6cac86', '#78aeb7', '#b697cf'],
        borderColor: '#fffdf8',
        borderWidth: 5,
        hoverOffset: 7,
      }],
    },
    options: {
      ...commonChartOptions(),
      cutout: '67%',
      plugins: {
        ...commonChartOptions().plugins,
        legend: { ...commonChartOptions().plugins.legend, position: 'bottom' },
      },
    },
  });
}

function renderStockChart() {
  const data = state.estoque;
  if (!data) {
    destroyChart('estoque');
    chartNote('stockNote', 'O gráfico será retomado quando o serviço de estoque voltar.', true);
    return;
  }

  const items = data.slice(0, 6);
  if (!items.length) {
    destroyChart('estoque');
    chartNote('stockNote', 'Nenhum item abaixo do nível mínimo. Que boa notícia!');
    return;
  }

  chartNote('stockNote', 'Verde: quantidade atual. Rosa: quantidade mínima.');
  createChart('estoque', 'stockChart', {
    type: 'bar',
    data: {
      labels: items.map((item) => item.produto),
      datasets: [
        { label: 'Atual', data: items.map((item) => item.quantidade), backgroundColor: '#6cac86', borderRadius: 8, borderSkipped: false },
        { label: 'Mínimo', data: items.map((item) => item.minimo), backgroundColor: '#e78896', borderRadius: 8, borderSkipped: false },
      ],
    },
    options: { ...commonChartOptions(), scales: chartScales() },
  });
}

function renderRatingsChart() {
  const data = state.avaliacoes;
  if (!data) {
    destroyChart('avaliacoes');
    chartNote('ratingsNote', 'O gráfico será retomado quando o serviço de avaliações voltar.', true);
    return;
  }

  const items = data
    .filter((item) => item.total_avaliacoes > 0)
    .sort((a, b) => Number(b.media) - Number(a.media))
    .slice(0, 6);

  if (!items.length) {
    destroyChart('avaliacoes');
    chartNote('ratingsNote', 'Ainda não há avaliações para exibir.');
    return;
  }

  chartNote('ratingsNote', 'A média é calculada a partir das avaliações recebidas.');
  const productNames = items.map((item) => item.produto);
  createChart('avaliacoes', 'ratingsChart', {
    type: 'bar',
    data: {
      labels: productNames.map((name) => shortLabel(name)),
      datasets: [{
        label: 'Nota média',
        data: items.map((item) => Number(item.media)),
        backgroundColor: ['#d96e86', '#e78896', '#eaa34d', '#82b68e', '#79aeba', '#b697cf'],
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      ...commonChartOptions(),
      indexAxis: 'y',
      scales: {
        x: { ...chartScales().y, max: 5, ticks: { ...chartScales().y.ticks, stepSize: 1 } },
        y: { ...chartScales().x, ticks: { ...chartScales().x.ticks, autoSkip: false } },
      },
      plugins: {
        ...commonChartOptions().plugins,
        legend: { display: false },
        tooltip: {
          ...commonChartOptions().plugins.tooltip,
          callbacks: { title: (context) => productNames[context[0].dataIndex] },
        },
      },
    },
  });
}

function chartScales() {
  return {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: '#587061', font: { family: 'system-ui', size: 11, weight: '600' }, maxRotation: 0, autoSkip: false },
    },
    y: {
      beginAtZero: true,
      grid: { color: '#edf0e9' },
      border: { display: false },
      ticks: { color: '#779083', font: { family: 'system-ui', size: 11 }, precision: 0 },
    },
  };
}

function renderRecentOrders() {
  const container = document.getElementById('recentOrdersContent');
  const data = state.pedidos;

  if (!data) {
    container.innerHTML = '<p class="table-empty unavailable">Pedidos indisponíveis no momento.</p>';
    return;
  }
  if (!data.length) {
    container.innerHTML = '<p class="table-empty">Ainda não há pedidos recentes.</p>';
    return;
  }

  const rows = data.slice(0, 5).map((item) => `
    <tr>
      <td><strong>#${escapeHtml(item.id)}</strong><span>${escapeHtml(item.cliente)}</span></td>
      <td>${escapeHtml(item.cidade)}</td>
      <td><span class="status-pill status-${escapeHtml(item.status)}">${escapeHtml(statusLabel(item.status))}</span></td>
      <td class="amount">${escapeHtml(money(item.total))}</td>
    </tr>`).join('');

  container.innerHTML = `<table><thead><tr><th>Pedido</th><th>Destino</th><th>Etapa</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderAnalytics() {
  renderOrdersChart();
  renderStockChart();
  renderRatingsChart();
  renderRecentOrders();
}

async function refresh() {
  await Promise.allSettled(Object.entries(services).map(([name, config]) => loadPanel(name, config)));
  renderAnalytics();
  document.getElementById('updatedAt').textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

refresh();
setInterval(refresh, 10000);
