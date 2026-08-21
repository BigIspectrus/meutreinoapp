# Changelog v12.4.0 Beta

## Registro do treino

- adiciona botão opcional para marcar o início exato da série;
- calcula o descanso real entre a conclusão de uma série e o início da próxima;
- mantém compatibilidade com séries concluídas sem o novo botão, identificando a qualidade temporal como aproximada;
- preserva início da série, descanso e qualidade do horário no rascunho automático, histórico, CSV e espelho Room;
- Recovery passa a usar o início exato da próxima série para evitar janelas de FC contaminadas quando esse dado estiver disponível.

## Contexto e esforço

- adiciona RPE geral de 1 a 10 ao finalizar;
- adiciona marcadores opcionais de sono ruim, estresse, alimentação, desconforto, pouco tempo ou treino excelente;
- adiciona anotação livre da sessão;
- exibe RPE, contexto e descanso exato no resumo e nos detalhes do histórico;
- inclui os novos campos no backup e na sincronização do banco Android.

## Descanso, telefone e relógio

- adiciona vibração leve, média, longa ou desativada;
- adiciona controle separado para o som da notificação Android;
- cria aviso de fim de descanso público, descartável e não local, compatível com o espelhamento padrão para relógios pareados;
- mantém a notificação permanente do treino separada do aviso de fim do descanso;
- adiciona atalho para revisar as notificações do TreinoApp nas configurações do Android.

## Compatibilidade

- Room atualizado do schema 3 para 4 por migração explícita e não destrutiva;
- histórico antigo continua válido;
- Health Connect continua pós-treino; não foi adicionada leitura de FC em tempo real.
