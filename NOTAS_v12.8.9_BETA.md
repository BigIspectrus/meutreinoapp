# v12.8.9 — adaptação ao Android e detalhes das refeições

- Usa os valores de área segura fornecidos pelo Capacitor SystemBars, com fallback para `env()` no navegador. Cabeçalho, menu inferior, controles fixos e modais respeitam status bar, gestos e recortes laterais.
- A altura real do cabeçalho do treino define a posição da navegação de exercícios; mudanças de texto, orientação e fontes são acompanhadas. Cabeçalho opaco e margem de rolagem evitam sobreposição visual com descanso/séries.
- Ícones e fundo das barras Android acompanham o tema claro/escuro do aplicativo.
- Cada refeição mostra kcal, proteína, carboidratos e gordura no cabeçalho, também quando fechada.
- Novos registros preservam quantidade, unidade/medida e gramas por medida. A composição original e os macros calculados continuam gravados; trocar medidas cadastradas depois não reinterpreta essas quantidades históricas.
- Registros anteriores guardaram apenas gramas. Quando há uma referência única disponível, a interface mostra equivalência marcada com ≈; não afirma conhecer a medida escolhida originalmente. Sem referência confiável, mantém gramas.
- Edição permite usar gramas ou a medida original/disponível, com conversão e prévia. Cópias de refeições, refeições prontas e backups preservam o novo campo.
- Botões do rodapé da refeição em linhas compactas, evitando o botão Adicionar alimento esticado ao lado das outras ações.

Pacote `com.treinoapp.beta`, versão `12.8.9-beta`, código `120809`, assinatura existente. Sem migração de Room, mudança de metas ou nova permissão. A informação adicional de porção fica nos registros locais/exportados; o espelho nativo mantém gramas/macros.

Somente compilação e geração do APK, sem testes automatizados ou QA manual, conforme preferência do usuário. O comportamento no Galaxy será validado por ele.

Referências: [Capacitor SystemBars](https://capacitorjs.com/docs/apis/system-bars), [insets em WebView](https://developer.android.com/develop/ui/views/layout/webapps/understand-window-insets).
