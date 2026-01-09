# Lighter API - Schemas de Resposta REAIS

Documentacao baseada em chamadas REAIS a API em 08/01/2026.

---

## 1. GET /api/v1/orderBooks

**Descricao**: Lista todos os mercados disponiveis com metadados.

```json
{
  "code": 200,
  "order_books": [
    {
      "symbol": "ETH",
      "market_id": 0,
      "market_type": "perp",
      "base_asset_id": 0,
      "quote_asset_id": 0,
      "status": "active",
      "taker_fee": "0.0000",
      "maker_fee": "0.0000",
      "liquidation_fee": "1.0000",
      "min_base_amount": "0.0050",
      "min_quote_amount": "10.000000",
      "order_quote_limit": "281474976.710655",
      "supported_size_decimals": 4,
      "supported_price_decimals": 2,
      "supported_quote_decimals": 6
    },
    {
      "symbol": "BTC",
      "market_id": 1,
      "market_type": "perp",
      "base_asset_id": 0,
      "quote_asset_id": 0,
      "status": "active",
      "taker_fee": "0.0000",
      "maker_fee": "0.0000",
      "liquidation_fee": "1.0000",
      "min_base_amount": "0.00020",
      "min_quote_amount": "10.000000",
      "order_quote_limit": "281474976.710655",
      "supported_size_decimals": 5,
      "supported_price_decimals": 1,
      "supported_quote_decimals": 6
    },
    {
      "symbol": "SOL",
      "market_id": 2,
      "market_type": "perp",
      "base_asset_id": 0,
      "quote_asset_id": 0,
      "status": "active",
      "taker_fee": "0.0000",
      "maker_fee": "0.0000",
      "liquidation_fee": "1.0000",
      "min_base_amount": "0.10",
      "min_quote_amount": "10.000000",
      "order_quote_limit": "281474976.710655",
      "supported_size_decimals": 2,
      "supported_price_decimals": 4,
      "supported_quote_decimals": 6
    }
  ]
}
```

### Campos do order_books:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `symbol` | string | Simbolo do mercado (ETH, BTC, SOL, etc) |
| `market_id` | number | ID unico do mercado (usar como market_index) |
| `market_type` | string | "perp" (perpetuo) ou "spot" |
| `base_asset_id` | number | ID do ativo base |
| `quote_asset_id` | number | ID do ativo quote |
| `status` | string | "active" ou "inactive" |
| `taker_fee` | string | Taxa do taker em % |
| `maker_fee` | string | Taxa do maker em % |
| `liquidation_fee` | string | Taxa de liquidacao em % |
| `min_base_amount` | string | Tamanho minimo de ordem |
| `min_quote_amount` | string | Valor minimo em quote |
| `order_quote_limit` | string | Limite maximo de ordem |
| `supported_size_decimals` | number | Decimais para tamanho |
| `supported_price_decimals` | number | Decimais para preco |
| `supported_quote_decimals` | number | Decimais para quote |

---

## 2. GET /api/v1/account

**Query**: `?by=index&value={accountIndex}`

```json
{
  "code": 200,
  "total": 1,
  "accounts": [
    {
      "code": 0,
      "account_type": 0,
      "index": 0,
      "l1_address": "0x0000000000000000000000000000000000000000",
      "cancel_all_time": 0,
      "total_order_count": 0,
      "total_isolated_order_count": 0,
      "pending_order_count": 0,
      "available_balance": "1477416.191034",
      "status": 1,
      "collateral": "1477416.191034",
      "transaction_time": 1767879500026420,
      "account_index": 0,
      "name": "",
      "description": "",
      "can_invite": true,
      "referral_points_percentage": "",
      "positions": [
        {
          "market_index": 0,
          "position": "0.5",
          "sign": 1,
          "avg_entry_price": "3500.00",
          "position_value": "1750.00",
          "unrealized_pnl": "50.00",
          "realized_pnl": "100.00",
          "ooc": 2
        }
      ],
      "assets": [
        {
          "symbol": "ETH",
          "asset_id": 1,
          "balance": "16.980182648",
          "locked_balance": "0.00000000"
        },
        {
          "symbol": "LIT",
          "asset_id": 2,
          "balance": "283644.99688720",
          "locked_balance": "0.00000000"
        },
        {
          "symbol": "USDC",
          "asset_id": 3,
          "balance": "123579.32777814564",
          "locked_balance": "0.000000"
        }
      ],
      "total_asset_value": "1477416.191034",
      "cross_asset_value": "1477416.191034",
      "shares": []
    }
  ]
}
```

