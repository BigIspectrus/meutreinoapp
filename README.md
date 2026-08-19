# TreinoApp v12.1.0 Beta — Web + Android

TreinoApp continua funcionando como PWA no GitHub Pages e também possui uma versão Android nativa baseada em Capacitor.

## Identidade do aplicativo

- Stable: `com.treinoapp.app`
- Beta: `com.treinoapp.beta`
- Versão deste projeto: `12.1.0`
- versionCode: `120100`
- Android: API 36, minSdk 26

## Recursos Android

- notificação persistente durante o treino;
- cronômetro nativo de descanso com ações `-15s`, `Pular` e `+30s`;
- serviço Android de treino ativo;
- widget de tela inicial;
- Health Connect com leitura e escrita de sessão, frequência cardíaca, calorias e peso;
- associação automática com sessões do relógio quando a confiança temporal for >= 78%;
- confirmação manual quando a correspondência não for suficientemente segura;
- Room nativo como espelho resiliente de sessões e séries, com migração não destrutiva;
- APK Beta e Stable separados;
- APK/AAB assinados pelo GitHub Actions.

## Health Connect na v12.1.0

A v12.1.0 corrige o transporte dos timestamps entre WebView, Kotlin e Room. Horários de início/fim passam a ser tratados como `Long`, evitando que sessões quase idênticas do TreinoApp e do Samsung Health sejam rejeitadas como se não estivessem na mesma janela de tempo.

Quando uma sessão é associada, o TreinoApp pode preservar junto ao treino:

- ID do registro Health;
- origem dos dados;
- início e fim do relógio;
- confiança da associação;
- frequência cardíaca média, máxima e mínima;
- calorias;
- amostras de frequência cardíaca reduzidas para visualização;
- duração monitorada.

## Uso dos dados do relógio

Os dados não ficam apenas no diagnóstico. O Histórico ganhou uma tela completa de detalhes por sessão com:

- exercícios, séries, carga, repetições, volume e PRs;
- dados do Galaxy Watch/Health Connect;
- gráfico de frequência cardíaca;
- zonas de FC quando o usuário informa sua FC máxima;
- resposta cardiovascular aproximada por exercício;
- comparação com a sessão anterior equivalente;
- alinhamento técnico dos horários TreinoApp x relógio;
- compartilhamento visual da sessão com dados fisiológicos.

A tela Progresso também possui um painel de performance de 30 dias com tendências de FC, calorias, duração, volume e densidade do treino. O relatório HTML para personal inclui uma seção Health Connect quando houver sessões vinculadas.

## Dados e atualizações

Atualizações da mesma variante preservam os dados quando mantêm o mesmo applicationId, chave de assinatura e versionCode crescente. O Room usa migrações explícitas e não utiliza `fallbackToDestructiveMigration()`.

O backup JSON inclui os vínculos Health e as amostras usadas nos gráficos.

Leia `TESTE_v12.1.0_BETA.md` antes de promover esta versão para Stable.
