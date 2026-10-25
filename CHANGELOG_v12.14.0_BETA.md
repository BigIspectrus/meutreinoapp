# v12.14.0 Beta — PC pela rede local e itens 26, 27, 42, 44 e 50

## Sincronização local

- Programa portátil Windows x64: extrair o ZIP e abrir TreinoApp-PC.exe; inclui runtime Node, abre o navegador e mantém o servidor em segundo plano sem terminal. Encerramento pelo painel do app.
- Interface somente em 127.0.0.1:43127. API para Android na porta 43128, com TLS e conferência do certificado específico do PC pelo APK. Não libera HTTP nem certificados arbitrários no Android.
- Pareamento por QR Code de uso único, válido por dez minutos, ou código completo colado manualmente. Um celular autorizado por PC; novo pareamento substitui o anterior. Revogação disponível no computador.
- Sem Supabase, conta, internet para a troca local ou publicação de dados. PC e Android precisam estar ligados e alcançáveis na mesma rede. Firewall/rede de convidados podem impedir a conexão.
- Primeiro carregamento do PC aguarda o envio do celular. A instalação vazia do navegador não publica seus padrões como dados do usuário. Ao inicializar um navegador que já contém registros, pede autorização antes de substituir sua cópia local, preservando uma cópia anterior.
- Conciliação por registro/ID ou data/chave, usando a última base compartilhada. Alterações distintas são unidas; conflitos do mesmo registro e exclusões concorrentes exigem escolha. Alterações locais durante a requisição adiam a aplicação. Revisão é refeita se a versão local ou remota mudar durante a escolha.
- PC lembra identificadores excluídos para que cópias antigas sem base não os recriem silenciosamente. Sem reescrever IDs de alimentos nem nutrientes de registros históricos.
- Dados: séries concluídas, fichas, exercícios personalizados, metas de treino, peso, alimentos, refeições consumidas, receitas, refeições prontas, planejamento alimentar, perfil, metas manuais e configurações de esforço/descanso. Cache e vínculos do Health Connect são produzidos pelo Android e consultados no PC.
- Rascunhos alimentares/treinos em andamento, permissões, notificações, segredos e preferências visuais do dispositivo não são enviados. Aplicação bloqueada durante treino, formulários e edição inline de refeições.
- Tentativas ao abrir/retomar e a cada 45 segundos com a interface visível. Sem PC/rede, os dados locais permanecem para a próxima conexão. Mudanças de IP exigem novo pareamento pelo QR com o endereço atual.
- Escrita do servidor por arquivo temporário e substituição, com vinte cópias anteriores em %LOCALAPPDATA%\TreinoAppPC. Cliente guarda cinco cópias em IndexedDB, exportáveis pelo painel, e journal para retomar uma aplicação interrompida.
- Limpeza geral no Android desconecta o PC antes de apagar os dados locais. Credenciais LAN excluídas do backup/transferência automática Android. Limpeza geral indisponível na interface compartilhada do PC; não apaga o celular inadvertidamente.

## 26 — Busca de ações

- Botão de busca no cabeçalho e Ctrl+K no PC. Pesquisa ações por palavras, rotinas e exercícios. Atalhos para peso, refeição por texto, refeições por tipo, diário, treino, histórico, projeção, catálogo, metas e sincronização.
- Busca não executa gravações nem inicia treino automaticamente. Janelas abertas são preservadas; a busca pede fechar a edição antes de abrir outra ação.

## 27 — Atalhos Android

- Ao segurar o ícone no launcher: Meus treinos, Refeição por texto e Registrar peso. Rotas aguardam o carregamento da interface; abrir treino não inicia sessão por acidente.

## 42 — Mudança de ritmo do peso

- Compara períodos separados: trinta dias até a última pesagem e os trinta anteriores. Mostra ritmos em kg/semana, quantidade de registros, diferença e mudança aparente de direção/aceleração/desaceleração.
- Reutiliza medianas semanais da projeção. Exige base mínima em ambos os períodos e considera dispersão para evitar destacar pequenas diferenças como mudança clara. Critério descritivo explicado na tela; sem diagnóstico ou alteração automática de metas.

## 44 — Desempenho com RIR comparável

- Destaca na evolução da última sessão de cada exercício mais carga ou repetições, sem redução no outro campo, versus o registro anterior compatível. Mesma unidade, tipo e posição da série; RIR igual por padrão, com opção de tolerar diferença de uma unidade.
- RIR ausente não vira zero, assistência não entra e não há conversão entre placas/kg. Mostra os dois registros e a data da referência. É evolução contextual, sem declarar recorde absoluto ou equivalência entre aparelhos.

## 50 — Históricos grandes

- Histórico agrupado carregado em lotes de doze sessões, sem o corte antigo de trinta. Carregar mais acrescenta cartões sem reconstruir os anteriores.
- Séries dos cartões são montadas apenas ao expandir. Agrupamento/ordenação e análises de esforço são reaproveitados enquanto os dados/filtros não mudarem. Health links lidos uma vez por lote.
- Comparação semântica evita sincronizar novamente só por diferenças de ordem das propriedades JSON. Espelho nativo recebe atualização mesmo quando o histórico fica vazio.

## Entrega e limites da verificação

Preparação/compilação de assets, compilação do launcher Windows e empacotamento do servidor/dependências; compilação Android assinada e conferência de artefatos. Não foram executados testes funcionais, automatizados, de interface, pareamento ou rede, conforme preferência do usuário. A compilação não confirma o comportamento real no PC/Android: o usuário fará a validação em seus aparelhos. O launcher pessoal Windows não tem certificado comercial; o Windows pode solicitar autorização para executar e permitir rede privada.
