document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('diagnostico-form');
  if (!form) {
    return;
  }

  // Chave do Web3Forms (web3forms.com), criada com a conta
  // contato@grupointegramg.com.br, que é o destino das mensagens. A chave é
  // pública por desenho do serviço. Se o envio falhar, o diagnóstico e o
  // WhatsApp continuam funcionando normalmente.
  const WEB3FORMS_ACCESS_KEY = 'bb2e29aa-e027-4bcf-b0d5-5d06d201bd76';

  const resultado = document.getElementById('diagnostico-resultado');
  const resumoEl = document.getElementById('diagnostico-resumo');
  const pendenciasEl = document.getElementById('diagnostico-pendencias');
  const atencaoEl = document.getElementById('diagnostico-atencao');
  const whatsappEl = document.getElementById('diagnostico-whatsapp');
  const treinamentosResumoEl = document.getElementById('diagnostico-treinamentos-resumo');
  const treinamentosListaEl = document.getElementById('diagnostico-treinamentos-lista');
  const envioEl = document.getElementById('diagnostico-envio');

  const SERVICOS = {
    pgr: 'PGR',
    pcmso: 'PCMSO',
    ltcat: 'LTCAT',
    nr16: 'Laudo NR-16',
    aep_aet: 'AEP / AET'
  };

  // Treinamentos ligados a uma atividade de risco: se a empresa faz essa
  // atividade (ou não tem certeza), o treinamento pode ser necessário.
  // Isso não confirma se o treinamento já foi feito, só identifica se a
  // norma se aplica à empresa.
  const TREINAMENTOS = {
    altura: 'NR-35 (Trabalho em Altura)',
    espaco_confinado: 'NR-33 (Espaços Confinados)',
    eletricidade: 'NR-10 (Segurança em Eletricidade)',
    maquinas: 'NR-12 (Máquinas e Equipamentos)',
    epi: 'NR-06 (Equipamentos de Proteção Individual)',
    brigada: 'NR-23 (Prevenção e Combate a Incêndio)',
    construcao: 'NR-18 (Construção Civil)',
    inflamaveis: 'NR-20 (Inflamáveis e Combustíveis)',
    movimentacao: 'NR-11 (Transporte e Movimentação de Materiais)'
  };

  // CNPJ: aceita o formato antigo (só números) e o alfanumérico da Receita
  // Federal (letras e números nas 12 primeiras posições, sempre números nos
  // 2 dígitos verificadores). Telefone: só números, com DDD (10 ou 11).
  // A pontuação é colocada pela máscara, a pessoa só digita os caracteres.
  function limparCnpj(texto) {
    let saida = '';
    for (const c of texto.toUpperCase()) {
      if (saida.length < 12 ? /[A-Z0-9]/.test(c) : /[0-9]/.test(c)) {
        saida += c;
      }
      if (saida.length === 14) break;
    }
    return saida;
  }

  function formatarCnpj(v) {
    const partes = [v.slice(0, 2), v.slice(2, 5), v.slice(5, 8), v.slice(8, 12), v.slice(12, 14)];
    let saida = partes[0];
    if (v.length > 2) saida += '.' + partes[1];
    if (v.length > 5) saida += '.' + partes[2];
    if (v.length > 8) saida += '/' + partes[3];
    if (v.length > 12) saida += '-' + partes[4];
    return saida;
  }

  function limparTelefone(texto) {
    // Nenhum DDD começa com 0, então zeros iniciais (031...) caem fora, e o
    // código do país (+55) é removido quando o número vem colado com ele.
    let digitos = texto.replace(/\D/g, '').replace(/^0+/, '');
    if (digitos.length > 11 && digitos.startsWith('55')) {
      digitos = digitos.slice(2);
    }
    return digitos.slice(0, 11);
  }

  function formatarTelefone(v) {
    if (v.length === 0) return '';
    if (v.length <= 2) return '(' + v;
    const ddd = v.slice(0, 2);
    const resto = v.slice(2);
    // 9 dígitos depois do DDD = celular (5 + 4); até 8 = fixo (4 + 4).
    const corte = resto.length > 8 ? 5 : 4;
    if (resto.length <= corte) return `(${ddd}) ${resto}`;
    return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
  }

  // Reformata o campo a cada digitação ou colagem, mantendo o cursor depois
  // do mesmo caractere válido em que ele estava.
  function aplicarMascara(input, limpar, formatar) {
    input.addEventListener('input', () => {
      const cursor = input.selectionStart ?? input.value.length;
      const validosAntes = limpar(input.value.slice(0, cursor)).length;
      const formatado = formatar(limpar(input.value));
      input.value = formatado;
      let pos = 0;
      let contados = 0;
      while (pos < formatado.length && contados < validosAntes) {
        if (/[A-Z0-9]/.test(formatado[pos])) contados++;
        pos++;
      }
      input.setSelectionRange(pos, pos);
    });
  }

  aplicarMascara(form.elements.cnpj, limparCnpj, formatarCnpj);
  aplicarMascara(form.elements.telefone, limparTelefone, formatarTelefone);

  const PORTE = {
    ate19: 'até 19 funcionários',
    '20a100': 'de 20 a 100 funcionários',
    mais100: 'mais de 100 funcionários'
  };

  const SETOR = {
    administrativo: 'escritório, comércio ou serviços administrativos',
    tecnico: 'oficina, indústria leve, manutenção ou serviços técnicos',
    pesado: 'indústria pesada, construção civil, mineração ou frigorífico',
    naosei: 'setor não classificado'
  };

  const RESPOSTA = { sim: 'sim', nao: 'não', naosei: 'não sei', napplica: 'não se aplica' };

  // Rótulos das perguntas no email, na ordem do formulário (a 01 é o setor
  // e a 17 é o porte, tratadas à parte).
  const PERGUNTAS = [
    ['altura', '02 Trabalho em altura (NR 35)'],
    ['espaco_confinado', '03 Espaços confinados (NR 33)'],
    ['eletricidade', '04 Eletricidade (NR 10)'],
    ['maquinas', '05 Máquinas e equipamentos (NR 12)'],
    ['epi', '06 Uso de EPI (NR 06)'],
    ['brigada', '07 Brigada de incêndio (NR 23)'],
    ['construcao', '08 Construção civil (NR 18)'],
    ['inflamaveis', '09 Inflamáveis e combustíveis (NR 20)'],
    ['movimentacao', '10 Movimentação de cargas (NR 11)'],
    ['pgr', '11 PGR atualizado'],
    ['pcmso', '12 PCMSO ativo'],
    ['ltcat', '13 LTCAT pronto'],
    ['nr16', '14 Laudo de periculosidade (NR 16)'],
    ['aep_aet', '15 Análise ergonômica (AEP / AET)'],
    ['acidente', '16 Acidente de trabalho (CAT) nos últimos 12 meses']
  ];

  // Guarda o último conteúdo enviado com sucesso, pra não mandar o mesmo
  // diagnóstico duas vezes se a pessoa clicar de novo em Ver resultado.
  let ultimoEnvioOk = '';

  function mostrarEnvio(texto) {
    envioEl.textContent = texto;
    envioEl.hidden = false;
  }

  async function enviarPorEmail(payload) {
    envioEl.hidden = true;
    if (!WEB3FORMS_ACCESS_KEY || WEB3FORMS_ACCESS_KEY === 'COLOQUE_SUA_CHAVE_AQUI') {
      console.warn('Web3Forms: chave de acesso ainda não configurada, email não enviado.');
      return;
    }
    const assinatura = JSON.stringify(payload);
    if (assinatura === ultimoEnvioOk) {
      mostrarEnvio('Seus dados já foram enviados para a equipe da Íntegra.');
      return;
    }
    try {
      const resposta = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: assinatura
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (resposta.ok && corpo.success) {
        ultimoEnvioOk = assinatura;
        mostrarEnvio('Seus dados foram enviados para a equipe da Íntegra.');
      } else {
        throw new Error(corpo.message || String(resposta.status));
      }
    } catch (erro) {
      // Falha aqui não trava o visitante: o resultado e o link do WhatsApp
      // já foram exibidos de qualquer forma.
      console.warn('Web3Forms:', erro);
      mostrarEnvio('Não conseguimos enviar seus dados por email agora. Use o botão do WhatsApp abaixo para falar com a gente.');
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(form);
    if (data.get('botcheck')) { return; }
    const campos = Object.keys(SERVICOS);
    const riscos = Object.keys(TREINAMENTOS);

    const semResposta = campos.some((campo) => !data.get(campo)) || riscos.some((campo) => !data.get(campo)) || !data.get('porte') || !data.get('setor') || !data.get('acidente');
    if (semResposta) {
      alert('Responda todas as perguntas antes de ver o resultado.');
      return;
    }

    const faltando = campos.filter((campo) => {
      const valor = data.get(campo);
      return valor === 'nao' || valor === 'naosei';
    });

    const treinamentosAplicaveis = riscos.filter((campo) => {
      const valor = data.get(campo);
      return valor === 'sim' || valor === 'naosei';
    });
    const nomesTreinamentos = treinamentosAplicaveis.map((campo) => TREINAMENTOS[campo]);

    const porteLabel = PORTE[data.get('porte')] || '';
    const setorLabel = SETOR[data.get('setor')] || '';
    const teveAcidente = data.get('acidente') === 'sim';
    const nome = (data.get('nome') || '').trim();
    const cnpj = (data.get('cnpj') || '').trim();
    const email = (data.get('email') || '').trim();
    const telefone = (data.get('telefone') || '').trim();
    const dadosContato = `Contato: ${nome}, ${telefone}, ${email}. CNPJ: ${cnpj}. Setor: ${setorLabel}.`;

    let whatsappTexto;
    let resultadoResumo;

    const notaAcidente = teveAcidente ? ' Já tivemos acidente de trabalho registrado (CAT) nos últimos 12 meses.' : '';
    const notaTreinamentos = nomesTreinamentos.length
      ? ` Também preciso manter em dia: ${nomesTreinamentos.join(', ')}.`
      : '';

    if (faltando.length === 0) {
      resultadoResumo = 'documentação de SST em dia';
      resumoEl.textContent = 'Pelo que você respondeu, a documentação de SST da sua empresa está em dia. O ponto agora é manter isso atualizado mês a mês, o que a gestão por contrato fixo da Íntegra faz.';
      pendenciasEl.hidden = true;
      pendenciasEl.innerHTML = '';
      whatsappTexto = `Olá, fiz o diagnóstico no site da Íntegra. ${dadosContato} Minha empresa (${porteLabel}) está com a documentação de SST em dia, mas quero saber mais sobre a gestão por contrato fixo.${notaAcidente}${notaTreinamentos}`;
    } else {
      const nomesFaltando = faltando.map((campo) => SERVICOS[campo]);
      resultadoResumo = `pendência em: ${nomesFaltando.join(', ')}`;
      resumoEl.textContent = 'Pelo que você respondeu, sua empresa tem pendência nos seguintes pontos:';
      pendenciasEl.hidden = false;
      pendenciasEl.innerHTML = nomesFaltando.map((item) => `<li>${item}</li>`).join('');
      whatsappTexto = `Olá, fiz o diagnóstico no site da Íntegra. ${dadosContato} Minha empresa (${porteLabel}) tem pendência em: ${nomesFaltando.join(', ')}. Quero saber como funciona o contrato fixo.${notaAcidente}${notaTreinamentos}`;
    }

    if (nomesTreinamentos.length === 0) {
      treinamentosResumoEl.textContent = 'Pelo que você respondeu, nenhum desses treinamentos parece se aplicar à sua empresa hoje.';
      treinamentosListaEl.hidden = true;
      treinamentosListaEl.innerHTML = '';
    } else {
      treinamentosResumoEl.textContent = 'Pelo que você respondeu, esses treinamentos podem se aplicar à sua empresa:';
      treinamentosListaEl.hidden = false;
      treinamentosListaEl.innerHTML = nomesTreinamentos.map((item) => `<li>${item}</li>`).join('');
    }

    atencaoEl.hidden = !teveAcidente;

    whatsappEl.href = `https://wa.me/5531972710771?text=${encodeURIComponent(whatsappTexto)}`;

    resultado.hidden = false;
    resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const payload = {
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: `Novo diagnóstico da Íntegra: ${nome} (${cnpj})`,
      from_name: nome || 'Site Íntegra',
      nome: nome,
      cnpj: cnpj,
      email: email,
      telefone: telefone,
      '01 Setor': setorLabel
    };
    PERGUNTAS.forEach(([campo, rotulo]) => {
      payload[rotulo] = RESPOSTA[data.get(campo)] || '';
    });
    payload['17 Porte da empresa'] = porteLabel;
    payload['Resultado'] = resultadoResumo;
    payload['Treinamentos que podem se aplicar'] = nomesTreinamentos.join(', ') || 'nenhum';

    enviarPorEmail(payload);
  });
});
