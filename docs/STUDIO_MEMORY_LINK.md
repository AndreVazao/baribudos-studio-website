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

O Baribudos Studio e o cerebro operacional privado que corre no PC de casa.

O Studio controla:

- Criacao de conteudo.
- Preparacao editorial.
- Pacotes de publicacao.
- Envio para o website.
- Validacao de estado.
- Revalidacao e reconciliacao.
- Memoria operacional local quando instalado no PC.

## Separacao de memorias

A separacao correta e esta:

```text
Website publico
└── catalogo, produtos, publicacoes, bundles e estado publico/comercial

Studio no PC
└── memoria operacional viva, progresso de trabalho e Obsidian local

AndreVazao/andreos-memory
└── memoria tecnica de programacao/contexto das repos, auditorias e decisoes de desenvolvimento
```

## GitHub publico durante a fase de build

Durante a fase inicial, algumas repos podem permanecer publicas para permitir builds gratuitos e reduzir limites de cota em builders privados.

Isto nao significa que o conteudo operacional privado deva ir para GitHub publico.

Quando o pipeline/builder estiver concluido e os programas estiverem prontos, a estrategia final e passar o que for privado para repos privadas.

## Regra de seguranca

Nunca guardar no repo publico:

- passwords
- tokens
- chaves API
- cookies
- chaves privadas
- credenciais
- dados sensiveis de clientes
- memoria operacional viva do PC
- ficheiros runtime privados do Studio

## Fonte de verdade

- Conteudo operacional vivo: Studio instalado no PC + Obsidian local.
- Estado publico e catalogo: Baribudos Studio Website.
- Contexto de programacao das repos: AndreVazao/andreos-memory.
- Segredos: variaveis de ambiente / gestor seguro de credenciais.
