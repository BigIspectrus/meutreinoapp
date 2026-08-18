# TreinoApp v12 — Web + Android

TreinoApp continua funcionando como PWA no GitHub Pages e passa a ter uma versão Android nativa baseada em Capacitor.

## O que já está preparado

- Stable: `com.treinoapp.app`
- Beta: `com.treinoapp.beta`
- Capacitor 8 + Android API 36
- notificação persistente durante o treino
- cronômetro nativo de descanso com ações `-15s`, `Pular` e `+30s`
- serviço Android de treino ativo
- widget de tela inicial
- Health Connect: leitura e escrita de sessão, FC, calorias e peso
- associação automática de sessão quando a correspondência temporal tiver confiança >= 85%
- casos duvidosos permanecem pendentes para confirmação
- banco Room nativo como espelho resiliente das sessões e séries
- tipos de série: Aquecimento, Work set, Top set, Back-off, Drop set, Cluster set, FST-7, Rest-pause, Myo-reps e AMRAP
- APK Beta e Stable separados
- APK/AAB assinados por GitHub Actions
- GitHub Pages continua sendo publicado pela branch `main`

Leia `PASSO_A_PASSO_GITHUB.md` antes do primeiro build.