### Campos do account:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `index` | number | Indice da conta |
| `account_index` | number | Indice da conta (duplicado) |
| `l1_address` | string | Endereco Ethereum L1 |
| `status` | number | 1 = ativo, 0 = inativo |
| `collateral` | string | Colateral total |
| `available_balance` | string | Saldo disponivel |
| `total_asset_value` | string | Valor total dos ativos |
| `cross_asset_value` | string | Valor em cross margin |
| `total_order_count` | number | Total de ordens |
| `pending_order_count` | number | Ordens pendentes |
| `positions` | array | Lista de posicoes abertas |
| `assets` | array | Lista de ativos (spot) |

### Campos do positions[]:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `market_index` | number | Indice do mercado |
| `position` | string | Tamanho da posicao |
| `sign` | number | 1 = Long, -1 = Short |
| `avg_entry_price` | string | Preco medio de entrada |
| `position_value` | string | Valor da posicao |
| `unrealized_pnl` | string | PnL nao realizado |
| `realized_pnl` | string | PnL realizado |
| `ooc` | number | Open Order Count nesse mercado |

### Campos do assets[]:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `symbol` | string | Simbolo do ativo |
| `asset_id` | number | ID do ativo |
| `balance` | string | Saldo disponivel |
| `locked_balance` | string | Saldo bloqueado |

---

## 3. GET /api/v1/orderBookDetails

**Query**: `?market_id={marketIndex}&depth={depth}`

```json
{
  "code": 200,
  "order_book_details": [
    {
      "symbol": "ETH",
      "market_id": 0,
      "market_type": "perp",
      "base_asset_id": 0,
      "quote_asset_id": 0,
      "status": "active",
      "taker_fee": "0.0000",
      "maker_fee": "0.0000",
      "liquidation_fee": "1.0000",
      "min_base_amount": "0.0050",
      "min_quote_amount": "10.000000",
      "order_quote_limit": "281474976.710655",
      "supported_size_decimals": 4,
      "supported_price_decimals": 2,
      "supported_quote_decimals": 6,
      "size_decimals": 4,
      "price_decimals": 2,
      "quote_multiplier": 1,
      "default_initial_margin_fraction": 500,
      "min_initial_margin_fraction": 200,
      "maintenance_margin_fraction": 120,
      "closeout_margin_fraction": 80,
      "last_trade_price": 3090.49,
      "daily_trades_count": 663024,
      "daily_base_token_volume": 509557.36089999997,
      "daily_quote_token_volume": 1602889166.158399,
      "daily_price_low": 3081.41,
      "daily_price_high": 3211.4,
      "daily_price_change": -3.15559914396814,
      "open_interest": 67894.5544,
      "daily_chart": {},
      "market_config": {
        "market_margin_mode": 0,
        "insurance_fund_account_index": 281474976710655,
        "liquidation_mode": 0,
        "force_reduce_only": false,
        "trading_hours": ""
      }
    }
  ],
  "spot_order_book_details": []
}
```

### Campos adicionais do orderBookDetails:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `last_trade_price` | number | Ultimo preco negociado |
| `daily_trades_count` | number | Numero de trades em 24h |
| `daily_base_token_volume` | number | Volume em base token 24h |
| `daily_quote_token_volume` | number | Volume em USD 24h |
| `daily_price_low` | number | Minima 24h |
| `daily_price_high` | number | Maxima 24h |
| `daily_price_change` | number | Variacao % 24h |
| `open_interest` | number | Open interest |
| `default_initial_margin_fraction` | number | Margem inicial padrao (5% = 500) |
| `min_initial_margin_fraction` | number | Margem inicial minima |
| `maintenance_margin_fraction` | number | Margem de manutencao |
| `closeout_margin_fraction` | number | Margem de liquidacao |

---

## 4. GET /api/v1/recentTrades

**Query**: `?market_id={marketIndex}&limit={limit}`

