# n8n-nodes-lighter - Referencia Completa

Este documento descreve completamente todos os nos, endpoints, campos de entrada e formatos de saida do community node para Lighter DEX.

---

## Estrutura do Projeto

```
n8n-nodes-lighter/
├── credentials/
│   └── LighterApi.credentials.ts    # Credenciais de autenticacao
├── nodes/
│   └── Lighter/
│       ├── Lighter.node.ts          # No principal (REST API)
│       └── LighterTrigger.node.ts   # No trigger (WebSocket)
├── examples/
│   └── lighter-backend/
│       ├── app.py                   # Trading backend em Python
│       ├── requirements.txt
│       ├── Dockerfile
│       └── README.md
├── package.json
└── README.md
```

---

## 1. CREDENCIAIS (LighterApi.credentials.ts)

### Campos de Configuracao

| Campo | Tipo | Obrigatorio | Default | Descricao |
|-------|------|-------------|---------|-----------|
| `environment` | options | Sim | mainnet | `mainnet` ou `testnet` |
| `accountIndex` | number | Sim | 0 | Indice da conta Lighter |
| `apiKeyIndex` | number | Sim | 3 | Indice da API key (3-254) |
| `apiPrivateKey` | string (password) | Nao | "" | Chave privada da API |
| `authToken` | string (password) | Nao | "" | Token de autenticacao pre-gerado |
| `tradingBackendUrl` | string | Nao | "" | URL do backend de trading |
| `backendApiSecret` | string (password) | Nao | "" | Secret para autenticar com backend |
| `l1Address` | string | Nao | "" | Endereco Ethereum L1 |

### URLs Base

- **Mainnet**: `https://mainnet.zklighter.elliot.ai`
- **Testnet**: `https://testnet.zklighter.elliot.ai`

---

## 2. LIGHTER NODE (Lighter.node.ts) - REST API

### 2.1 Resource: ACCOUNT

#### Operation: `getAccount`
**Endpoint**: `GET /api/v1/account`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `queryBy` | options | "index" | `index` ou `l1_address` |
| `accountIndex` | number | 0 | Indice da conta (se queryBy=index) |
| `l1Address` | string | "" | Endereco L1 (se queryBy=l1_address) |

**Query String Enviada**:
```
?by={queryBy}&value={accountIndex ou l1Address}
```

**Formato de Resposta Esperado**:
```json
{
  "accounts": [{
    "index": 123,
    "l1_address": "0x...",
    "collateral": "1000.00",
    "available_balance": "950.00",
    "positions": [{
      "market_index": 0,
      "market_id": 0,
      "position": "0.5",
      "size": "0.5",
      "sign": 1,
      "side": "long",
      "entry_price": "3500.00",
      "liquidation_price": "3000.00",
      "unrealized_pnl": "50.00"
    }],
    "orders": []
  }]
}
```

---

#### Operation: `getAccountsByL1Address`
**Endpoint**: `GET /api/v1/accountsByL1Address`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `l1Address` | string | "" | Endereco Ethereum L1 |

**Query String Enviada**:
```
?l1_address={l1Address}
```

**Formato de Resposta Esperado**:
```json
{
  "accounts": [
    { "index": 123, "l1_address": "0x..." },
    { "index": 456, "l1_address": "0x..." }
  ]
}
```

---

#### Operation: `getAccountLimits`
**Endpoint**: `GET /api/v1/accountLimits`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `accountIndex` | number | 0 | Indice da conta |

**Query String Enviada**:
```
?account_index={accountIndex}
```

**Formato de Resposta Esperado**:
```json
{
  "max_leverage": 100,
  "max_position_size": "1000000",
  "daily_withdrawal_limit": "100000"
}
```

---

#### Operation: `getAccountMetadata`
**Endpoint**: `GET /api/v1/accountMetadata`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `accountIndex` | number | 0 | Indice da conta |

**Query String Enviada**:
```
?account_index={accountIndex}
```

---

#### Operation: `getPnl`
**Endpoint**: `GET /api/v1/pnl`
**Requer**: Auth Token para contas principais

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `accountIndex` | number | 0 | Indice da conta |
| `pnlResolution` | options | "1h" | `1h` ou `1d` |
| `pnlCountBack` | number | 24 | Numero de periodos |
| `pnlStartTime` | dateTime | "" | Timestamp inicial |
| `pnlEndTime` | dateTime | "" | Timestamp final |

