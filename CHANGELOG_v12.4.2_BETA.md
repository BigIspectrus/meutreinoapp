# Changelog v12.4.2 Beta

## Início de série pelo Galaxy Watch

- adiciona a ação “Iniciar série” ao aviso de fim do descanso enviado ao Wear OS;
- registra no Android o horário exato em que o botão foi acionado;
- mantém esse início pendente mesmo se a tela do celular estiver apagada ou o WebView for recriado;
- sincroniza o horário com a série correta ao abrir, focar ou voltar ao TreinoApp;
- identifica a série por sessão, exercício, número e posição para reduzir ambiguidades;
- substitui o aviso por uma confirmação curta: a série começou e deve ser concluída pelo celular;
- ignora ações atrasadas de avisos antigos, impedindo que iniciem a série errada;
- torna toques repetidos idempotentes, sem criar vários horários de início;
- remove a ação pendente quando a série é iniciada pelo celular ou o treino termina.

## Testes e compatibilidade

- separa “Testar aviso” e “Testar botão” em Mais → Preferências → Galaxy Watch;
- o teste do botão confirma o caminho relógio → celular sem alterar sessão, série ou histórico;
- mantém o encerramento da série somente no celular;
- mantém Health Connect e dados de FC no fluxo pós-treino;
- Room permanece no schema 4 e o schema Web permanece 15, sem migração de dados;
- o fluxo Web/PWA e o treino sem relógio continuam funcionando normalmente.
