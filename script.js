document.addEventListener('DOMContentLoaded', () => {
  /* ====== Conteúdo e Configurações ====== */
  const PERGUNTAS = [
    'Como foi o acolhimento na recepção?',
    'O tempo de espera foi satisfatório?',
    'O profissional explicou tudo de forma clara?',
    'O ambiente estava limpo e confortável?',
    'No geral, como você avalia o atendimento?'
  ];

  const NOTAS = [
    { n: 0, rot: 'Péssimo',   cor: '#E5484D' },
    { n: 1, rot: 'Ruim',      cor: '#F2784B' },
    { n: 2, rot: 'Regular',   cor: '#F5B82E' },
    { n: 3, rot: 'Bom',       cor: '#C2D84F' },
    { n: 4, rot: 'Muito bom', cor: '#7BC64E' },
    { n: 5, rot: 'Excelente', cor: '#2FA84F' }
  ];

  const MOUTHS = [
    '<path d="M29 74 Q50 50 71 74" />',
    '<path d="M33 70 Q50 57 67 70" />',
    '<path d="M33 67 L67 67" />',
    '<path d="M32 62 Q50 73 68 62" />',
    '<path d="M29 60 Q50 82 71 60" />',
    '<path d="M27 58 Q50 92 73 58 Z" fill="#fff" />'
  ];

  const TEMPO_INATIVIDADE = 45; // segundos até abrir o modal de inatividade
  const TEMPO_AVISO = 15;       // segundos tolerados dentro do modal
  const TEMPO_FIM = 10;         // segundos de exibição da tela de obrigado

  /* ====== Seletores ====== */
  const $ = (id) => document.getElementById(id);
  const telaInicio = $('tela-inicio');
  const telaPergunta = $('tela-pergunta');
  const telaFim = $('tela-fim');
  const aviso = $('aviso');
  const escala = $('escala');
  const barra = $('barra');

  /* ====== Estado ====== */
  let idx = 0;
  let respostas = new Array(PERGUNTAS.length).fill(null);
  let tIdle = null, tAviso = null, tFim = null;

  /* ====== Renderização da Interface ====== */
  function criarRostoSVG(nivel) {
    const corFundo = NOTAS[nivel].cor;
    return `
      <svg class="rosto" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="${corFundo}" stroke="#14212B" stroke-width="4"/>
        <circle cx="35" cy="40" r="5.5" fill="#14212B"/>
        <circle cx="65" cy="40" r="5.5" fill="#14212B"/>
        <g fill="none" stroke="#14212B" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
          ${MOUTHS[nivel]}
        </g>
      </svg>
    `;
  }

  // Monta os botões de nota (0 a 5)
  NOTAS.forEach((nt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nota';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', `Nota ${nt.n}, ${nt.rot}`);
    btn.dataset.nota = nt.n;
    btn.innerHTML = `
      ${criarRostoSVG(nt.n)}
      <span class="num">${nt.n}</span>
      <span class="rot">${nt.rot}</span>
      <span class="ok" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 12.5l5 5L20 6.5"/>
        </svg>
      </span>
    `;
    btn.addEventListener('click', () => {
      respostas[idx] = nt.n;
      atualizarPergunta();
    });
    escala.appendChild(btn);
  });

  // Monta os indicadores de progresso
  PERGUNTAS.forEach(() => barra.appendChild(document.createElement('i')));

  function atualizarPergunta() {
    const eUltima = idx === PERGUNTAS.length - 1;
    
    $('passo').textContent = `Pergunta ${idx + 1} de ${PERGUNTAS.length}`;
    $('texto-pergunta').textContent = PERGUNTAS[idx];

    // Progresso da barra
    [...barra.children].forEach((el, i) => el.classList.toggle('done', i <= idx));

    // Destaque da nota selecionada
    [...escala.children].forEach((el) => {
      el.setAttribute('aria-pressed', String(respostas[idx] === Number(el.dataset.nota)));
    });

    // Estado dos botões de navegação
    $('btn-voltar').classList.toggle('invisivel', idx === 0);
    
    const btnAvancar = $('btn-avancar');
    const escolhida = respostas[idx] !== null;
    
    btnAvancar.setAttribute('aria-disabled', String(!escolhida));
    btnAvancar.textContent = !escolhida 
      ? 'Escolha uma nota' 
      : (eUltima ? 'Enviar avaliação' : 'Confirmar e continuar');
  }

  /* ====== Navegação ====== */
  function mostrar(tela) {
    [telaInicio, telaPergunta, telaFim].forEach((t) => { t.hidden = t !== tela; });
  }

  function irParaInicio() {
    limparTemporizadores();
    aviso.hidden = true;
    idx = 0;
    respostas = new Array(PERGUNTAS.length).fill(null);
    mostrar(telaInicio);
    $('btn-comecar').focus({ preventScroll: true });
  }

  function comecar() {
    idx = 0;
    atualizarPergunta();
    mostrar(telaPergunta);
    reiniciarInatividade();
  }

  function avancar() {
    if (respostas[idx] === null) return;
    if (idx < PERGUNTAS.length - 1) {
      idx++;
      atualizarPergunta();
    } else {
      finalizar();
    }
  }

  function voltar() {
    if (idx > 0) {
      idx--;
      atualizarPergunta();
    }
  }

  /* ====== Envio de Dados ====== */
  function enviarAvaliacao(dados) {
    // Ponto de integração: envie os dados para a sua API REST / Backend aqui
    console.log('Dados da avaliação registrados:', dados);
  }

  function finalizar() {
    limparTemporizadores();
    
    enviarAvaliacao({
      dataHora: new Date().toISOString(),
      respostas: PERGUNTAS.map((p, i) => ({ pergunta: p, nota: respostas[i] }))
    });

    mostrar(telaFim);

    let segundos = TEMPO_FIM;
    const atualizarContagem = () => {
      $('contagem').textContent = `Retornando ao início em ${segundos} segundo${segundos === 1 ? '' : 's'}.`;
    };
    
    atualizarContagem();
    tFim = setInterval(() => {
      segundos--;
      if (segundos <= 0) {
        irParaInicio();
      } else {
        atualizarContagem();
      }
    }, 1000);
  }

  /* ====== Gestão de Inatividade ====== */
  function limparTemporizadores() {
    clearTimeout(tIdle);
    clearTimeout(tAviso);
    clearInterval(tFim);
  }

  function reiniciarInatividade() {
    clearTimeout(tIdle);
    clearTimeout(tAviso);
    if (telaPergunta.hidden) return;

    tIdle = setTimeout(() => {
      aviso.hidden = false;
      $('btn-continuar').focus({ preventScroll: true });
      tAviso = setTimeout(irParaInicio, TEMPO_AVISO * 1000);
    }, TEMPO_INATIVIDADE * 1000);
  }

  /* ====== Eventos do Usuário ====== */
  document.addEventListener('pointerdown', () => {
    if (aviso.hidden) reiniciarInatividade();
  });

  telaInicio.addEventListener('click', comecar);
  $('btn-avancar').addEventListener('click', avancar);$('btn-voltar').addEventListener('click', voltar);
  $('btn-inicio').addEventListener('click', irParaInicio);$('btn-continuar').addEventListener('click', () => {
    aviso.hidden = true;
    reiniciarInatividade();
  });

  // Previne menu de contexto (clique com botão direito / toque longo em totens)
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // Inicialização
  irParaInicio();
});
