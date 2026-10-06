# Teste Android — v12.8.2 Beta — tópico 2 de 14

Faça backup e instale sobre a Beta atual sem desinstalar. Mesmo pacote/assinatura; sem mudança de schema Room, permissões ou metas.

## Horários por dado

- Cardio & passos → Atualizar Health. Conferir horários junto a passos, média, cardios e kcal; kcal ativas/totais têm avisos próprios.
- Abrir “Atualização de cada dado”: cinco grupos, situação da consulta, última consulta completa e última verificação.
- Interpretar horário como leitura pelo TreinoApp; ele não confirma que o relógio sincronizou naquele instante.
- Na lista, cada cardio e suas kcal têm informações próprias. Conferir avisos também no início e gráficos de atividade/evolução.
- Trocar modalidade/período, voltar às telas e reabrir sem atualizar: os horários não podem mudar apenas por navegação.

## Valores anteriores, ausência e falhas

- Ao instalar sobre versão anterior, dados sem horário confiável devem mostrar que são salvos/sem horário, nunca receber a hora da instalação.
- Atualizar com passos disponíveis e problema/permissão negada de calorias: passos recebem horário novo, valores de kcal salvos preservam o horário anterior e indicam “Salvo”.
- Falha/disponibilidade do Health: não apagar os números anteriores nem trocar seu horário por “agora”. A tentativa/verificação pode ter horário novo.
- Negar passos ou calorias: não fazer novas leituras dessa categoria. Importações anteriores ficam locais e identificadas como salvas; revisão de permissões continua disponível.
- Quando não há dados anteriores, falha/permissão negada não deve fabricar zero.
- Zero real retornado pelo Health é dado válido com horário de consulta.
- Resposta bem-sucedida sem registros deve aparecer como ausência; não conservar número anterior como se tivesse sido confirmado.
- Calorias com falha em uma sessão: apenas essa sessão deve reutilizar kcal anteriores; as demais mantêm seu horário/status verdadeiro.
- Intervalo da sessão alterado não deve receber kcal antigas de outro intervalo.
- Janela limitada a 28 dias: dados salvos de fora da janela continuam identificados como anteriores, sem atualização artificial do horário.
- Consulta paginada parcial não confirma que todos os cardios foram lidos; nenhum zero inventado para parte desconhecida.
- Estado de falha e horários antigos precisam persistir após fechar/reabrir o app e em backup/restauração de teste.

## Regressões

- RIR/RPE ausente ≠ zero (v12.8.1), refeições, metas, treinos, descanso, notificações, widget, contagem e filtros permanecem como antes.
- Tópico 3 não foi implementado; lembrar filtros continua aguardando autorização.

Testes automáticos usam respostas fictícias, incluindo falhas controladas. Permissões reais, Samsung Health/Galaxy Watch, instalação e WebView precisam de teste físico.
