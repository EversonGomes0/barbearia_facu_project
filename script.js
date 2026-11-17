// =====================================================
  // PARTE 0 – Conexão com o Supabase (config.js define GANGSTAR_CONFIG)
  // =====================================================
  const cfg = window.GANGSTAR_CONFIG || {};
  const configurado =
      !!window.supabase &&
      !!cfg.SUPABASE_URL &&
      !!cfg.SUPABASE_PUBLISHABLE_KEY &&
      !cfg.SUPABASE_URL.includes("SEU-PROJETO") &&
      !cfg.SUPABASE_PUBLISHABLE_KEY.includes("COLE_AQUI");

  const db = configurado
      ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY)
      : null;

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
    // O valor é o nome CURTO ("Carlos"), que é o que o banco (Supabase) reconhece.
    const cartao = document.createElement("div");
    cartao.className = "barber-select";
    cartao.setAttribute("data-barber", b.short);
    cartao.innerHTML = `
      <div class="mini-avatar">${b.short[0]}</div>
      <strong>${b.short}</strong>
      <small>${b.list}</small>
      <a href="#${id}">Ver perfil →</a>`;
    $("barberCards").appendChild(cartao);

    $("barberSelect").appendChild(new Option(b.short, b.short));
  }
  times.forEach(t => $("bookingTime").appendChild(new Option(t, t)));

  // Não permite datas passadas
  const hoje = new Date();
  $("bookingDate").min = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  // =====================================================
  // PARTE 2 – AGENDAMENTO DA BARBEARIA (agora com Supabase)
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

  const ERROS = {
      nome_invalido: "Informe seu nome.",
      telefone_invalido: "Informe um telefone válido com DDD.",
      horario_invalido: "Horário inválido. Escolha um da lista.",
      data_invalida: "Escolha uma data válida (até 90 dias à frente).",
      horario_passou: "Esse horário já passou. Escolha outro.",
      barbeiro_invalido: "Barbeiro não encontrado. Escolha outro profissional.",
      servico_invalido: "Serviço não encontrado. Escolha outro.",
      horario_ocupado: "Esse horário acabou de ser reservado. Escolha outro horário ou barbeiro."
  };

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

  // 3. Desativar horários já ocupados (consulta o banco)
  let consultaAtual = 0;

  const atualizarHorarios = async () => {
      const id = ++consultaAtual;
      let ocupados = [];

      if (db && barbeiro.value && data.value) {
          try {
              const res = await db.rpc('horarios_ocupados', { p_barbeiro: barbeiro.value, p_data: data.value });
              if (res.error) throw res.error;
              ocupados = (res.data || []).map((linha) => linha.hora);
          } catch (erro) {
              console.error('Erro ao consultar horarios_ocupados:', erro);
          }
      }
      if (id !== consultaAtual) return; // chegou resposta velha

      const hojeStr = $("bookingDate").min;
      const agora = new Date();
      const agoraHHMM = String(agora.getHours()).padStart(2, '0') + ':' + String(agora.getMinutes()).padStart(2, '0');

      for (let i = 0; i < horario.options.length; i++) {
          const opcao = horario.options[i];
          if (opcao.value === '') continue; // mantém o "Selecione o horário" sempre desativado

          if (!opcao.dataset.label) opcao.dataset.label = opcao.textContent;

          let motivo = '';
          if (data.value === hojeStr && opcao.value <= agoraHHMM) motivo = ' (já passou)';
          else if (ocupados.includes(opcao.value)) motivo = ' (ocupado)';

          opcao.disabled = motivo !== '';
          opcao.textContent = opcao.dataset.label + motivo;
      }
      // Se o horário escolhido ficou ocupado, desmarca
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

  if (!configurado) {
      mensagem.innerText = '⚠️ Banco de dados não configurado. Preencha o config.js.';
  }

  // 4. Agendar (valida os campos e grava no Supabase)
  btnAgendar.addEventListener('click', async () => {
      const nomeVal = nome.value.trim();
      const telDigitos = telefone.value.replace(/\D/g, '');

      if (!db) {
          mensagem.innerText = '❌ Banco de dados não configurado (config.js).';
          return;
      }

      if (nomeVal.length < 2) {
          mensagem.innerText = '❌ Informe seu nome.';
          return;
      }

      if (telDigitos.length < 10 || telDigitos.length > 11) {
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

      // Guarda o que foi escolhido antes de limpar os campos
      const dadosDeste = {
          barbeiro: barbeiro.value,
          servico: estilo.value,
          servicoTexto: estilo.options[estilo.selectedIndex].text,
          data: data.value,
          horario: horario.value
      };

      btnAgendar.disabled = true;

      try {
          const res = await db.rpc('criar_agendamento', {
              p_nome: nomeVal,
              p_telefone: telDigitos,
              p_barbeiro: dadosDeste.barbeiro,
              p_servico: dadosDeste.servico,
              p_data: dadosDeste.data,
              p_horario: dadosDeste.horario
          });
          if (res.error) throw res.error;

          if (!res.data || !res.data.ok) {
              const codigo = res.data && res.data.erro;
              mensagem.innerText = '❌ ' + (ERROS[codigo] || 'Não foi possível concluir o agendamento. Tente novamente.');
              atualizarHorarios();
              return;
          }
      } catch (erro) {
          console.error('Erro ao criar agendamento:', erro);
          mensagem.innerText = '❌ Falha de conexão com o servidor. Tente de novo.';
          return;
      } finally {
          btnAgendar.disabled = false;
      }

      mensagem.innerText = `✅ Agendamento confirmado! ${nomeVal}, te esperamos às ${dadosDeste.horario}.`;

      // 5. Mostra o agendamento na lista da tela
      const novoLi = document.createElement('li');
      const [ano, mes, dia] = dadosDeste.data.split('-');

      const resumo = document.createElement('span');
      resumo.textContent = `${nomeVal} - ${dadosDeste.barbeiro} - ${dadosDeste.servicoTexto} - ${dia}/${mes}/${ano} às ${dadosDeste.horario}`;

      const btnRemover = document.createElement('button');
      btnRemover.type = 'button';
      btnRemover.className = 'btn-deletar';
      btnRemover.title = 'Remover da lista';
      btnRemover.textContent = '❌';
      // Só tira da tela: o horário continua reservado no banco
      btnRemover.addEventListener('click', () => novoLi.remove());

      novoLi.append(resumo, btnRemover);
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
              const c = document.querySelector(`.barber-select[data-barber="${b.short}"]`);
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
--- a/script.js	2026-11-17 00:18:14.711749035 +0000
+++ b/script.js	2026-11-17 00:18:29.497150846 +0000
@@ -18,15 +18,27 @@
   // (para editar bio ou especialidade, altere só aqui)
   // =====================================================
   const barbers = {
-    carlos: { name: "Carlos Magno",    short: "Carlos", list: "Especialista em degradê",          specialty: "Especialista em Degradê",                      bio: "Em aberto" },
-    marcos: { name: "Marcos Mota",     short: "Marcos", list: "Especialista em cortes clássicos", specialty: "Especialista em Cortes Clássicos",             bio: "Em aberto" },
-    rafael: { name: "Rafael Da Vinci", short: "Rafael", list: "Cortes modernos / freestyles",     specialty: "Especialista em Cortes Modernos e Freestyles", bio: "Em aberto" },
-    lucas:  { name: "Lucas Cordeiro",  short: "Lucas",  list: "Especialista em tesoura",          specialty: "Especialista em Tesoura",                      bio: "Em aberto" }
+    carlos: { name: "Carlos Magno",    short: "Carlos", list: "Especialista em degradê",          specialty: "Especialista em Degradê",                      bio: "Em aberto", photo: "fotos/Carlos_gangster_01.png", pos: "55% 20%", cuts: ["photos/corte1_carlos.jpg", "photos/corte2_carlos.jpg", "photos/corte3_carlos.jpg"] },
+    marcos: { name: "Marcos Mota",     short: "Marcos", list: "Especialista em cortes clássicos", specialty: "Especialista em Cortes Clássicos",             bio: "Em aberto", photo: "fotos/Marcos_gangster_02.png", pos: "50% 18%", cuts: ["photos/corte1_marcos.jpg", "photos/corte2_marcos.jpg", "photos/corte3_marcos.jpg"] },
+    rafael: { name: "Rafael Da Vinci", short: "Rafael", list: "Cortes modernos / freestyles",     specialty: "Especialista em Cortes Modernos e Freestyles", bio: "Em aberto", photo: "fotos/Rafael_gangster_03.png", pos: "56% 20%", cuts: ["photos/corte1_rafael.jpg", "photos/corte2_rafael.jpg", "photos/corte3_rafael.jpg"] },
+    lucas:  { name: "Lucas Cordeiro",  short: "Lucas",  list: "Especialista em tesoura",          specialty: "Especialista em Tesoura",                      bio: "Em aberto", photo: "fotos/Lucas_ gangster_04.png", pos: "45% 22%", cuts: ["photos/corte1_lucas.jpg", "photos/corte2_lucas.jpg", "photos/corte3_lucas.jpg"] }
   };
   const times = ["09:00","10:00","11:00","14:00","15:00","16:00","17:00","18:00","19:00"];
 
   const $ = id => document.getElementById(id);
 
+  // Coloca uma foto dentro de um elemento. Se a imagem não carregar, mostra um texto no lugar.
+  // (encodeURI: o arquivo "Lucas_ gangster_04.png" tem espaço no nome)
+  function montarFoto(el, src, alt, pos, textoReserva) {
+      const img = new Image();
+      img.alt = alt;
+      if (pos) img.style.objectPosition = pos;
+      img.onerror = () => { el.textContent = textoReserva; };
+      img.src = encodeURI(src);
+      el.textContent = "";
+      el.appendChild(img);
+  }
+
   for (const [id, b] of Object.entries(barbers)) {
     // Cartão clicável (usado pelo código do agendamento: .barber-select + data-barber)
     // O valor é o nome CURTO ("Carlos"), que é o que o banco (Supabase) reconhece.
@@ -34,10 +46,11 @@
     cartao.className = "barber-select";
     cartao.setAttribute("data-barber", b.short);
     cartao.innerHTML = `
-      <div class="mini-avatar">${b.short[0]}</div>
+      <div class="mini-avatar"></div>
       <strong>${b.short}</strong>
       <small>${b.list}</small>
       <a href="#${id}">Ver perfil →</a>`;
+    montarFoto(cartao.querySelector(".mini-avatar"), b.photo, b.name, b.pos, b.short[0]);
     $("barberCards").appendChild(cartao);
 
     $("barberSelect").appendChild(new Option(b.short, b.short));
@@ -272,7 +285,16 @@
           $("pName").textContent = b.name;
           $("pSpecialty").textContent = b.specialty;
           $("pBio").textContent = b.bio;
-          $("pAvatar").textContent = b.short[0];
+          montarFoto($("pAvatar"), b.photo, b.name, b.pos, b.short[0]);
+
+          // Trabalhos recentes: fotos dos cortes (pasta photos/)
+          $("portfolio").innerHTML = "";
+          b.cuts.forEach((src, i) => {
+              const item = document.createElement("div");
+              item.className = "portfolio-item";
+              montarFoto(item, src, `Corte ${i + 1} de ${b.short}`, "", `Corte ${i + 1}`);
+              $("portfolio").appendChild(item);
+          });
           // "Agendar com este barbeiro" seleciona o cartão correspondente
           $("pBook").onclick = () => {
               const c = document.querySelector(`.barber-select[data-barber="${b.short}"]`);
  window.addEventListener("hashchange", route);
  route();
