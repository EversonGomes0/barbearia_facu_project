/* GANGSTAR - Agendamento com Supabase
   Os horários ocupados e os agendamentos ficam no banco (Supabase),
   acessados pelas funções horarios_ocupados e criar_agendamento (veja supabase.sql). */

(function () {
    "use strict";

    /* ---------- Conexão com o Supabase ---------- */

    var cfg = window.GANGSTAR_CONFIG || {};
    var configurado =
        !!window.supabase &&
        !!cfg.SUPABASE_URL &&
        !!cfg.SUPABASE_PUBLISHABLE_KEY &&
        cfg.SUPABASE_URL.indexOf("SEU-PROJETO") === -1 &&
        cfg.SUPABASE_PUBLISHABLE_KEY.indexOf("COLE_AQUI") === -1;

    var db = configurado
        ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY)
        : null;

    /* ---------- Elementos da página ---------- */

    var form = document.querySelector("form");
    if (!form) return;

    var nome = document.getElementById("clientName");
    var telefone = document.getElementById("clientPhone");
    var barbeiro = document.getElementById("barberSelect");
    var estilo = document.getElementById("styleSelect");
    var data = document.getElementById("bookingDate");
    var horario = document.getElementById("bookingTime");
    var botaoEnviar = form.querySelector('button[type="submit"]');
    var barberCards = document.querySelectorAll(".barber-select");
    var selectionHint = document.getElementById("barberSelectionHint");

    /* ---------- Seleção de barbeiro e serviço pelos cartões ---------- */

    function atualizarSelecaoBarbeiro() {
        Array.prototype.forEach.call(barberCards, function (card) {
            var selecionado = card.getAttribute("data-barber") === barbeiro.value;
            card.setAttribute("aria-pressed", selecionado ? "true" : "false");
            card.parentNode.classList.toggle("is-selected", selecionado);
        });

        if (selectionHint) {
            if (barbeiro.value) {
                selectionHint.textContent = barbeiro.value + " selecionado. Agora escolha o serviço e o melhor horário.";
                selectionHint.classList.add("has-selection");
            } else {
                selectionHint.textContent = "Selecione um barbeiro para começar seu agendamento.";
                selectionHint.classList.remove("has-selection");
            }
        }
    }

    Array.prototype.forEach.call(barberCards, function (card) {
        card.addEventListener("click", function () {
            barbeiro.value = card.getAttribute("data-barber");
            barbeiro.dispatchEvent(new Event("change", { bubbles: true }));
            document.getElementById("agendamento").scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    barbeiro.addEventListener("change", atualizarSelecaoBarbeiro);
    atualizarSelecaoBarbeiro();

    Array.prototype.forEach.call(document.querySelectorAll(".service-book"), function (button) {
        button.addEventListener("click", function () {
            estilo.value = button.getAttribute("data-service");
            document.getElementById("agendamento").scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    /* ---------- Utilidades ---------- */

    function hojeISO() {
        var d = new Date();
        var mes = String(d.getMonth() + 1).padStart(2, "0");
        var dia = String(d.getDate()).padStart(2, "0");
        return d.getFullYear() + "-" + mes + "-" + dia;
    }

    function agoraHHMM() {
        var d = new Date();
        return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }

    function formatarDataBR(iso) {
        var p = iso.split("-");
        return p[2] + "/" + p[1] + "/" + p[0];
    }

    function formatarReal(valor) {
        return "R$ " + Number(valor).toFixed(2).replace(".", ",");
    }

    function escapeHTML(texto) {
        var div = document.createElement("div");
        div.textContent = texto;
        return div.innerHTML;
    }

    /* ---------- Máscara de telefone: (11) 99999-9999 ---------- */

    telefone.addEventListener("input", function () {
        var n = telefone.value.replace(/\D/g, "").slice(0, 11);
        var r = n;
        if (n.length > 10) {
            r = "(" + n.slice(0, 2) + ") " + n.slice(2, 7) + "-" + n.slice(7);
        } else if (n.length > 6) {
            r = "(" + n.slice(0, 2) + ") " + n.slice(2, 6) + "-" + n.slice(6);
        } else if (n.length > 2) {
            r = "(" + n.slice(0, 2) + ") " + n.slice(2);
        } else if (n.length > 0) {
            r = "(" + n;
        }
        telefone.value = r;
    });

    data.min = hojeISO();

    /* ---------- Mensagens na tela ---------- */

    var caixa = document.createElement("div");
    caixa.setAttribute("role", "status");
    caixa.style.display = "none";
    caixa.style.marginTop = "20px";
    caixa.style.padding = "15px";
    caixa.style.borderRadius = "8px";
    caixa.style.lineHeight = "1.5";
    form.appendChild(caixa);

    var avisoDisponibilidade = document.createElement("p");
    avisoDisponibilidade.setAttribute("role", "status");
    avisoDisponibilidade.style.display = "none";
    avisoDisponibilidade.style.margin = "10px 0 0";
    avisoDisponibilidade.style.fontSize = "13px";
    avisoDisponibilidade.style.color = "#c9b991";
    form.appendChild(avisoDisponibilidade);
    var temporizadorAvisoDisponibilidade;

    function mostrarMensagem(html, tipo) {
        caixa.innerHTML = html;
        caixa.style.display = "block";
        caixa.style.color = "#f2f0eb";
        if (tipo === "erro") {
            caixa.style.background = "#2a1414";
            caixa.style.border = "1px solid #c0392b";
        } else {
            caixa.style.background = "#1d2020";
            caixa.style.border = "1px solid #e3a72f";
        }
        caixa.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function mostrarAvisoDisponibilidade() {
        window.clearTimeout(temporizadorAvisoDisponibilidade);
        avisoDisponibilidade.textContent =
            "Não foi possível verificar a disponibilidade agora; a confirmação final será feita ao agendar.";
        avisoDisponibilidade.style.display = "block";
        temporizadorAvisoDisponibilidade = window.setTimeout(function () {
            avisoDisponibilidade.style.display = "none";
        }, 7000);
    }

    function limparAvisoDisponibilidade() {
        window.clearTimeout(temporizadorAvisoDisponibilidade);
        avisoDisponibilidade.style.display = "none";
        avisoDisponibilidade.textContent = "";
    }

    /* ---------- Banco de dados ---------- */

    function buscarOcupados(barbeiroNome, dataStr) {
        if (!barbeiroNome || !dataStr) return Promise.resolve([]);
        if (!db) return Promise.reject(new Error("Cliente Supabase não configurado."));
        return db
            .rpc("horarios_ocupados", { p_barbeiro: barbeiroNome, p_data: dataStr })
            .then(function (res) {
                if (res.error) throw res.error;
                return (res.data || []).map(function (linha) { return linha.hora; });
            });
    }

    function criarAgendamentoNoBanco(dados) {
        return db
            .rpc("criar_agendamento", {
                p_nome: dados.nome,
                p_telefone: dados.telefone,
                p_barbeiro: dados.barbeiro,
                p_servico: dados.servico,
                p_data: dados.data,
                p_horario: dados.horario
            })
            .then(function (res) {
                if (res.error) throw res.error;
                return res.data;
            });
    }

    /* ---------- Horários disponíveis ---------- */

    var consultaAtual = 0;

    function aplicarHorarios(ocupados) {
        var hojeStr = hojeISO();
        var agora = agoraHHMM();

        Array.prototype.forEach.call(horario.options, function (opt) {
            if (!opt.value) return;

            if (!opt.dataset.label) opt.dataset.label = opt.textContent;

            var indisponivel = false;
            var motivo = "";

            if (data.value === hojeStr && opt.value <= agora) {
                indisponivel = true;
                motivo = " (já passou)";
            } else if (ocupados.indexOf(opt.value) !== -1) {
                indisponivel = true;
                motivo = " (ocupado)";
            }

            opt.disabled = indisponivel;
            opt.textContent = opt.dataset.label + motivo;
        });

        var atual = horario.options[horario.selectedIndex];
        if (atual && atual.disabled && atual.value) {
            horario.value = "";
        }
    }

    function atualizarHorarios() {
        var id = ++consultaAtual;
        aplicarHorarios([]);

        if (!barbeiro.value || !data.value) return;

        buscarOcupados(barbeiro.value, data.value)
            .then(function (ocupados) {
                if (id !== consultaAtual) return; // chegou resposta velha
                limparAvisoDisponibilidade();
                aplicarHorarios(ocupados);
            })
            .catch(function (erro) {
                if (id !== consultaAtual) return;
                console.error("Erro ao consultar horarios_ocupados:", {
                    message: erro && erro.message,
                    code: erro && erro.code,
                    details: erro && erro.details,
                    hint: erro && erro.hint,
                    error: erro
                });
                aplicarHorarios([]);
                mostrarAvisoDisponibilidade();
            });
    }

    barbeiro.addEventListener("change", atualizarHorarios);
    data.addEventListener("change", atualizarHorarios);
    atualizarHorarios();

    if (!configurado) {
        mostrarMensagem(
            "O banco de dados ainda não está configurado. Preencha a URL e a chave publishable no arquivo <strong>config.js</strong>.",
            "erro"
        );
    }

    /* ---------- Mensagens de erro vindas do banco ---------- */

    var ERROS = {
        nome_invalido: "Informe seu nome.",
        telefone_invalido: "Informe um telefone válido com DDD. Ex.: (11) 99999-9999.",
        horario_invalido: "Horário inválido. Escolha um dos horários da lista.",
        data_invalida: "Escolha uma data válida (até 90 dias à frente).",
        horario_passou: "Esse horário já passou. Escolha outro horário.",
        barbeiro_invalido: "Barbeiro não encontrado. Escolha outro profissional.",
        servico_invalido: "Serviço não encontrado. Escolha outro serviço.",
        horario_ocupado: "Esse horário acabou de ser reservado por outra pessoa. Escolha outro horário ou outro barbeiro."
    };

    /* ---------- Envio do formulário ---------- */

    form.addEventListener("submit", function (evento) {
        evento.preventDefault();

        if (!db) {
            mostrarMensagem("O banco de dados ainda não está configurado (config.js).", "erro");
            return;
        }

        var nomeVal = nome.value.trim();
        var telDigitos = telefone.value.replace(/\D/g, "");
        var barbeiroVal = barbeiro.value;
        var estiloVal = estilo.value;
        var dataVal = data.value;
        var horaVal = horario.value;

        if (nomeVal.length < 2) {
            mostrarMensagem(ERROS.nome_invalido, "erro");
            nome.focus();
            return;
        }

        if (telDigitos.length < 10 || telDigitos.length > 11) {
            mostrarMensagem(ERROS.telefone_invalido, "erro");
            telefone.focus();
            return;
        }

        if (!barbeiroVal || !estiloVal || !dataVal || !horaVal) {
            mostrarMensagem("Preencha todos os campos para confirmar o agendamento.", "erro");
            return;
        }

        if (dataVal < hojeISO()) {
            mostrarMensagem("Escolha uma data a partir de hoje.", "erro");
            data.focus();
            return;
        }

        if (dataVal === hojeISO() && horaVal <= agoraHHMM()) {
            mostrarMensagem(ERROS.horario_passou, "erro");
            horario.focus();
            return;
        }

        botaoEnviar.disabled = true;

        criarAgendamentoNoBanco({
            nome: nomeVal,
            telefone: telDigitos,
            barbeiro: barbeiroVal,
            servico: estiloVal,
            data: dataVal,
            horario: horaVal
        })
            .then(function (resp) {
                if (!resp || !resp.ok) {
                    var codigo = resp && resp.erro;
                    mostrarMensagem(ERROS[codigo] || "Não foi possível concluir o agendamento. Tente novamente.", "erro");
                    atualizarHorarios();
                    return;
                }

                var resumo =
                    "<strong>Agendamento confirmado!</strong><br>" +
                    escapeHTML(nomeVal) + ", te esperamos em <strong>" + formatarDataBR(dataVal) +
                    "</strong> às <strong>" + horaVal + "</strong>.<br>" +
                    "Barbeiro: " + escapeHTML(barbeiroVal) + "<br>" +
                    "Serviço: " + escapeHTML(estiloVal) + " - " + formatarReal(resp.valor);

                form.reset();
                atualizarSelecaoBarbeiro();
                atualizarHorarios();
                limparAvisoDisponibilidade();
                mostrarMensagem(resumo, "ok");
            })
            .catch(function () {
                mostrarMensagem("Falha de conexão com o servidor. Verifique sua internet e tente de novo.", "erro");
            })
            .then(function () {
                botaoEnviar.disabled = false;
            });
    });
})();
