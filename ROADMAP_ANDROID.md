# Roadmap Android

## Entregue na v12.2.0 Beta

- Stable/Beta separadas;
- foreground service, timer e notificação nativos;
- widget com treino ativo e planejamento do dia;
- Health Connect para exercício, FC, calorias, peso, sono, FC de repouso, HRV e composição corporal;
- associação automática Galaxy Watch/Samsung Health;
- Room com migrações 1->2 e 2->3;
- RIR/RPE por série;
- FC e recuperação cardíaca aproximadas por série;
- timeline série x FC;
- gráfico com marcadores das séries;
- PRs avançados;
- progressão sugerida;
- histórico avançado por exercício;
- painel Recovery sem score opaco;
- calendário e planejamento semanal;
- auditoria de fluxos APK x navegador;
- exportação, relatório e compartilhamento nativos.

## Entregue na v12.3.0 Beta

- modo de treino focado em uma série por vez;
- séries concluídas e futuras compactas;
- preferência de RIR/RPE;
- Início simplificada;
- navegação inferior reduzida a quatro destinos;
- Histórico e Evolução reunidos;
- Mais organizado por categorias;
- cache Web/PWA alinhado automaticamente à versão do APK.

## Após validar a v12.3.0

- testes instrumentados de migração Room no CI;
- testes automatizados Android para Health match e payloads do bridge;
- opção de configurar a janela de recuperação pós-série;
- análise de recuperação entre blocos/exercícios;
- atalhos Android por treino planejado;
- widget redimensionável com variantes pequena/média/grande;
- anexos locais de foto/vídeo por exercício;
- substituições de exercícios por sessão;
- programação de blocos/mesociclos;
- eventual app Wear OS complementar.

## Regra de segurança dos dados

Nunca usar `fallbackToDestructiveMigration()` no banco principal. Atualizações Stable devem manter applicationId, chave de assinatura e versionCode crescente.
