document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('diagnostico-form');
  if (!form) {
    return;
  }

  // Chave gratuita do Web3Forms (web3forms.com). Enquanto estiver com o valor
  // abaixo, o e-mail simplesmente não é enviado — o diagnóstico e o WhatsApp
  // continuam funcionando normalmente.
  const WEB3FORMS_ACCESS_KEY = 'COLOQUE_SUA_CHAVE_AQUI';

  const resultado = document.getElementById('diagnostico-resultado');
  const resumoEl = document.getElementById('diagnostico-resumo');
  const pendenciasEl = document.getElementById('diagnostico-pendencias');
  const atencaoEl = document.getElementById('diagnostico-atencao');
  const whatsappEl = document.getElementById('diagnostico-whatsapp');

  const SERVICOS = {
    pgr: 'PGR',
    pcmso: 'PCMSO',
    ltcat: 'LTCAT',
    nr16: 'Laudo NR-16',
    aep_aet: 'AEP / AET'
  };

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

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const campos = Object.keys(SERVICOS);

    const semResposta = campos.some((campo) => !data.get(campo)) || !data.get('porte') || !data.get('setor') || !data.get('acidente');
    if (semResposta) {
      alert('Responda todas as perguntas antes de ver o resultado.');
      return;
    }

    const faltando = campos.filter((campo) => {
      const valor = data.get(campo);
      return valor === 'nao' || valor === 'naosei';
    });

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

    if (faltando.length === 0) {
      resultadoResumo = 'documentação de SST em dia';
      resumoEl.textContent = 'Pelo que você respondeu, a documentação de SST da sua empresa está em dia. O ponto agora é manter isso atualizado mês a mês, o que a gestão por contrato fixo da Íntegra faz.';
      pendenciasEl.hidden = true;
      pendenciasEl.innerHTML = '';
      whatsappTexto = `Olá, fiz o diagnóstico no site da Íntegra. ${dadosContato} Minha empresa (${porteLabel}) está com a documentação de SST em dia, mas quero saber mais sobre a gestão por contrato fixo.${notaAcidente}`;
    } else {
      const nomesFaltando = faltando.map((campo) => SERVICOS[campo]);
      resultadoResumo = `pendência em: ${nomesFaltando.join(', ')}`;
      resumoEl.textContent = 'Pelo que você respondeu, sua empresa tem pendência nos seguintes pontos:';
      pendenciasEl.hidden = false;
      pendenciasEl.innerHTML = nomesFaltando.map((item) => `<li>${item}</li>`).join('');
      whatsappTexto = `Olá, fiz o diagnóstico no site da Íntegra. ${dadosContato} Minha empresa (${porteLabel}) tem pendência em: ${nomesFaltando.join(', ')}. Quero saber como funciona o contrato fixo.${notaAcidente}`;
    }

    atencaoEl.hidden = !teveAcidente;

    whatsappEl.href = `https://wa.me/5531972710771?text=${encodeURIComponent(whatsappTexto)}`;

    resultado.hidden = false;
    resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (WEB3FORMS_ACCESS_KEY && WEB3FORMS_ACCESS_KEY !== 'COLOQUE_SUA_CHAVE_AQUI') {
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: 'Novo diagnóstico de SST pelo site da Íntegra',
          from_name: nome || 'Site Íntegra',
          nome: nome,
          cnpj: cnpj,
          email: email,
          telefone: telefone,
          setor: setorLabel,
          porte: porteLabel,
          acidente_recente: teveAcidente ? 'sim' : 'não',
          resultado: resultadoResumo
        })
      }).catch(() => {
        // Falha de rede aqui não deve travar o visitante: o resultado e o
        // link do WhatsApp já foram exibidos de qualquer forma.
      });
    }
  });
});
