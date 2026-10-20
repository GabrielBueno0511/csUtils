# Imagens dos spots

Imagens obtidas em 20/10/2026 nos guias da Profilerr. Os arquivos são servidos localmente, sem hotlink. A origem de cada arquivo está em `sources.json`.

Os IDs dos spots foram preservados na importação inicial. As listas da Inferno, Dust 2 e Ancient foram atualizadas com as calls informadas pelo usuário; nenhuma utilitária foi apagada do banco. O nome visível de `mirage/janela` passou a ser Janelão.

`imageNeedsConfirmation` no catálogo TypeScript e `imageIsOverview` no manifesto identificam referências de região, cuja correspondência com a call local ainda deve ser confirmada. Essas imagens ficam ocultas na interface, que exibe “Imagem a adicionar” até o preenchimento manual. Insane não tem localização descrita e usa a visão geral já existente de Anubis.

Os guias foram publicados em datas diferentes e podem mostrar versões anteriores da geometria. O crédito e os links de origem registram a procedência; não representam uma licença de uso concedida pelo site.

## Calls a confirmar

- **cache**: meio, rua, empilhadeira, escanteio, garagem, ceu-da-b, toyota, ct-da-b

- **dust2**: meio-ct, caminho-da-morte, casinha, entrada-do-b, coqueiro, coqueiro-invertido, passagem-da-b
- **mirage**: l, tapete, cabecinha, passagem, edward
- **inferno**: caverna, fallen, xuxa, nip
- **nuke**: janela, fundo, xbox
- **ancient**: varanda, quadrado-para-o-meio, fundo-a, escuro-pra-varanda, escuro-dentro, sol, ct-da-b, piru-da-b, default-b, atras-do-bomb-da-a, quadro-para-o-a, caixa-do-yuri
- **anubis**: buraco, rato, quebrao-a, insane, rato-pro-b

Cache tem oito posições cadastradas, com imagens para preenchimento manual.

## Atualização

Ao confirmar uma call, substitua a imagem se necessário, atualize sua referência em `sources.json` e ajuste `imageLabel` e `imageNeedsConfirmation` em `src/app/shared/data/map-spots.data.ts`.
