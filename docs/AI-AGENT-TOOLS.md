# AI Agent Tools para Lighter DEX

## Visao Geral

A versao 0.4.0 introduz suporte completo para AI Agents no n8n, permitindo que agentes de IA executem operacoes de trading na Lighter DEX de forma autonoma.

## Modificacoes Realizadas

### 1. Lighter.node.ts - usableAsTool

**Arquivo:** `nodes/Lighter/Lighter.node.ts`

**Antes:**
```typescript
inputs: ['main'],
outputs: ['main'],
credentials: [
```

**Depois:**
```typescript
inputs: ['main'],
outputs: ['main'],
// @ts-ignore - Enable this node to be used as an AI Agent tool
usableAsTool: true,
credentials: [
```

**Vantagem:** Permite que o node Lighter existente seja usado diretamente como tool pelo AI Agent, aproveitando todas as 34+ operacoes ja implementadas.

**Requisito:** Definir a variavel de ambiente `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true` no n8n.

---

### 2. Novos Tool Nodes Dedicados

Foram criados 4 novos Tool nodes otimizados especificamente para AI Agents:

#### 2.1 LighterAccountTool

**Arquivo:** `nodes/Lighter/LighterAccountTool.node.ts`

**Funcionalidades:**
- `getAccount` - Consultar dados da conta (balance, equity)
- `getPositions` - Listar posicoes abertas com PnL
- `getActiveOrders` - Listar ordens ativas
- `getAccountLimits` - Consultar limites de trading
- `getPnl` - Historico de PnL

**Descricao para AI:**
```
Query Lighter DEX account information. Use this tool to:
- Get account balance and equity
- Get open positions with PnL
- Get active orders
- Get account trading limits
- Get PnL history
```

#### 2.2 LighterMarketTool

**Arquivo:** `nodes/Lighter/LighterMarketTool.node.ts`

**Funcionalidades:**
- `getMarkets` - Listar todos os mercados com precos
- `getOrderbook` - Consultar orderbook (bids/asks)
- `getFundingRates` - Taxas de funding atuais
- `getRecentTrades` - Trades recentes
- `getExchangeStats` - Estatisticas da exchange

**Descricao para AI:**
```
Query Lighter DEX market data. Use this tool to:
- Get current prices and 24h stats for all markets
- Get orderbook depth for specific markets
- Get funding rates (important for perpetuals)
- Get recent trades
- Get exchange statistics
```

#### 2.3 LighterTradingTool

**Arquivo:** `nodes/Lighter/LighterTradingTool.node.ts`

**Funcionalidades:**
- `createLimitOrder` - Criar ordem limite
- `createMarketOrder` - Criar ordem a mercado
- `cancelOrder` - Cancelar ordem especifica
- `cancelAllOrders` - Cancelar todas as ordens
- `closePosition` - Fechar posicao

**Descricao para AI:**
```
Execute trades on Lighter DEX. Use this tool to:
- Create LIMIT orders (specify price)
- Create MARKET orders (instant execution with slippage)
- Cancel specific orders
- Cancel all orders
- Close positions

IMPORTANT: This tool executes REAL trades. Always confirm with the user before executing.
```

#### 2.4 LighterPositionTool

**Arquivo:** `nodes/Lighter/LighterPositionTool.node.ts`

**Funcionalidades:**
- `createTP` - Criar ordem Take Profit
- `createSL` - Criar ordem Stop Loss
- `updateLeverage` - Atualizar alavancagem
- `closePosition` - Fechar posicao

**Descricao para AI:**
```
Manage positions on Lighter DEX. Use this tool to:
- Create TAKE PROFIT (TP) orders to automatically close at profit target
- Create STOP LOSS (SL) orders to limit losses
- Update leverage for a market
- Close positions with market order
```

---

## Arquitetura Tecnica

### Interface ISupplyDataFunctions

Os Tool nodes usam a interface `ISupplyDataFunctions` do n8n-workflow para fornecer tools ao AI Agent:

```typescript
async supplyData(this: ISupplyDataFunctions, _itemIndex: number): Promise<SupplyData> {
    const tool = new DynamicStructuredTool({
        name: 'tool_name',
        description: 'Tool description for AI',
        schema: z.object({
            // Zod schema for validation
        }),
        func: async (params) => {
            // Tool implementation
        },
    });

    return { response: tool };
}
```

### Dependencias Adicionadas

```json
{
    "@langchain/core": "^0.3.0",
    "zod": "^3.23.0"
}
```

- **@langchain/core**: Framework LangChain para integracao com LLMs
- **zod**: Schema validation para parametros dos tools

---

## Configuracao

### 1. Variavel de Ambiente

Para usar o node Lighter existente como tool:

```bash
N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```

### 2. Credenciais

Todos os tools usam a credencial `lighterApi` existente:

- **environment**: mainnet ou testnet
- **accountIndex**: Indice da conta Lighter
- **authToken**: Token de autenticacao (opcional)
- **tradingBackendUrl**: URL do backend de trading (obrigatorio para trading/position tools)
- **backendApiSecret**: Secret do backend (opcional)

---

## Uso com AI Agent

### Exemplo de Workflow

```
[Chat Trigger] -> [AI Agent] -> [Tools]
                      |
                      +-- [Lighter Account Tool]
                      +-- [Lighter Market Tool]
                      +-- [Lighter Trading Tool]
                      +-- [Lighter Position Tool]
```

### Exemplo de System Prompt para AI Agent

```
Voce e um agente de trading especializado em perpetuals na Lighter DEX.

Suas capacidades:
1. Consultar informacoes da conta (balance, posicoes, ordens)
2. Analisar mercados (precos, orderbooks, funding rates)
3. Executar trades (ordens limite e mercado)
4. Gerenciar posicoes (TP, SL, alavancagem)

REGRAS DE SEGURANCA:
- SEMPRE confirme com o usuario antes de executar trades
- SEMPRE defina TP e SL ao abrir posicoes
- NUNCA exceda o risco maximo definido pelo usuario
- Forneca informacoes claras sobre precos e tamanhos

Mercados disponiveis:
- BTC-PERP (index 0)
- ETH-PERP (index 1)
- SOL-PERP (index 2)
```

---

## Comparacao: usableAsTool vs Tool Nodes Dedicados

| Aspecto | usableAsTool | Tool Nodes Dedicados |
|---------|--------------|---------------------|
| Implementacao | Simples (1 linha) | Complexa (arquivo completo) |
| Operacoes | Todas (34+) | Subset otimizado |
| Descricoes | Genericas | Otimizadas para AI |
| Schema | Nao validado | Validacao Zod |
| Formatacao | JSON bruto | Formatado para AI |
| Controle | Limitado | Total |

**Recomendacao:** Use ambos! O `usableAsTool` para acesso rapido a todas operacoes, e os Tool nodes dedicados para casos de uso especificos onde controle e clareza sao importantes.

---

## Versao

- **Versao anterior:** 0.3.2
- **Versao atual:** 0.4.0
- **Mudancas principais:**
  - Adicionado `usableAsTool: true` no Lighter.node.ts
  - Criados 4 novos Tool nodes para AI Agent
  - Adicionadas dependencias LangChain e Zod
  - Atualizadas keywords e descricao do pacote
