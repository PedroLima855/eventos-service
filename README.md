# 🚀 Eventos Service

Microserviço orquestrador de eventos para plataforma B2B. Recebe eventos de parceiros comerciais, valida, enriquece, processa e distribui para serviços downstream — projetado para alta concorrência e resiliência.

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Tecnologias](#-tecnologias)
- [Arquitetura](#-arquitetura)
- [Instalação](#-instalação)
- [Executando](#-executando)
- [API Endpoints](#-api-endpoints)
- [Fluxo de Processamento](#-fluxo-de-processamento)
- [Retry e Dead-Letter](#-retry-e-dead-letter)
- [Testes](#-testes)
- [Docker](#-docker)
- [Documentação Swagger](#-documentação-swagger)

---

## 🎯 Visão Geral

O **Eventos Service** atua como orquestrador central em uma arquitetura de microserviços, sendo responsável por:

- Receber eventos de parceiros comerciais (VENDA, DEVOLUÇÃO, ATUALIZAÇÃO_ESTOQUE, CANCELAMENTO)
- Validar formato, campos obrigatórios e regras de negócio
- Enriquecer dados com informações adicionais
- Distribuir para serviços downstream
- Persistir histórico completo de processamento
- Garantir resiliência com retry automático e dead-letter queue

---

## 🛠 Tecnologias

| Tecnologia | Uso |
|---|---|
| **Node.js** | Runtime |
| **TypeScript** | Linguagem |
| **NestJS** | Framework |
| **TypeORM** | ORM |
| **PostgreSQL** | Banco de dados |
| **Swagger/OpenAPI** | Documentação da API |
| **Docker** | Containerização |
| **Jest** | Testes automatizados |
| **Helmet** | Segurança HTTP |
| **Throttler** | Rate limiting |

---

## 🏗 Arquitetura

```
src/
├── events/
│   ├── dto/
│   │   └── create-event.dto.ts        # Validação de entrada
│   ├── entities/
│   │   ├── event.entity.ts            # Entidade principal
│   │   └── processing-history.entity.ts # Histórico de processamento
│   ├── events.controller.ts           # Endpoints REST
│   ├── events.service.ts              # Lógica de negócio
│   ├── event-processor.service.ts     # Processamento + Retry + Dead-letter
│   └── events.module.ts               # Módulo NestJS
├── app.module.ts                      # Módulo raiz
└── main.ts                            # Bootstrap
```

---

## 📦 Instalação

**Pré-requisitos:**
- Node.js 18+
- PostgreSQL rodando localmente
- Database `evento_dados` criado

```bash
# Clonar e instalar dependências
git clone <repo-url>
cd eventos-service
npm install
```

**Configuração do banco:**

| Variável | Padrão |
|---|---|
| `DB_HOST` | localhost |
| `DB_PORT` | 5432 |
| `DB_USER` | postgres |
| `DB_PASS` | 123456 |
| `DB_NAME` | evento_dados |

> As tabelas são criadas automaticamente via `synchronize: true`.

---

## ▶️ Executando

```bash
# Desenvolvimento (hot-reload)
npm run start:dev

# Produção
npm run build
npm run start:prod
```

O serviço estará disponível em `http://localhost:3000`.

---

## 📡 API Endpoints

### Criar Evento
```http
POST /api/events
```
```json
{
  "type": "VENDA",
  "payload": { "productId": "PRD-001", "quantity": 3, "price": 149.90 },
  "partnerId": "partner-001",
  "idempotencyKey": "venda-001"
}
```

### Consultar Evento
```http
GET /api/events/:id
```

### Estatísticas
```http
GET /api/events/stats
```
Retorna contagem por status e por tipo de evento.

### Dead-Letter Queue
```http
GET /api/events/dead-letter
```

### Reprocessar Evento
```http
POST /api/events/:id/reprocess
```

---

## ⚙️ Fluxo de Processamento

```
┌─────────────┐     ┌────────────┐     ┌───────────────┐     ┌──────────────┐
│  Recebimento │────▶│  Validação  │────▶│ Enriquecimento │────▶│ Distribuição  │
│   (API)      │     │             │     │                │     │  (Downstream) │
└─────────────┘     └────────────┘     └───────────────┘     └──────────────┘
                          │                                            │
                          ▼                                            ▼
                    ┌──────────┐                               ┌────────────┐
                    │  FALHA   │                               │  CONCLUÍDO  │
                    └──────────┘                               └────────────┘
```

Cada etapa é registrada na tabela `processing_history` para auditoria completa.

---

## 🔄 Retry e Dead-Letter

| Configuração | Valor |
|---|---|
| Máximo de tentativas | 5 |
| Intervalo de retry automático | 30 segundos |
| Após esgotar retries | Move para Dead-Letter |

**Fluxo:**
1. Evento falha → status `FALHA`, incrementa `retryCount`
2. Cron job a cada 30s tenta reprocessar eventos com status `FALHA`
3. Após 5 falhas → status `DEAD_LETTER`
4. Reprocessamento manual via `POST /api/events/:id/reprocess`

---

## 🧪 Testes

```bash
# Testes unitários
npm test

# Com cobertura
npm test -- --coverage
```

**Cobertura de testes:**
- Criação de eventos com validação
- Idempotência (rejeição de duplicatas)
- Processamento com sucesso
- Falha e incremento de retry
- Movimentação para dead-letter
- Reprocessamento manual
- Estatísticas

---

## 🐳 Docker

```bash
# Subir tudo (app + PostgreSQL)
docker-compose up --build

# Apenas o banco
docker-compose up db
```

O `docker-compose.yml` inclui:
- **PostgreSQL 16** na porta 5432
- **App** na porta 3000

---

## 📖 Documentação Swagger

Com o serviço rodando, acesse:

```
http://localhost:3000/api/docs
```

Interface interativa para testar todos os endpoints com exemplos.

---

## 🛡 Recursos de Produção

| Recurso | Implementação |
|---|---|
| **Rate Limiting** | 100 requisições/minuto por IP |
| **Idempotência** | Chave única por evento |
| **Segurança HTTP** | Helmet (headers de segurança) |
| **Compressão** | gzip via compression |
| **Logs estruturados** | Logger nativo do NestJS |
| **Validação** | class-validator + ValidationPipe |
| **Observabilidade** | Histórico de processamento por etapa |

---

## 📝 Tipos de Evento

| Tipo | Descrição |
|---|---|
| `VENDA` | Registro de venda realizada |
| `DEVOLUCAO` | Devolução de produto |
| `ATUALIZACAO_ESTOQUE` | Atualização de quantidade em estoque |
| `CANCELAMENTO` | Cancelamento de operação |

---

## 📊 Status de Processamento

| Status | Descrição |
|---|---|
| `PENDENTE` | Aguardando processamento |
| `PROCESSANDO` | Em processamento |
| `CONCLUIDO` | Processado com sucesso |
| `FALHA` | Falha (aguardando retry) |
| `DEAD_LETTER` | Esgotou tentativas de retry |

---

## 📄 Licença

Este projeto é de uso livre para fins de estudo e desenvolvimento.
