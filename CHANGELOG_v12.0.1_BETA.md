# TreinoApp v12.0.1 Beta

Foco desta beta: corrigir e tornar auditável a integração Galaxy Watch/Samsung Health/Health Connect e melhorar três pontos observados no primeiro APK real.

## Health Connect
- Janela de busca ampliada para 90 min antes/depois.
- Matching mais tolerante a diferenças de início, fim e duração entre Galaxy Watch e TreinoApp.
- Associação automática a partir de 78% de confiança.
- Em sincronização manual, candidatos a partir de 30% podem ser confirmados pelo usuário.
- Novo diagnóstico lista até 20 sessões reais lidas do Health Connect nas últimas 24 h, com origem, título, horário, duração, FC, kcal e percentual de correspondência.
- Associação manual de qualquer sessão diagnosticada à sessão pendente.
- Vínculo manual/automático também é persistido no banco Room nativo.
- Nova escada de retry em 1, 3, 7, 15 e 30 minutos quando leitura em segundo plano estiver autorizada.
- Nova tentativa automática ao voltar para o TreinoApp depois de abrir Samsung Health/Health Connect.
- Gravação de sessão do TreinoApp no Health Connect passa a ser uma ação explícita quando há sessão pendente, para reduzir duplicidades.
- Status mostra separadamente permissão para Exercício, FC e kcal.

## Armazenamento Android
- No APK, o botão de persistência do navegador deixa de ser usado.
- A tela passa a informar que os dados estão no armazenamento privado do Android e são preservados em atualizações assinadas do mesmo aplicativo.
- Exibe estimativa de espaço ocupado pelos dados privados do APK.

## Sessão avulsa
- Registro Avulso virou Sessão Avulsa.
- Usa exatamente o motor do treino montado: conclusão de série, timer, descanso automático, notificação persistente, tipo de série, histórico do exercício, Modo Academia, pausa e resumo final.
- Configuração rápida de número de séries, descanso, incremento e faixa de repetições.
- Rascunho de sessão avulsa pode ser retomado.

## Widget Android
- Layout completamente redesenhado.
- Cabeçalho visual, status, nome do treino, exercício atual, barra de progresso e dois cards de métricas.
- Durante treino: séries concluídas e duração.
- Fora do treino: meta semanal e streak.
- Atualização do tempo do widget a cada minuto enquanto o foreground service estiver ativo.

## APK/PWA
- Service Worker deixa de ser registrado dentro do APK e registros antigos são removidos no início nativo.
- Diagnóstico distingue Android nativo de PWA/navegador.
- Service Worker web atualizado para a versão 12.0.1.
