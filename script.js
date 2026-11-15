// =====================================================
  // PARTE 1 – Dados e montagem dos elementos repetidos
  // (para editar bio ou especialidade, altere só aqui)
  // =====================================================
  const barbers = {
    carlos: { name: "Carlos Magno",    short: "Carlos", list: "Especialista em degradê",          specialty: "Especialista em Degradê",                      bio: "Em aberto" },
    marcos: { name: "Marcos Mota",     short: "Marcos", list: "Especialista em cortes clássicos", specialty: "Especialista em Cortes Clássicos",             bio: "Em aberto" },
    rafael: { name: "Rafael Da Vinci", short: "Rafael", list: "Cortes modernos / freestyles",     specialty: "Especialista em Cortes Modernos e Freestyles", bio: "Em aberto" },
    lucas:  { name: "Lucas Cordeiro",  short: "Lucas",  list: "Especialista em tesoura",          specialty: "Especialista em Tesoura",                      bio: "Em aberto" }
  };
  const times = ["09:00","10:00","11:00","14:00","15:00","16:00","17:00","18:00","19:00"];

  const $ = id => document.getElementById(id);

  for (const [id, b] of Object.entries(barbers)) {
    // Cartão clicável (usado pelo código do agendamento: .barber-select + data-barber)
    const cartao = document.createElement("div");
    cartao.className = "barber-select";
    cartao.setAttribute("data-barber", b.name);
    cartao.innerHTML = `
      <div class="mini-avatar">${b.short[0]}</div>
      <strong>${b.short}</strong>
      <small>${b.list}</small>
      <a href="#${id}">Ver perfil →</a>`;
    $("barberCards").appendChild(cartao);

    $("barberSelect").appendChild(new Option(b.short, b.name));
  }
  times.forEach(t => $("bookingTime").appendChild(new Option(t, t)));

  // Não permite datas passadas
  const hoje = new Date();
  $("bookingDate").min = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  // =====================================================
  // PARTE 2 – AGENDAMENTO DA BARBEARIA (seu barber.js)
  // =====================================================
  const nome = document.getElementById('clientName');
  const telefone = document.getElementById('clientPhone');
  const barbeiro = document.getElementById('barberSelect');
  const estilo = document.getElementById('styleSelect');
  const data = document.getElementById('bookingDate');
  const horario = document.getElementById('bookingTime');
  const mensagem = document.getElementById('mensagem');
  const listaAgendamentos = document.getElementById('listaAgendamentos');

  const btnAgendar = document.getElementById('btnAgendar');
  const btnTema = document.getElementById('btnTema');

  const cartoesBarbeiro = document.querySelectorAll('.barber-select');

  // Guarda os agendamentos feitos (no lugar do banco de dados)
  let agendamentos = [];

  // 1. Escolher o barbeiro clicando no cartão
  cartoesBarbeiro.forEach((cartao) => {
      cartao.addEventListener('click', () => {
          barbeiro.value = cartao.getAttribute('data-barber');

          // Destaca só o cartão escolhido
          cartoesBarbeiro.forEach((outro) => {
              outro.classList.toggle('is-selected', outro === cartao);
          });

          mensagem.innerText = `${barbeiro.value} selecionado! Agora escolha o serviço e o horário.`;
          atualizarHorarios();
      });
  });

  // 2. Escolher o serviço clicando no botão
  const botoesServico = document.querySelectorAll('.service-book');

  botoesServico.forEach((botao) => {
      botao.addEventListener('click', () => {
          estilo.value = botao.getAttribute('data-service');
          mensagem.innerText = `${estilo.value} selecionado!`;
      });
  });

  // 3. Desativar horários que já foram marcados
  const atualizarHorarios = () => {
      for (let i = 0; i < horario.options.length; i++) {
          const opcao = horario.options[i];
          if (opcao.value === '') continue; // mantém o "Selecione o horário" sempre desativado

          opcao.disabled = false;

          // Procura se esse horário já está ocupado para esse barbeiro e data
          for (let j = 0; j < agendamentos.length; j++) {
              const ag = agendamentos[j];
              if (ag.barbeiro === barbeiro.value && ag.data === data.value && ag.horario === opcao.value) {
                  opcao.disabled = true;
              }
          }
      }
      // Se o horário escolhido acabou de ficar ocupado, desmarca
      if (horario.selectedOptions[0] && horario.selectedOptions[0].disabled) {
          horario.value = '';
      }
  };

  barbeiro.addEventListener('change', () => {
      // Mantém o destaque do cartão igual ao select
      cartoesBarbeiro.forEach((c) => c.classList.toggle('is-selected', c.getAttribute('data-barber') === barbeiro.value));
      atualizarHorarios();
  });
  data.addEventListener('change', atualizarHorarios);

  // 4. Agendar (valida os campos e mostra o resumo)
  btnAgendar.addEventListener('click', () => {
      const nomeVal = nome.value.trim();
      const telVal = telefone.value.trim();

      if (nomeVal.length < 2) {
          mensagem.innerText = '❌ Informe seu nome.';
          return;
      }

      if (telVal.length < 10) {
          mensagem.innerText = '❌ Informe um telefone válido com DDD.';
          return;
      }

      if (!barbeiro.value || !estilo.value || !data.value || !horario.value) {
          mensagem.innerText = '❌ Preencha todos os campos para agendar.';
          return;
      }

      if (data.value < data.min) {
          mensagem.innerText = '❌ Escolha uma data a partir de hoje.';
          return;
      }

      // Guarda o agendamento
      agendamentos.push({
          barbeiro: barbeiro.value,
          data: data.value,
          horario: horario.value
      });

      mensagem.innerText = `✅ Agendamento confirmado! ${nomeVal}, te esperamos às ${horario.value}.`;

      // 5. Mostra o agendamento na lista, com botão para cancelar
      const novoLi = document.createElement('li');
      const [ano, mes, dia] = data.value.split('-');

      novoLi.innerHTML = `
      <span>${nomeVal} - ${barbeiro.value} - ${estilo.options[estilo.selectedIndex].text} - ${dia}/${mes}/${ano} às ${horario.value}</span>
      <button type="button" class="btn-deletar" title="Cancelar agendamento">❌</button>
      `;

      // Cancelar: remove da tela e libera o horário
      const dadosDeste = { barbeiro: barbeiro.value, data: data.value, horario: horario.value };

      novoLi.querySelector('.btn-deletar').addEventListener('click', () => {
          novoLi.remove();
          agendamentos = agendamentos.filter((ag) => {
              return !(ag.barbeiro === dadosDeste.barbeiro && ag.data === dadosDeste.data && ag.horario === dadosDeste.horario);
          });
          atualizarHorarios();
      });

      listaAgendamentos.appendChild(novoLi);

      // Limpa os campos
      nome.value = '';
      telefone.value = '';
      estilo.value = '';
      horario.value = '';
      atualizarHorarios();
  });

  // Enter dentro do formulário também agenda (sem recarregar a página)
  $("bookingForm").addEventListener('submit', (e) => {
      e.preventDefault();
      btnAgendar.click();
  });

  // 6. Modo escuro (a página já começa escura; o botão alterna)
  btnTema.addEventListener('click', () => {
      document.body.classList.toggle('dark');
  });

  // =====================================================
  // PARTE 3 – Navegação entre página inicial e perfis (#carlos, #marcos...)
  // =====================================================
  function route() {
      const hash = location.hash.slice(1).toLowerCase();
      const b = barbers[hash];

      if (b) {
          $("view-home").hidden = true;
          $("view-profile").hidden = false;
          $("headerSub").textContent = "Conheça nossa equipe de especialistas";
          $("pName").textContent = b.name;
          $("pSpecialty").textContent = b.specialty;
          $("pBio").textContent = b.bio;
          $("pAvatar").textContent = b.short[0];
          // "Agendar com este barbeiro" seleciona o cartão correspondente
          $("pBook").onclick = () => {
              const c = document.querySelector(`.barber-select[data-barber="${b.name}"]`);
              if (c) c.click();
          };
          document.title = `${b.name} – GANGSTAR`;
          window.scrollTo(0, 0);
      } else {
          $("view-profile").hidden = true;
          $("view-home").hidden = false;
          $("headerSub").textContent = "Estilo, tradição e navalha afiada desde 2010";
          document.title = "GANGSTAR – Barbearia";
          if (hash === "agendar") $("agendar").scrollIntoView();
      }
  }
  window.addEventListener("hashchange", route);
  route();