**Query String Enviada**:
```
?by=index&value={accountIndex}&resolution={pnlResolution}&count_back={pnlCountBack}&start_timestamp={ms}&end_timestamp={ms}
```

**Formato de Resposta Esperado**:
```json
{
  "pnl_data": [
    { "timestamp": 1704067200000, "pnl": "150.50" },
    { "timestamp": 1704070800000, "pnl": "175.25" }
  ]
}
```

---

#### Operation: `getLiquidations`
**Endpoint**: `GET /api/v1/liquidations`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `accountIndex` | number | 0 | Indice da conta |

**Query String Enviada**:
```
?account_index={accountIndex}
```

**Formato de Resposta Esperado**:
```json
{
  "liquidations": [
    {
      "timestamp": 1704067200000,
      "market_index": 0,
      "size": "0.5",
      "price": "3000.00",
      "loss": "-500.00"
    }
  ]
}
```

---

#### Operation: `getPositionFunding`
**Endpoint**: `GET /api/v1/positionFunding`
**Requer**: Auth Token para contas principais

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `accountIndex` | number | 0 | Indice da conta |
| `positionFundingLimit` | number | 50 | Limite de registros |
| `positionFundingMarketIndex` | number | -1 | Market index (-1 = todos) |

**Query String Enviada**:
```
?account_index={accountIndex}&limit={positionFundingLimit}&market_id={positionFundingMarketIndex}
```

---

#### Operation: `getApiKeys`
**Endpoint**: `GET /api/v1/apikeys`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `accountIndex` | number | 0 | Indice da conta |
| `apiKeyIndexParam` | number | 3 | Indice da API key (3-254) |

**Query String Enviada**:
```
?account_index={accountIndex}&api_key_index={apiKeyIndexParam}
```

---

#### Operation: `getNextNonce`
**Endpoint**: `GET /api/v1/nextNonce`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `accountIndex` | number | 0 | Indice da conta |
| `apiKeyIndexParam` | number | 3 | Indice da API key |

**Query String Enviada**:
```
?account_index={accountIndex}&api_key_index={apiKeyIndexParam}
```

**Formato de Resposta Esperado**:
```json
{
  "nonce": 12345
}
```

---

### 2.2 Resource: MARKET

#### Operation: `getOrderBooks`
**Endpoint**: `GET /api/v1/orderBooks`

**Parametros de Entrada**: Nenhum

**Formato de Resposta Esperado**:
```json
{
  "order_books": [
    {
      "market_id": 0,
      "symbol": "ETH-USD",
      "base_asset": "ETH",
      "quote_asset": "USD",
      "supported_size_decimals": 4,
      "supported_price_decimals": 2,
      "min_size": "0.001",
      "tick_size": "0.01"
    },
    {
      "market_id": 1,
      "symbol": "BTC-USD",
      "base_asset": "BTC",
      "quote_asset": "USD",
      "supported_size_decimals": 5,
      "supported_price_decimals": 1,
      "min_size": "0.0001",
      "tick_size": "0.1"
    }
  ]
}
```

---

#### Operation: `getOrderBookDetails`
**Endpoint**: `GET /api/v1/orderBookDetails`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `marketIndex` | number | 0 | Indice do mercado |
| `depth` | number | 20 | Profundidade do orderbook |

**Query String Enviada**:
```
?market_id={marketIndex}&depth={depth}
```

**Formato de Resposta Esperado**:
```json
{
  "bids": [
    { "price": "3498.50", "size": "10.5" },
    { "price": "3498.00", "size": "25.3" }
  ],
  "asks": [
    { "price": "3499.00", "size": "8.2" },
    { "price": "3499.50", "size": "15.7" }
  ]
}
```

---

#### Operation: `getOrderBookOrders`
**Endpoint**: `GET /api/v1/orderBookOrders`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `marketIndex` | number | 0 | Indice do mercado |
| `depth` | number | 20 | Limite de ordens |

**Query String Enviada**:
```
?market_id={marketIndex}&limit={depth}
```

**Formato de Resposta Esperado**:
```json
{
  "bids": [
    { "price": "3498.50", "size": "10.5", "order_count": 3 }
  ],
  "asks": [
    { "price": "3499.00", "size": "8.2", "order_count": 2 }
  ]
}
```

