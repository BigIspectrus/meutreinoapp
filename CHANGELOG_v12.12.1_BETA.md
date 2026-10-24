# TreinoApp v12.12.1 Beta — conciliação sem bloqueio por montagem vazia

Corrige o aviso de montagem pendente ao unir alimentos após apenas abrir e fechar a tela de refeição. O controlador de montagem permanece ativo na memória mesmo vazio; isso não significa que existam dados por salvar.

A conciliação agora verifica o conteúdo em memória e no rascunho persistido, separadamente. Bloqueia quando há alimentos ainda não registrados, texto não vazio ou salvamento em andamento. Rascunhos já registrados no diário/planejamento não bloqueiam, seguindo a regra usada pelo aviso de refeição pendente. Não limpa rascunhos, alimentos, texto ou registros para contornar a verificação.

A correção se aplica à união individual, à união de equivalências em lote, ao desfazer e à conciliação durante a importação JSON. Biblioteca de 173 alimentos e demais funcionalidades da v12.12.0 preservadas.

Android `12.12.1-beta`, código `121201`, mesmo pacote e certificado Beta. Preparação/compilação e inspeção do APK assinado, sem testes funcionais ou automatizados, conforme preferência do usuário.
