# Baribudos Studio Website - Studio Memory Link

Este website e controlado pelo Baribudos Studio atraves dos endpoints administrativos ja existentes.

## Papel do website

O website e a camada publica e comercial do ecossistema Baribudos Studio.

Ele recebe e apresenta:

- Publicacoes.
- Produtos.
- Bundles.
- Visual sets.
- Catalogo.
- Estado publico de conteudos.

## Papel do Studio

O Baribudos Studio e o cerebro operacional.

O Studio controla:

- Criacao de conteudo.
- Preparacao editorial.
- Pacotes de publicacao.
- Envio para o website.
- Validacao de estado.
- Revalidacao e reconciliacao.
- Memoria persistente do fluxo Studio -> Website.

## Memoria persistente

A memoria persistente vive no repo do Studio e no repo privado AndreOS Memory:

```text
AndreVazao/baribudos-studio
AndreVazao/andreos-memory
```

O website nao deve guardar memoria operacional sensivel. Deve expor estado e aceitar publicacoes validadas pelo Studio.

## Regra de seguranca

Nunca guardar no repo publico:

- passwords
- tokens
- chaves API
- cookies
- chaves privadas
- credenciais

## Fonte de verdade

- Conteudo operacional e decisoes: Baribudos Studio + AndreOS Memory.
- Estado publico e catalogo: Baribudos Studio Website.
- Segredos: variaveis de ambiente / gestor seguro de credenciais.