---

#### Operation: `getExchangeStats`
**Endpoint**: `GET /api/v1/exchangeStats`

**Parametros de Entrada**: Nenhum

**Formato de Resposta Esperado**:
```json
{
  "total_volume_24h": "500000000",
  "total_trades_24h": 125000,
  "total_accounts": 50000,
  "markets": [
    {
      "market_id": 0,
      "volume_24h": "250000000",
      "trades_24h": 75000,
      "high_24h": "3600.00",
      "low_24h": "3400.00",
      "price_change_24h": "2.5"
    }
  ]
}
```

---

#### Operation: `getFundingRates`
**Endpoint**: `GET /api/v1/funding-rates`

**Parametros de Entrada**: Nenhum

**Formato de Resposta Esperado**:
```json
{
  "funding_rates": [
    {
      "market_id": 0,
      "funding_rate": "0.0001",
      "next_funding_time": 1704067200000
    }
  ]
}
```

---

#### Operation: `getFundings`
**Endpoint**: `GET /api/v1/fundings`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `marketIndex` | number | 0 | Indice do mercado |
| `fundingResolution` | options | "1h" | `1h` ou `1d` |
| `fundingCountBack` | number | 24 | Numero de periodos |
| `fundingStartTime` | dateTime | "" | Timestamp inicial |
| `fundingEndTime` | dateTime | "" | Timestamp final |

**Query String Enviada**:
```
?market_id={marketIndex}&resolution={fundingResolution}&count_back={fundingCountBack}&start_timestamp={ms}&end_timestamp={ms}
```

**Formato de Resposta Esperado**:
```json
{
  "fundings": [
    {
      "timestamp": 1704067200000,
      "funding_rate": "0.0001"
    }
  ]
}
```

---

### 2.3 Resource: ORDER

#### Operation: `getActiveOrders`
**Endpoint**: `GET /api/v1/accountActiveOrders`
**Requer**: Auth Token

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `orderAccountIndex` | number | 0 | Indice da conta |
| `orderMarketIndex` | number | -1 | Market index (-1 = todos) |

**Query String Enviada**:
```
?account_index={orderAccountIndex}&market_id={orderMarketIndex}
```

**Formato de Resposta Esperado**:
```json
{
  "orders": [
    {
      "order_index": 12345,
      "market_index": 0,
      "is_ask": false,
      "price": "3500.00",
      "initial_base_amount": "1.0",
      "remaining_base_amount": "0.5",
      "order_type": "limit",
      "time_in_force": "gtc",
      "reduce_only": false,
      "post_only": false,
      "created_at": 1704067200000
    }
  ]
}
```

---

#### Operation: `getInactiveOrders`
**Endpoint**: `GET /api/v1/accountInactiveOrders`
**Requer**: Auth Token

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `orderAccountIndex` | number | 0 | Indice da conta |
| `orderMarketIndex` | number | -1 | Market index (-1 = todos) |

**Query String Enviada**:
```
?account_index={orderAccountIndex}&market_id={orderMarketIndex}
```

---

#### Operation: `exportOrders`
**Endpoint**: `GET /api/v1/export`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `orderAccountIndex` | number | 0 | Indice da conta |

**Query String Enviada**:
```
?account_index={orderAccountIndex}
```

---

### 2.4 Resource: TRADE

#### Operation: `getRecentTrades`
**Endpoint**: `GET /api/v1/recentTrades`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `tradeMarketIndex` | number | 0 | Indice do mercado |
| `tradeLimit` | number | 100 | Limite de trades |

**Query String Enviada**:
```
?market_id={tradeMarketIndex}&limit={tradeLimit}
```

**Formato de Resposta Esperado**:
```json
{
  "trades": [
    {
      "timestamp": 1704067200000,
      "price": "3500.00",
      "size": "0.5",
      "side": "buy"
    }
  ]
}
```

---

#### Operation: `getTrades`
**Endpoint**: `GET /api/v1/trades`
**Requer**: Auth Token

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `tradeMarketIndex` | number | 0 | Indice do mercado |
| `tradeLimit` | number | 100 | Limite de trades |
| `tradeAccountIndex` | number | -1 | Account index (-1 = todos) |
| `tradeSortBy` | options | "timestamp" | `timestamp`, `price`, `size` |
| `tradeSortDir` | options | "desc" | `asc` ou `desc` |