```json
{
  "code": 200,
  "trades": [
    {
      "trade_id": 787393523,
      "tx_hash": "72c238920c4acccfdf8577f5f941cf32b4e34367484502d195ba6bf7e6d082f36cc5529d6da0709d",
      "type": "trade",
      "market_id": 0,
      "size": "0.0800",
      "price": "3090.49",
      "usd_amount": "247.239200",
      "ask_id": 281475996690545,
      "bid_id": 562948960643394,
      "ask_client_id": 176787950126797,
      "bid_client_id": 167751480785278,
      "ask_account_id": 662891,
      "bid_account_id": 281474976642700,
      "is_maker_ask": false,
      "block_height": 144854242,
      "timestamp": 1767879501437,
      "taker_position_size_before": "-28.2020",
      "taker_entry_quote_before": "87416.078191",
      "taker_initial_margin_fraction_before": 500,
      "maker_fee": 20,
      "maker_position_size_before": "251.1009",
      "maker_entry_quote_before": "777893.144749",
      "maker_initial_margin_fraction_before": 200,
      "transaction_time": 1767879501582161
    }
  ]
}
```

### Campos do trades[]:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `trade_id` | number | ID unico do trade |
| `tx_hash` | string | Hash da transacao |
| `type` | string | Tipo ("trade") |
| `market_id` | number | ID do mercado |
| `size` | string | Tamanho do trade |
| `price` | string | Preco de execucao |
| `usd_amount` | string | Valor em USD |
| `ask_id` | number | ID da ordem de venda |
| `bid_id` | number | ID da ordem de compra |
| `ask_account_id` | number | Conta do vendedor |
| `bid_account_id` | number | Conta do comprador |
| `is_maker_ask` | boolean | Se o maker foi o ask |
| `block_height` | number | Altura do bloco |
| `timestamp` | number | Timestamp em ms |
| `maker_fee` | number | Taxa do maker |
| `transaction_time` | number | Tempo da transacao (microsegundos) |

---

## 5. GET /api/v1/funding-rates

```json
{
  "code": 200,
  "funding_rates": [
    {
      "market_id": 0,
      "exchange": "binance",
      "symbol": "ETH",
      "rate": 0.00002636
    },
    {
      "market_id": 0,
      "exchange": "bybit",
      "symbol": "ETH",
      "rate": -0.00004756
    },
    {
      "market_id": 0,
      "exchange": "hyperliquid",
      "symbol": "ETH",
      "rate": 0.0001
    },
    {
      "market_id": 0,
      "exchange": "lighter",
      "symbol": "ETH",
      "rate": -0.000056
    }
  ]
}
```

### Campos do funding_rates[]:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `market_id` | number | ID do mercado |
| `exchange` | string | Exchange de referencia (binance, bybit, hyperliquid, lighter) |
| `symbol` | string | Simbolo do ativo |
| `rate` | number | Taxa de funding (ex: 0.0001 = 0.01%) |

---

## 6. GET /api/v1/exchangeStats

```json
{
  "code": 200,
  "total": 126,
  "order_book_stats": [
    {
      "symbol": "ETH",
      "last_trade_price": 3090.62,
      "daily_trades_count": 663033,
      "daily_base_token_volume": 509576.8671,
      "daily_quote_token_volume": 1602949454.794455,
      "daily_price_change": -3.1474524278780627
    },
    {
      "symbol": "BTC",
      "last_trade_price": 89900,
      "daily_trades_count": 1153600,
      "daily_base_token_volume": 23596.1888,
      "daily_quote_token_volume": 2145480656.245893,
      "daily_price_change": -2.2571105505784117
    }
  ],
  "daily_usd_volume": 4660566605.859096,
  "daily_trades_count": 3559494
}
```

### Campos do exchangeStats:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `total` | number | Total de mercados |
| `daily_usd_volume` | number | Volume total em USD 24h |
| `daily_trades_count` | number | Total de trades 24h |

### Campos do order_book_stats[]:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `symbol` | string | Simbolo do mercado |
| `last_trade_price` | number | Ultimo preco |
| `daily_trades_count` | number | Trades em 24h |
| `daily_base_token_volume` | number | Volume em base 24h |
| `daily_quote_token_volume` | number | Volume em USD 24h |
| `daily_price_change` | number | Variacao % 24h |

---

## 7. TRADING BACKEND - Respostas

### POST /api/order/limit

**Request**:
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

**Response (sucesso)**:
```json
{
  "success": true,
  "tx_hash": "abc123...",
  "order": {
    "market_index": 0,
    "side": "buy",
    "size": 0.1,
    "price": 3500.00,
    "type": "limit"
  }
}
```

**Response (erro)**:
```json
{
  "success": false,
  "error": "Mensagem de erro"
}
```

---

### POST /api/order/market

**Request**:
```json
{
  "market_index": 0,
  "side": "buy",
  "size": 0.1,
  "slippage": 0.5,
  "reduce_only": false
}
```

