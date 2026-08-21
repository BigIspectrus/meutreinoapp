# Roteiro de teste v12.4.0 Beta

Instale por cima da Beta anterior. Não desinstale antes.

## Série e descanso

- iniciar um treino e tocar em `Iniciar série · medir descanso`;
- concluir a série e esperar alguns segundos;
- tocar em `Iniciar série` na série seguinte e confirmar que o descanso some;
- finalizar o treino e abrir os detalhes no histórico;
- confirmar que aparece `Descanso exato` e o tempo registrado;
- repetir uma série sem tocar em `Iniciar série` e confirmar que o fluxo antigo continua funcionando.

## RPE e contexto

- finalizar um treino;
- selecionar um RPE geral;
- marcar dois contextos e escrever uma anotação;
- confirmar os três itens no resumo final;
- fechar, abrir o histórico e confirmar novamente em `Percepção e contexto`.

## Galaxy Watch e notificações

- em Mais -> Preferências, escolher vibração leve, média e longa em testes separados;
- alternar o som da notificação Android entre ativado e silencioso;
- no Galaxy Wearable, abrir Configurações do relógio -> Notificações -> Notificações de aplicativos e permitir `TreinoApp Beta`;
- com o relógio conectado por Bluetooth, iniciar um descanso curto e apagar a tela do telefone;
- confirmar que `Descanso concluído` aparece no telefone e no relógio;
- repetir com o telefone desbloqueado caso o Galaxy Wearable esteja configurado para mostrar no relógio apenas quando a tela estiver apagada.

O Galaxy Watch pode aplicar o próprio padrão de vibração em vez de reproduzir exatamente a duração escolhida no telefone. Isso é controlado pelo relógio/Galaxy Wearable.

## Regressão

- fechar e reabrir o app durante uma sessão e confirmar o rascunho;
- finalizar treino, abrir histórico e compartilhar imagem;
- sincronizar uma sessão do Galaxy Watch após encerrá-la no Samsung Health;
- confirmar FC, calorias, RIR/RPE e associação Health Connect;
- exportar um backup e um CSV.