**Query String Enviada**:
```
?market_id={tradeMarketIndex}&limit={tradeLimit}&account_index={tradeAccountIndex}&sort_by={tradeSortBy}&sort_dir={tradeSortDir}
```

---

### 2.5 Resource: TRANSACTION

#### Operation: `getTransaction`
**Endpoint**: `GET /api/v1/tx`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `txHash` | string | "" | Hash da transacao |

**Query String Enviada**:
```
?by=hash&value={txHash}
```

**Formato de Resposta Esperado**:
```json
{
  "tx_hash": "0x...",
  "status": "confirmed",
  "block_number": 12345678,
  "timestamp": 1704067200000,
  "type": "order_create",
  "data": {}
}
```

---

#### Operation: `getTransactions`
**Endpoint**: `GET /api/v1/txs`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `txAccountIndex` | number | 0 | Indice da conta |
| `txLimit` | number | 50 | Limite de transacoes |

**Query String Enviada**:
```
?account_index={txAccountIndex}&limit={txLimit}
```

---

#### Operation: `getDepositHistory`
**Endpoint**: `GET /api/v1/deposit/history`
**Requer**: Auth Token

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `txAccountIndex` | number | 0 | Indice da conta |
| `txLimit` | number | 50 | Limite |

**Query String Enviada**:
```
?account_index={txAccountIndex}&limit={txLimit}
```

---

#### Operation: `getWithdrawHistory`
**Endpoint**: `GET /api/v1/withdraw/history`
**Requer**: Auth Token

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `txAccountIndex` | number | 0 | Indice da conta |
| `txLimit` | number | 50 | Limite |

**Query String Enviada**:
```
?account_index={txAccountIndex}&limit={txLimit}
```

---

#### Operation: `getTransferHistory`
**Endpoint**: `GET /api/v1/transfer/history`
**Requer**: Auth Token

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `txAccountIndex` | number | 0 | Indice da conta |
| `txLimit` | number | 50 | Limite |

**Query String Enviada**:
```
?account_index={txAccountIndex}&limit={txLimit}
```

---

#### Operation: `getTransferFeeInfo`
**Endpoint**: `GET /api/v1/transferFeeInfo`

**Parametros de Entrada**: Nenhum

---

#### Operation: `getWithdrawalDelay`
**Endpoint**: `GET /api/v1/withdrawalDelay`

**Parametros de Entrada**: Nenhum

---

### 2.6 Resource: SYSTEM

#### Operation: `getStatus`
**Endpoint**: `GET /api/v1/status`

**Parametros de Entrada**: Nenhum

**Formato de Resposta Esperado**:
```json
{
  "status": "operational",
  "timestamp": 1704067200000,
  "block_height": 12345678
}
```

---

#### Operation: `getInfo`
**Endpoint**: `GET /info`

**Parametros de Entrada**: Nenhum

**Formato de Resposta Esperado**:
```json
{
  "name": "Lighter",
  "version": "1.0.0",
  "chain_id": 1,
  "contract_address": "0x..."
}
```

---

#### Operation: `getAnnouncements`
**Endpoint**: `GET /api/v1/announcement`

**Parametros de Entrada**: Nenhum

---

#### Operation: `getPublicPoolsMetadata`
**Endpoint**: `GET /api/v1/publicPoolsMetadata`

**Parametros de Entrada**: Nenhum

---

#### Operation: `getFastBridgeInfo`
**Endpoint**: `GET /api/v1/fastbridge_info`

**Parametros de Entrada**: Nenhum

---

#### Operation: `getAuthToken`
**Via**: Trading Backend
**Endpoint**: `GET {tradingBackendUrl}/api/auth-token`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `authTokenExpiry` | number | 3600 | Expiracao em segundos (max 28800 = 8h) |

