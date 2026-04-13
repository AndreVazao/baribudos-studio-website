# V6 Website Role

## Objetivo
Fixar o papel do Website enquanto o backend real do Distribution Hub é implementado no Studio.

## O Website continua a ser
- o primeiro canal próprio
- o primeiro canal de monetização
- o primeiro local onde o funil é provado

## O Website não deve assumir
- persistência do Distribution Hub
- lógica de tentativas por canal
- histórico por canal
- payload snapshot por canal

## Regra
Toda a lógica de operação multicanal continua a nascer no Studio. O Website apenas reflete a publicação do canal próprio.