**Response (sucesso)**:
```json
{
  "success": true,
  "tx_hash": "abc123...",
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

### POST /api/order/cancel

**Request**:
```json
{
  "market_index": 0,
  "order_index": 12345
}
```

**Response (sucesso)**:
```json
{
  "success": true,
  "tx_hash": "abc123...",
  "cancelled": {
    "market_index": 0,
    "order_index": 12345
  }
}
```

---

### POST /api/order/cancel-all

**Request**:
```json
{
  "market_index": 0
}
```

**Response (sucesso)**:
```json
{
  "success": true,
  "cancelled_count": 5,
  "cancelled_orders": [12345, 12346, 12347, 12348, 12349],
  "errors": null
}
```

---

### POST /api/position/close

**Request**:
```json
{
  "market_index": 0,
  "slippage": 0.5
}
```

**Response (sucesso)**:
```json
{
  "success": true,
  "tx_hash": "abc123...",
  "closed_position": {
    "market_index": 0,
    "size": 0.5,
    "side": "long"
  }
}
```

**Response (sem posicao)**:
```json
{
  "success": true,
  "message": "No position to close",
  "market_index": 0
}
```

---

### POST /api/position/update-leverage

**Request**:
```json
{
  "market_index": 0,
  "leverage": 10,
  "margin_mode": "cross"
}
```

**Response (sucesso)**:
```json
{
  "success": true,
  "tx_hash": "abc123...",
  "leverage": {
    "market_index": 0,
    "leverage": 10,
    "margin_mode": "cross"
  }
}
```

---

### GET /api/positions

**Response**:
```json
{
  "positions": [
    {
      "market_index": 0,
      "size": 0.5,
      "side": "long"
    },
    {
      "market_index": 1,
      "size": 0.01,
      "side": "short"
    }
  ],
  "count": 2
}
```

---

### GET /api/orders

**Query**: `?market_index={marketIndex}` (opcional)

**Response**:
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

### GET /api/auth-token

**Query**: `?expiry={seconds}` (default: 3600)

**Response**:
```json
{
  "token": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

---

### GET /health

**Response**:
```json
{
  "status": "ok",
  "environment": "mainnet",
  "account_index": 123,
  "base_url": "https://mainnet.zklighter.elliot.ai",
  "timestamp": 1767879501437
}
```

---

### GET /api/info

**Response**:
```json
{
  "environment": "mainnet",
  "account_index": 123,
  "api_key_index": 3,
  "base_url": "https://mainnet.zklighter.elliot.ai",
  "auth_required": true
}
```

---

## 8. TABELA DE MERCADOS (Principais)

| market_id | symbol | size_decimals | price_decimals | min_base_amount |
|-----------|--------|---------------|----------------|-----------------|
| 0 | ETH | 4 | 2 | 0.0050 |
| 1 | BTC | 5 | 1 | 0.00020 |
| 2 | SOL | 2 | 4 | 0.10 |
| 3 | DOGE | 0 | 6 | 10 |
| 4 | 1000PEPE | 0 | 6 | 500 |
| 5 | WIF | 1 | 5 | 5.0 |
| 6 | WLD | 1 | 5 | 5.0 |
| 7 | XRP | 0 | 6 | 20 |
| 8 | LINK | 1 | 5 | 1.0 |
| 9 | AVAX | 2 | 4 | 0.50 |
| 10 | NEAR | 1 | 5 | 2.0 |
| 11 | DOT | 1 | 5 | 2.0 |
| 12 | TON | 1 | 5 | 2.0 |
| 15 | TRUMP | 2 | 4 | 0.20 |
| 16 | SUI | 1 | 5 | 2.0 |
| 24 | HYPE | 2 | 4 | 0.20 |
| 25 | BNB | 3 | 3 | 0.010 |

---

## 9. CODIGOS DE RESPOSTA

| code | Significado |
|------|-------------|
| 200 | Sucesso |
| 400 | Erro de requisicao |
| 401 | Nao autorizado |
| 404 | Nao encontrado |
| 500 | Erro interno |

---

## 10. NOTAS IMPORTANTES

1. **Timestamps**: A API retorna timestamps em milissegundos (13 digitos)
2. **Valores numericos**: Muitos campos sao retornados como strings para precisao
3. **Sign da posicao**: 1 = Long, -1 = Short
4. **Status da conta**: 1 = ativo, 0 = inativo
5. **Funding rate**: Valor decimal (0.0001 = 0.01%)
6. **Margin fractions**: Valores em basis points (500 = 5%)