**Formato de Resposta Esperado**:
```json
{
  "token": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

---

### 2.7 Resource: TRADING (via Backend)

**IMPORTANTE**: Todas as operacoes de trading requerem o Trading Backend configurado porque a Lighter usa assinaturas EIP-712 que so podem ser geradas via SDK oficial.

---

#### Operation: `createLimitOrder`
**Via**: Trading Backend
**Endpoint**: `POST {tradingBackendUrl}/api/order/limit`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `tradingMarketIndex` | number | 0 | Indice do mercado |
| `tradingSide` | options | "buy" | `buy` ou `sell` |
| `tradingSize` | number | 0.01 | Tamanho da ordem |
| `tradingPrice` | number | 0 | Preco limite |
| `tradingReduceOnly` | boolean | false | Apenas reduzir posicao |
| `tradingPostOnly` | boolean | false | Apenas maker |

**Body Enviado**:
```json
{
  "market_index": 0,
  "side": "buy",
  "size": 0.1,
  "price": 3500.00,
  "reduce_only": false,
  "post_only": false
}
```

**Formato de Resposta do Backend**:
```json
{
  "success": true,
  "tx_hash": "0x...",
  "order": {
    "market_index": 0,
    "side": "buy",
    "size": 0.1,
    "price": 3500.00,
    "type": "limit"
  }
}
```

---

#### Operation: `createMarketOrder`
**Via**: Trading Backend
**Endpoint**: `POST {tradingBackendUrl}/api/order/market`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `tradingMarketIndex` | number | 0 | Indice do mercado |
| `tradingSide` | options | "buy" | `buy` ou `sell` |
| `tradingSize` | number | 0.01 | Tamanho da ordem |
| `tradingSlippage` | number | 0.5 | Slippage maximo % (0.1-10) |
| `tradingReduceOnly` | boolean | false | Apenas reduzir posicao |

**Body Enviado**:
```json
{
  "market_index": 0,
  "side": "buy",
  "size": 0.1,
  "slippage": 0.5,
  "reduce_only": false
}
```

**Formato de Resposta do Backend**:
```json
{
  "success": true,
  "tx_hash": "0x...",
  "order": {
    "market_index": 0,
    "side": "buy",
    "size": 0.1,
    "execution_price": 3500.50,
    "type": "market"
  }
}
```

---

#### Operation: `cancelOrder`
**Via**: Trading Backend
**Endpoint**: `POST {tradingBackendUrl}/api/order/cancel`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `tradingMarketIndex` | number | 0 | Indice do mercado |
| `tradingOrderIndex` | number | 0 | Indice da ordem a cancelar |

**Body Enviado**:
```json
{
  "market_index": 0,
  "order_index": 12345
}
```

**Formato de Resposta do Backend**:
```json
{
  "success": true,
  "tx_hash": "0x...",
  "cancelled": {
    "market_index": 0,
    "order_index": 12345
  }
}
```

---

#### Operation: `cancelAllOrders`
**Via**: Trading Backend
**Endpoint**: `POST {tradingBackendUrl}/api/order/cancel-all`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `tradingMarketIndex` | number | 0 | Indice do mercado (-1 = todos) |

**Body Enviado**:
```json
{
  "market_index": 0
}
```

**Formato de Resposta do Backend**:
```json
{
  "success": true,
  "cancelled_count": 5,
  "cancelled_orders": [12345, 12346, 12347, 12348, 12349],
  "errors": null
}
```

---

#### Operation: `closePosition`
**Via**: Trading Backend
**Endpoint**: `POST {tradingBackendUrl}/api/position/close`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `tradingMarketIndex` | number | 0 | Indice do mercado |
| `tradingSlippage` | number | 0.5 | Slippage maximo % |

**Body Enviado**:
```json
{
  "market_index": 0,
  "slippage": 0.5
}
```

**Formato de Resposta do Backend**:
```json
{
  "success": true,
  "tx_hash": "0x...",
  "closed_position": {
    "market_index": 0,
    "size": 0.5,
    "side": "long"
  }
}
```

---

#### Operation: `updateLeverage`
**Via**: Trading Backend
**Endpoint**: `POST {tradingBackendUrl}/api/position/update-leverage`

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `tradingMarketIndex` | number | 0 | Indice do mercado |
| `tradingLeverage` | number | 10 | Alavancagem (1-100x) |
| `tradingMarginMode` | options | "cross" | `cross` ou `isolated` |

**Body Enviado**:
```json
{
  "market_index": 0,
  "leverage": 10,
  "margin_mode": "cross"
}
```

**Formato de Resposta do Backend**:
```json
{
  "success": true,
  "tx_hash": "0x...",
  "leverage": {
    "market_index": 0,
    "leverage": 10,
    "margin_mode": "cross"
  }
}
```

---

### 2.8 Resource: POSITION (via Backend)

#### Operation: `getPositions`
**Via**: Trading Backend
**Endpoint**: `GET {tradingBackendUrl}/api/positions`

**Parametros de Entrada**: Nenhum

**Formato de Resposta do Backend**:
```json
{
  "positions": [
    {
      "market_index": 0,
      "size": 0.5,
      "side": "long"
    }
  ],
  "count": 1
}
```

---

#### Operation: `getOrders`
**Via**: Trading Backend
**Endpoint**: `GET {tradingBackendUrl}/api/orders`

**Parametros de Entrada**: Nenhum

**Formato de Resposta do Backend**:
```json
{
  "orders": [
    {
      "order_index": 12345,
      "market_index": 0,
      "side": "buy",
      "size": 0.5,
      "price": 3500.00
    }
  ],
  "count": 1
}
```

---

## 3. LIGHTER TRIGGER (LighterTrigger.node.ts) - WebSocket

### URL WebSocket
- **Mainnet**: `wss://mainnet.zklighter.elliot.ai/stream`
- **Testnet**: `wss://testnet.zklighter.elliot.ai/stream`

### Canais Disponiveis

#### Channel: `order_book`
**Descricao**: Atualizacoes do orderbook em tempo real (50ms)
**Requer Auth**: Nao

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `marketIndex` | number | 0 | Indice do mercado |

**Mensagem de Subscricao**:
```json
{
  "type": "subscribe",
  "channel": "order_book/0"
}
```

**Formato de Dados Recebidos**:
```json
{
  "channel": "order_book/0",
  "bids": [
    { "price": "3498.50", "size": "10.5" }
  ],
  "asks": [
    { "price": "3499.00", "size": "8.2" }
  ],
  "timestamp": 1704067200000
}
```

---

#### Channel: `market_stats`
**Descricao**: Estatisticas do mercado
**Requer Auth**: Nao

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `marketIndex` | number | 0 | Indice do mercado |
| `allMarkets` | boolean | false | Subscrever em todos os mercados |

**Mensagem de Subscricao**:
```json
{
  "type": "subscribe",
  "channel": "market_stats/0"  // ou "market_stats/all"
}
```

---

#### Channel: `trade`
**Descricao**: Feed de trades em tempo real
**Requer Auth**: Nao

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `marketIndex` | number | 0 | Indice do mercado |

**Mensagem de Subscricao**:
```json
{
  "type": "subscribe",
  "channel": "trade/0"
}
```

**Formato de Dados Recebidos**:
```json
{
  "channel": "trade/0",
  "price": "3500.00",
  "size": "0.5",
  "side": "buy",
  "timestamp": 1704067200000
}
```

---

#### Channel: `spot_market_stats`
**Descricao**: Estatisticas do mercado spot
**Requer Auth**: Nao

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `marketIndex` | number | 0 | Indice do mercado |
| `allMarkets` | boolean | false | Subscrever em todos os mercados |

---

#### Channel: `account_all`
**Descricao**: Todos os dados da conta (posicoes, ordens, trades)
**Requer Auth**: SIM

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `accountIndex` | number | 0 | Indice da conta |

**Mensagem de Subscricao**:
```json
{
  "type": "subscribe",
  "channel": "account_all/123",
  "auth": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
}
```

---

#### Channel: `account_all_orders`
**Descricao**: Todas as ordens da conta
**Requer Auth**: SIM

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `accountIndex` | number | 0 | Indice da conta |

---

#### Channel: `account_all_trades`
**Descricao**: Todos os trades da conta
**Requer Auth**: SIM

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `accountIndex` | number | 0 | Indice da conta |

---

#### Channel: `account_all_positions`
**Descricao**: Todas as posicoes da conta
**Requer Auth**: SIM

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `accountIndex` | number | 0 | Indice da conta |

---

#### Channel: `account_all_assets`
**Descricao**: Todos os ativos da conta (spot)
**Requer Auth**: SIM

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `accountIndex` | number | 0 | Indice da conta |

---

#### Channel: `user_stats`
**Descricao**: Estatisticas da conta
**Requer Auth**: SIM

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `accountIndex` | number | 0 | Indice da conta |

---

#### Channel: `account_tx`
**Descricao**: Transacoes da conta
**Requer Auth**: SIM

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `accountIndex` | number | 0 | Indice da conta |

---

#### Channel: `notification`
**Descricao**: Notificacoes (liquidacao, deleveraging)
**Requer Auth**: SIM

**Parametros de Entrada**:
| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `accountIndex` | number | 0 | Indice da conta |

---

#### Channel: `height`
**Descricao**: Atualizacoes de altura do blockchain
**Requer Auth**: Nao

**Parametros de Entrada**: Nenhum

**Mensagem de Subscricao**:
```json
{
  "type": "subscribe",
  "channel": "height"
}
```

**Formato de Dados Recebidos**:
```json
{
  "channel": "height",
  "block_height": 12345678,
  "timestamp": 1704067200000
}
```

---

### Opcoes do Trigger

| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `options.reconnect` | boolean | true | Reconectar automaticamente |
| `options.reconnectInterval` | number | 5000 | Intervalo de reconexao (ms) |

---

## 4. TRADING BACKEND (app.py)

### Endpoints Disponiveis

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| GET | `/health` | Health check | Nao |
| GET | `/api/info` | Info do backend | Nao |
| POST | `/api/order/limit` | Criar ordem limite | Sim* |
| POST | `/api/order/market` | Criar ordem mercado | Sim* |
| POST | `/api/order/cancel` | Cancelar ordem | Sim* |
| POST | `/api/order/cancel-all` | Cancelar todas ordens | Sim* |
| POST | `/api/position/close` | Fechar posicao | Sim* |
| POST | `/api/position/update-leverage` | Atualizar alavancagem | Sim* |
| GET | `/api/account` | Info da conta | Sim* |
| GET | `/api/positions` | Listar posicoes | Sim* |
| GET | `/api/orders` | Listar ordens ativas | Sim* |
| GET | `/api/auth-token` | Gerar auth token | Sim* |

*Auth = Requer header `X-API-Secret` se `API_SECRET` estiver configurado

### Variaveis de Ambiente

| Variavel | Default | Descricao |
|----------|---------|-----------|
| `LIGHTER_API_KEY` | "" | Chave privada da API |
| `LIGHTER_ACCOUNT_INDEX` | "0" | Indice da conta |
| `LIGHTER_API_KEY_INDEX` | "3" | Indice da API key |
| `LIGHTER_ENVIRONMENT` | "mainnet" | mainnet ou testnet |
| `FLASK_PORT` | "3001" | Porta do servidor |
| `API_SECRET` | "" | Secret para autenticacao |

---

## 5. INDICE DE MERCADOS

| Index | Symbol | Size Decimals | Price Decimals |
|-------|--------|---------------|----------------|
| 0 | ETH-USD | 4 | 2 |
| 1 | BTC-USD | 5 | 1 |
| 2 | SOL-USD | 2 | 3 |

Use `getOrderBooks` para obter a lista completa e atualizada.

---

## 6. FORMATO DE SAIDA DO n8n

Todos os nos retornam dados no formato `INodeExecutionData[][]`:

```typescript
[
  [
    {
      json: { /* dados da resposta da API */ },
      pairedItem: { item: 0 }
    }
  ]
]
```

Em caso de erro com `continueOnFail()`:
```typescript
[
  [
    {
      json: { error: "Mensagem de erro" },
      pairedItem: { item: 0 }
    }
  ]
]
```

---

## 7. LIMITES DE RATE

| Tipo de Conta | Limite |
|---------------|--------|
| Standard | 60 weighted requests/min |
| Premium | 24,000 weighted requests/min |
| WebSocket | 100 conexoes, 1000 subscricoes |

---

## 8. DIAGRAMA DE ARQUITETURA

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│     n8n         │────▶│  Trading        │────▶│   Lighter       │
│   Workflow      │     │  Backend        │     │   Exchange      │
│                 │     │  (Python)       │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       │                                               ▲
       │                                               │
       └───────────────────────────────────────────────┘
                    (Operacoes somente leitura)
```

**Operacoes de Leitura**: Direto para API da Lighter
**Operacoes de Escrita (Trading)**: Via Backend Python (requer assinatura EIP-712)
